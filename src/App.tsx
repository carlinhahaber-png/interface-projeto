import { useEffect, useState } from "react";
import UploadZone from "./components/UploadZone";
import BatchMode, { savedBatchId } from "./components/BatchMode";
import ResultPanel from "./components/ResultPanel";
import ThemeToggle from "./components/ThemeToggle";
import ReadingOptions from "./components/ReadingOptions";
import Credits from "./components/Credits";
import LanguageFields from "./components/LanguageFields";
import { SOURCE_LANGUAGES, languageName } from "./languages";
import { cancelOcrJob, getOcrJob, processDocument } from "./api";
import DocumentEra, { FidelityNote, type Era } from "./components/DocumentEra";
import { detectLanguage } from "./detectLanguage";
import type { ProcessResult } from "./types";

type Status = "idle" | "loading" | "waiting" | "done" | "error";
// Pedido do modo Antigo que foi para o motor lento: guardado no navegador para voltar depois de fechar a aba.
type SavedJob = { id: string; fileName: string; status: string };
const JOB_KEY = "ocrJob";
const JOB_POLL_MS = 3000;

function savedJob(): SavedJob | null {
  try {
    const job = JSON.parse(localStorage.getItem(JOB_KEY) || "null");
    return job && typeof job.id === "string" ? job : null;
  } catch {
    return null;
  }
}

function rememberJob(job: SavedJob | null) {
  try {
    if (job) localStorage.setItem(JOB_KEY, JSON.stringify(job));
    else localStorage.removeItem(JOB_KEY);
  } catch {
    // armazenamento bloqueado: o pedido vale só nesta aba
  }
}
type Mode = "single" | "batch";
type Detection = "none" | "detecting" | "done";

// Menos de 15 letras: foto sem texto legível (ou idioma errado). Mostra dicas; a API não muda.
const MIN_LETTERS = 15;
const littleText = (text: string) => (text.match(/\p{L}/gu)?.length ?? 0) < MIN_LETTERS;

export default function App() {
  // Lote guardado no navegador (aba fechada no meio): abre direto em "Vários arquivos".
  const [mode, setMode] = useState<Mode>(() => (savedBatchId() ? "batch" : "single"));
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("pt");
  const [source, setSource] = useState("pt");
  const [detected, setDetected] = useState("");
  const [detection, setDetection] = useState<Detection>("none");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [era, setEra] = useState<Era>("modern");
  const [resultEra, setResultEra] = useState<Era>("modern");
  const [job, setJob] = useState<SavedJob | null>(savedJob);
  const [resultName, setResultName] = useState("");

  // Modo Antigo com motor lento: consulta o pedido até ficar pronto (também depois de fechar e abrir a aba).
  useEffect(() => {
    if (!job) return;
    setStatus("waiting");
    const ctrl = new AbortController();
    let timer: number | undefined;
    async function tick() {
      try {
        const j = await getOcrJob(job!.id, ctrl.signal);
        if (j.status === "pronto") {
          setResult({ original_text: j.original_text ?? "", translated_text: "", detected_language: j.detected_language ?? "" });
          setResultEra("ancient");
          setResultName(job!.fileName);
          setStatus("done");
          finishJob();
        } else if (j.status === "erro" || j.status === "cancelado") {
          setError(j.status === "erro" ? j.error || "Não foi possível ler o documento." : "Pedido cancelado.");
          setStatus("error");
          finishJob();
        } else {
          setJob((old) => (old && old.status !== j.status ? { ...old, status: j.status } : old));
          timer = window.setTimeout(tick, JOB_POLL_MS);
        }
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const text = e instanceof Error ? e.message : "";
        if (text.startsWith("Pedido não encontrado")) {
          setError("Este pedido expirou. Envie o arquivo de novo.");
          setStatus("error");
          finishJob();
          return;
        }
        timer = window.setTimeout(tick, JOB_POLL_MS * 2);  // servidor sem resposta: tenta de novo
      }
    }
    tick();
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function finishJob() {
    rememberJob(null);
    setJob(null);
  }

  async function cancelJob() {
    if (!job) return;
    try {
      await cancelOcrJob(job.id);
    } catch {
      // já terminou ou expirou: some do mesmo jeito
    }
    finishJob();
    setStatus("idle");
  }

  const loading = status === "loading" || status === "waiting";
  // Sugestão da API, só para idiomas que o OCR sabe ler.
  const suggested = SOURCE_LANGUAGES.some((l) => l.code === result?.suggested_language)
    ? result!.suggested_language!
    : "";
  // Idioma que o OCR usou (devolvido pela API), não o que está selecionado agora.
  const originalLang = result?.detected_language || "";

  function reset() {
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  async function handleFile(f: File) {
    setFile(f);
    setDetected("");
    setDetection("detecting");
    reset();
    const code = await detectLanguage(f);
    setDetected(code);
    setDetection("done");
    // PDF com texto: já escolhe o idioma detectado, se o OCR souber lê-lo.
    if (SOURCE_LANGUAGES.some((l) => l.code === code)) setSource(code);
  }

  function handleRemove() {
    setFile(null);
    setDetected("");
    setDetection("none");
    reset();
  }

  async function handleProcess(lang = source) {
    if (!file) return;
    // Limpa o resultado anterior: o painel remonta e não reaproveita texto velho (nem na exportação).
    setResult(null);
    setStatus("loading");
    setError(null);
    try {
      const data = await processDocument(file, target, lang, era);
      if ("job_id" in data) {
        const saved = { id: data.job_id, fileName: file.name, status: data.status };
        rememberJob(saved);
        setJob(saved);
        return;
      }
      setResult(data);
      setResultEra(era);
      setResultName(file.name);
      setStatus("done");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível processar o arquivo. Tente de novo."
      );
      setStatus("error");
    }
  }

  let sourceText = "Envie um arquivo para detectar";
  if (detection === "detecting") sourceText = "Detectando idioma...";
  else if (detected) sourceText = `Detectado: ${languageName(detected)}`;
  else if (detection === "done") sourceText = "Escolha o idioma do texto";

  return (
    <div className="page">
      <header className="header">
        <h1 className="header__name">Transcritor</h1>
        <ThemeToggle />
      </header>

      <ReadingOptions />

      <div className="mode-switch" role="group" aria-label="Como enviar">
        <button type="button" className="mode-switch__option" aria-pressed={mode === "single"} onClick={() => setMode("single")}>
          Um arquivo
        </button>
        <button type="button" className="mode-switch__option" aria-pressed={mode === "batch"} onClick={() => setMode("batch")}>
          Vários arquivos
        </button>
      </div>

      {mode === "batch" ? (
        <main>
          <BatchMode
            source={source}
            target={target}
            era={era}
            onSource={setSource}
            onTarget={setTarget}
            onEra={setEra}
          />
        </main>
      ) : (
        <main>
          <section className="step">
            <h2 className="step__title">Envie seu arquivo</h2>
            <UploadZone
              file={file}
              disabled={loading}
              onFile={handleFile}
              onRemove={handleRemove}
            />
          </section>

          <section className="step">
            <h2 className="step__title">Idiomas e processamento</h2>

            <LanguageFields
              source={source}
              target={target}
              disabled={loading}
              sourceHint={sourceText}
              onSource={(code) => {
                setSource(code);
                reset();
              }}
              onTarget={(code) => {
                setTarget(code);
                reset();
              }}
            />
            <DocumentEra
              value={era}
              disabled={loading}
              onChange={(value) => {
                setEra(value);
                reset();
              }}
            />

            <button
              type="button"
              className="button"
              disabled={!file || loading}
              onClick={() => handleProcess()}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Processando...
                </>
              ) : (
                "Transcrever e traduzir"
              )}
            </button>

            {status === "loading" && (
              <p className="message" role="status">
                {era === "ancient"
                  ? "Enviando o arquivo e lendo como documento antigo. Pode levar mais tempo."
                  : "Enviando o arquivo e extraindo o texto. Isso pode levar alguns segundos."}
              </p>
            )}
            {status === "waiting" && job && (
              <div className="progress" role="status" aria-live="polite">
                <progress className="progress__bar" aria-label="Leitura do documento antigo" />
                <p className="progress__text">
                  {job.status === "rodando" ? "Lendo o documento antigo" : "Na fila do modo Antigo"} ({job.fileName}).
                  Pode levar alguns minutos; você pode fechar a aba e voltar depois.
                </p>
                <button type="button" className="button button--secondary" onClick={cancelJob}>
                  Cancelar
                </button>
              </div>
            )}
            {error && (
              <p className="message message--error" role="alert">
                {error}
              </p>
            )}
          </section>

          {result && (file || resultName) && (
            <section className="step step--result">
              <h2 className="step__title">Resultado</h2>
              {suggested && (
                <p className="suggestion" role="status">
                  Parece ser {languageName(suggested).toLowerCase()} (
                  {Math.round((result.suggestion_confidence ?? 0) * 100)}%).
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setSource(suggested);
                      handleProcess(suggested);
                    }}
                  >
                    Refazer o OCR em {languageName(suggested).toLowerCase()}?
                  </button>
                </p>
              )}
              {littleText(result.original_text) && (
                <aside className="tips" role="status" aria-labelledby="tips-title">
                  <p id="tips-title" className="tips__title">
                    Pouco ou nenhum texto encontrado. Algumas dicas:
                  </p>
                  <ul className="tips__list">
                    <li>Fotografe a página de frente, sem inclinar.</li>
                    <li>Use boa luz e evite sombra sobre o papel.</li>
                    <li>Enquadre a página inteira, sem cortar as bordas.</li>
                    <li>Confira o idioma de origem e tente outro, se for o caso.</li>
                  </ul>
                </aside>
              )}
              {resultEra === "ancient" && <FidelityNote />}
              <ResultPanel
                result={result}
                originalLang={originalLang}
                targetLang={target}
                fileName={resultName || file?.name || "documento"}
              />
            </section>
          )}
        </main>
      )}

      <Credits />
    </div>
  );
}
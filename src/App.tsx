import { useState } from "react";
import UploadZone from "./components/UploadZone";
import ResultPanel from "./components/ResultPanel";
import ThemeToggle from "./components/ThemeToggle";
import Credits from "./components/Credits";
import { LANGUAGES, SOURCE_LANGUAGES, languageName } from "./languages";
import { processDocument } from "./api";
import { detectLanguage } from "./detectLanguage";
import type { ProcessResult } from "./types";

type Status = "idle" | "loading" | "done" | "error";
type Detection = "none" | "detecting" | "done";

// Menos de 15 letras: foto sem texto legível (ou idioma errado). Mostra dicas; a API não muda.
const MIN_LETTERS = 15;
const littleText = (text: string) => (text.match(/\p{L}/gu)?.length ?? 0) < MIN_LETTERS;

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("pt");
  const [source, setSource] = useState("pt");
  const [detected, setDetected] = useState("");
  const [detection, setDetection] = useState<Detection>("none");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = status === "loading";
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
      const data = await processDocument(file, target, lang);
      setResult(data);
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

          <div className="lang-row">
            <label className="field">
              <span className="field__label">Idioma original</span>
              <select
                className="select"
                value={source}
                disabled={loading}
                onChange={(e) => {
                  setSource(e.target.value);
                  reset();
                }}
              >
                {SOURCE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              <span className="field__hint" role="status">
                {sourceText}
              </span>
            </label>
            <label className="field">
              <span className="field__label">Traduzir para</span>
              <select
                className="select"
                value={target}
                disabled={loading}
                onChange={(e) => {
                  setTarget(e.target.value);
                  reset();
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

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

          {loading && (
            <p className="message" role="status">
              Enviando o arquivo e extraindo o texto. Isso pode levar alguns segundos.
            </p>
          )}
          {error && (
            <p className="message message--error" role="alert">
              {error}
            </p>
          )}
        </section>

        {result && file && (
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
            <ResultPanel
              result={result}
              originalLang={originalLang}
              targetLang={target}
              fileName={file.name}
            />
          </section>
        )}
      </main>

      <Credits />
    </div>
  );
}
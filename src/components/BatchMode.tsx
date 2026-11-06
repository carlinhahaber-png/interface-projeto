import { useEffect, useState } from "react";
import type { Batch, PageEdits } from "../types";
import { cancelBatch, createBatch, getBatch, retryPage } from "../api";
import BatchPicker from "./BatchPicker";
import BatchResult from "./BatchResult";
import LanguageFields from "./LanguageFields";

const STORAGE_KEY = "batchId";
const POLL_MS = 2000;

/** Id do lote guardado no navegador: fechar a aba e voltar recupera o lote. */
export function savedBatchId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // armazenamento bloqueado: o lote vale só nesta aba
  }
}

function remember(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // armazenamento bloqueado
  }
}

const active = (b: Batch | null) => b !== null && (b.status === "fila" || b.status === "rodando");

/** Tempo estimado: média das páginas já lidas × páginas que faltam. */
function estimate(b: Batch): string {
  const left = b.pages.filter((p) => p.status === "fila" || p.status === "rodando").length;
  const timed = b.pages.filter((p) => p.seconds != null);
  if (!left) return "";
  if (!timed.length) return "Calculando o tempo...";
  const seconds = (timed.reduce((sum, p) => sum + (p.seconds ?? 0), 0) / timed.length) * left;
  return seconds < 60 ? "Falta menos de 1 minuto." : `Faltam cerca de ${Math.round(seconds / 60)} min.`;
}

interface Props {
  source: string;
  target: string;
  onSource: (code: string) => void;
  onTarget: (code: string) => void;
}

export default function BatchMode({ source, target, onSource, onTarget }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [batchId, setBatchId] = useState<string | null>(savedBatchId);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [edits, setEdits] = useState<PageEdits>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poll, setPoll] = useState(0); // muda para recomeçar a consulta (depois de "tentar de novo")

  // Consulta o progresso a cada 2 s enquanto o lote está na fila ou rodando.
  useEffect(() => {
    if (!batchId) return;
    const ctrl = new AbortController();
    let timer: number | undefined;
    async function tick() {
      try {
        const b = await getBatch(batchId!, ctrl.signal);
        setBatch(b);
        setError(null);
        if (active(b)) timer = window.setTimeout(tick, POLL_MS);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const text = e instanceof Error ? e.message : "";
        if (text.startsWith("Lote não encontrado")) {
          forget();
          setError("Este lote expirou ou foi apagado. Envie os arquivos de novo.");
          return;
        }
        setError("Sem resposta do servidor. Tentando de novo...");
        timer = window.setTimeout(tick, POLL_MS * 2);
      }
    }
    tick();
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [batchId, poll]);

  function forget() {
    remember(null);
    setBatchId(null);
    setBatch(null);
    setEdits({});
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const b = await createBatch(files, source, target);
      remember(b.id);
      setEdits({});
      setBatch(b);
      setBatchId(b.id);
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar os arquivos.");
    }
    setBusy(false);
  }

  async function cancel() {
    if (!batch) return;
    setBusy(true);
    try {
      const b = await cancelBatch(batch.id);
      if (b) setBatch(b);
      setPoll((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar.");
    }
    setBusy(false);
  }

  async function retry(n: number) {
    if (!batch) return;
    setBusy(true);
    try {
      setBatch(await retryPage(batch.id, n));
      setEdits(({ [n]: _, ...rest }) => rest); // a página volta com texto novo
      setPoll((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível tentar de novo.");
    }
    setBusy(false);
  }

  const running = active(batch);
  const current = batch?.pages.find((p) => p.status === "rodando");

  return (
    <>
      {!batchId && (
        <>
          <section className="step">
            <h2 className="step__title">Envie vários arquivos</h2>
            <BatchPicker files={files} disabled={busy} onChange={setFiles} />
          </section>
          <section className="step">
            <h2 className="step__title">Idiomas e processamento</h2>
            <LanguageFields
              source={source}
              target={target}
              disabled={busy}
              sourceHint="O mesmo idioma vale para todas as páginas"
              onSource={onSource}
              onTarget={onTarget}
            />
            <button type="button" className="button" disabled={!files.length || busy} onClick={start}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Enviando...
                </>
              ) : (
                "Transcrever e traduzir tudo"
              )}
            </button>
          </section>
        </>
      )}

      {error && (
        <p className="message message--error" role="alert">
          {error}
        </p>
      )}

      {batchId && !batch && !error && (
        <p className="message" role="status">
          <span className="spinner spinner--inline" aria-hidden="true" /> Carregando o lote...
        </p>
      )}

      {batch && (
        <section className="step step--result">
          <h2 className="step__title">Lote de {batch.total} página(s)</h2>
          <div className="progress" role="status" aria-live="polite">
            <progress className="progress__bar" max={batch.total} value={batch.done} aria-label="Progresso do lote" />
            <p className="progress__text">
              {running
                ? current
                  ? `Lendo a página ${current.n} de ${batch.total}. ${estimate(batch)}`
                  : `Na fila do servidor. ${batch.done} de ${batch.total} páginas prontas.`
                : `${batch.done} de ${batch.total} páginas lidas${batch.errors ? `, ${batch.errors} com erro` : ""}.${
                    batch.status === "cancelado" ? " Lote cancelado." : ""
                  }${batch.status === "interrompido" ? " O servidor reiniciou: tente de novo as páginas que faltaram." : ""}`}
            </p>
            <div className="actions">
              {running ? (
                <button type="button" className="button button--secondary" disabled={busy} onClick={cancel}>
                  Cancelar lote
                </button>
              ) : (
                <button type="button" className="button button--secondary" onClick={forget}>
                  Começar outro lote
                </button>
              )}
            </div>
            {!running && <p className="field__hint">O servidor apaga este lote em 24 horas.</p>}
          </div>

          <BatchResult
            batch={batch}
            edits={edits}
            busy={busy}
            onEdit={(n, field, value) => setEdits((all) => ({ ...all, [n]: { ...all[n], [field]: value } }))}
            onRetry={retry}
          />
        </section>
      )}
    </>
  );
}

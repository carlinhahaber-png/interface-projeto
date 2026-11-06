import { useEffect, useState } from "react";
import type { Batch, BatchPage, PageEdits } from "../types";
import { languageName } from "../languages";
import { exportBatch } from "../api";
import { copyText } from "../copy";
import { TestBadge } from "./ExternalConsent";
import { FidelityNote } from "./DocumentEra";
import WordDoubts from "./WordDoubts";

export const PAGE_STATUS: Record<BatchPage["status"], string> = {
  fila: "Na fila",
  rodando: "Lendo",
  pronto: "Pronta",
  erro: "Com erro",
  cancelado: "Cancelada",
  interrompido: "Interrompida",
};

interface Props {
  batch: Batch;
  edits: PageEdits;
  busy: boolean;
  onEdit: (n: number, field: "original_text" | "translated_text", value: string) => void;
  onRetry: (n: number) => void;
}

function pageLabel(p: BatchPage) {
  return p.file + (p.file_page ? `, p. ${p.file_page}` : "");
}

/** Resultado página a página: original e tradução lado a lado, edição, copiar e exportar tudo. */
export default function BatchResult({ batch, edits, busy, onEdit, onRetry }: Props) {
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<"original" | "translated">("original");
  const [message, setMessage] = useState<string | null>(null);
  const pages = batch.pages;
  const page = pages[Math.min(index, pages.length - 1)];
  const edit = edits[page.n] ?? {};
  const original = edit.original_text ?? page.original_text;
  const translated = edit.translated_text ?? page.translated_text;
  const failed = ["erro", "interrompido", "cancelado"].includes(page.status);
  const target = languageName(batch.target_lang);

  useEffect(() => setMessage(null), [index]);

  async function copy(text: string, what: string) {
    setMessage((await copyText(text)) ? `${what} copiado.` : "Não deu para copiar. Selecione o texto e use Ctrl+C.");
  }

  const [showDoubts, setShowDoubts] = useState(false);
  const doubts = (page.low_confidence_words ?? []).filter((w) => original.includes(w));

  async function download(format: "txt" | "zip", version: "fiel" | "normalizado" = "fiel") {
    setMessage(null);
    try {
      const blob = await exportBatch(batch.id, format, edits, version);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lote-${batch.id.slice(0, 8)}${version === "normalizado" ? "-normalizado" : ""}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível baixar.");
    }
  }

  return (
    <div className="batch-result">
      <nav className="pager" aria-label="Páginas do lote">
        <button
          type="button"
          className="button button--small"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          ← Anterior
        </button>
        <label className="pager__select">
          <span className="visually-hidden">Ir para a página</span>
          <select className="select" value={index} onChange={(e) => setIndex(Number(e.target.value))}>
            {pages.map((p, i) => (
              <option key={p.n} value={i}>
                Página {p.n} de {pages.length} — {PAGE_STATUS[p.status]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button--small"
          disabled={index >= pages.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Próxima →
        </button>
      </nav>

      <p className="pager__file">{pageLabel(page)}</p>
      {batch.document_era === "ancient" && <FidelityNote />}

      {failed && (
        <div className={`page-problem page-problem--${page.status}`} role="alert">
          <p className="page-problem__text">
            {page.status === "erro" ? "Não foi possível ler esta página." : `Página ${PAGE_STATUS[page.status].toLowerCase()}.`}{" "}
            {page.error}
          </p>
          <button type="button" className="button button--small" disabled={busy} onClick={() => onRetry(page.n)}>
            Tentar de novo só esta
          </button>
        </div>
      )}

      {(page.status === "fila" || page.status === "rodando") && (
        <p className="message" role="status">
          {page.status === "rodando" ? (
            <>
              <span className="spinner spinner--inline" aria-hidden="true" /> Lendo esta página...
            </>
          ) : (
            "Esta página ainda está na fila."
          )}
        </p>
      )}

      {page.status === "pronto" && (
        <>
          <div className="tabs" role="tablist" aria-label="Texto">
            <button role="tab" aria-selected={tab === "original"} className="tabs__tab" onClick={() => setTab("original")}>
              Texto original
            </button>
            <button role="tab" aria-selected={tab === "translated"} className="tabs__tab" onClick={() => setTab("translated")}>
              Texto traduzido
            </button>
          </div>
          <div className="result" data-tab={tab}>
            <section className="result__col result__col--original">
              <h3 className="result__title">Texto original ({languageName(batch.source_lang)})</h3>
              {doubts.length > 0 && (
                <button
                  type="button"
                  className="text-button doubts__toggle"
                  aria-pressed={showDoubts}
                  onClick={() => setShowDoubts(!showDoubts)}
                >
                  {showDoubts ? "Voltar a editar o texto" : `Marcar palavras com pouca certeza (${doubts.length})`}
                </button>
              )}
              {showDoubts && doubts.length > 0 ? (
                <WordDoubts text={original} words={doubts} />
              ) : (
                <textarea
                  className="result__text"
                  value={original}
                  onChange={(e) => onEdit(page.n, "original_text", e.target.value)}
                  aria-label={`Texto original da página ${page.n}`}
                  spellCheck={false}
                />
              )}
            </section>
            <section className="result__col result__col--translated">
              <h3 className="result__title">Texto traduzido ({target})</h3>
              {page.translated_text && page.notice.includes("serviço externo") && <TestBadge />}
              {page.translated_text || edit.translated_text !== undefined ? (
                <textarea
                  className="result__text"
                  value={translated}
                  onChange={(e) => onEdit(page.n, "translated_text", e.target.value)}
                  aria-label={`Texto traduzido da página ${page.n}`}
                  spellCheck={false}
                />
              ) : null}
              {page.notice && (
                <p className="message" role="status">
                  {page.notice}
                </p>
              )}
            </section>
          </div>
          <div className="actions">
            <button type="button" className="button button--secondary" onClick={() => copy(original, "Texto original")}>
              Copiar texto
            </button>
            {translated && (
              <button type="button" className="button button--secondary" onClick={() => copy(translated, "Tradução")}>
                Copiar tradução
              </button>
            )}
          </div>
        </>
      )}

      <div className="actions actions--export">
        <button type="button" className="button" onClick={() => download("txt")}>
          Baixar tudo em .txt
        </button>
        <button type="button" className="button button--secondary" onClick={() => download("zip")}>
          Baixar tudo em .zip
        </button>
        <button type="button" className="button button--secondary" onClick={() => download("txt", "normalizado")}>
          Baixar tudo normalizado (.txt)
        </button>
      </div>
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

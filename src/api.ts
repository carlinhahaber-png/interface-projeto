import type { Batch, PageEdits, ProcessResult, TranslateResult } from "./types";

// URL do backend, definida no build (VITE_API_URL). Vazia = mesma origem.
const API_URL = import.meta.env.VITE_API_URL ?? "";

export const TRANSLATION_UNAVAILABLE = "Tradução indisponível agora; a transcrição foi mantida.";

export const UNEXPECTED_RESPONSE = "Resposta inesperada do servidor. Tente de novo.";

// `valid` confere o formato da resposta 200: um corpo que não é JSON ou sem os campos vira erro na tela.
async function send(path: string, init: RequestInit, fallback: string, valid: (data: any) => boolean) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (e) {
    if (init.signal?.aborted) throw e;
    throw new Error("Não foi possível conectar ao servidor. Tente de novo.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : `Erro ${res.status} ${fallback}`);
  }
  if (!data || !valid(data)) throw new Error(UNEXPECTED_RESPONSE);
  return data;
}

/**
 * Envia o arquivo para o backend (POST /ocr) e devolve
 * { original_text, translated_text, detected_language, suggested_language?, suggestion_confidence? }.
 * A tradução é pedida à parte (translateText), para o original aparecer antes.
 */
export async function processDocument(
  file: File,
  targetLang: string,
  sourceLang: string
): Promise<ProcessResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("source_lang", sourceLang);
  body.append("target_lang", targetLang);
  return send("/ocr", { method: "POST", body }, "ao processar o arquivo.", (d) =>
    typeof d.original_text === "string" && typeof d.detected_language === "string"
  );
}

/** POST /translate. Falhas viram erro com a mensagem do servidor. */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  signal?: AbortSignal
): Promise<TranslateResult> {
  return send(
    "/translate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
      signal,
    },
    "ao traduzir.",
    (d) => typeof d.translated_text === "string"
  );
}

// ---- Lote (/batches): várias imagens e PDFs, lidos uma página por vez no servidor.

const isBatch = (d: any) => typeof d.id === "string" && Array.isArray(d.pages);

/** POST /batches: devolve o lote na fila (o id fica guardado no navegador para voltar depois). */
export async function createBatch(
  files: File[],
  sourceLang: string,
  targetLang: string,
  allowExternal = false
): Promise<Batch> {
  const body = new FormData();
  files.forEach((f) => body.append("files", f, f.name));
  body.append("source_lang", sourceLang);
  body.append("target_lang", targetLang);
  if (allowExternal) body.append("allow_external", "true");
  return send("/batches", { method: "POST", body }, "ao enviar os arquivos.", isBatch);
}

export async function getBatch(id: string, signal?: AbortSignal): Promise<Batch> {
  return send(`/batches/${id}`, { signal }, "ao consultar o lote.", isBatch);
}

/** DELETE /batches/{id}: cancela o lote (o que já foi lido fica). Lote que já tinha terminado é apagado (null). */
export async function cancelBatch(id: string): Promise<Batch | null> {
  const data = await send(`/batches/${id}`, { method: "DELETE" }, "ao cancelar.",
    (d) => isBatch(d) || d.status === "apagado");
  return isBatch(data) ? data : null;
}

export async function retryPage(id: string, n: number): Promise<Batch> {
  return send(`/batches/${id}/pages/${n}/retry`, { method: "POST" }, "ao tentar de novo.", isBatch);
}

/** Exporta todas as páginas (.txt ou .zip) já com os textos editados na tela. */
export async function exportBatch(id: string, format: "txt" | "zip", edits: PageEdits): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/batches/${id}/export?format=${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages: edits }),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente de novo.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(typeof data?.detail === "string" ? data.detail : `Erro ${res.status} ao exportar.`);
  }
  return res.blob();
}

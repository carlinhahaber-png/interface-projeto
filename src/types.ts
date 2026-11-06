export interface ProcessResult {
  original_text: string;
  translated_text: string;
  detected_language: string; // código, ex.: "pt"
  suggested_language?: string; // idioma que o texto parece ter, se diferente do usado
  suggestion_confidence?: number; // 0 a 1
  low_confidence_words?: string[]; // só quando pedido (word_confidence)
  normalized_text?: string; // só quando pedido (normalized)
}

/** /ocr no modo Antigo com motor lento: 202 com o job, consultado em /ocr/jobs/{id}. */
export interface OcrJob {
  job_id: string;
  status: "fila" | "rodando" | "pronto" | "erro" | "cancelado";
  original_text?: string;
  detected_language?: string;
  error?: string;
}

export interface TranslateResult {
  translated_text: string;
  translation_notice: string; // aviso (vazio quando a tradução saiu inteira)
  translated_by?: string; // só no /translate/external: ex.: "IA (Google Gemini)"
}

export type PageStatus = "fila" | "rodando" | "pronto" | "erro" | "cancelado" | "interrompido";

export interface BatchPage {
  n: number;
  file: string;
  file_page: number | null; // página dentro do PDF
  status: PageStatus;
  original_text: string;
  translated_text: string;
  notice: string; // aviso da tradução
  error: string;
  seconds: number | null; // tempo da página, para estimar o que falta
  needs_consent: boolean;
  low_confidence_words?: string[]; // só quando o lote foi pedido com word_confidence
}

export interface Batch {
  id: string;
  status: "fila" | "rodando" | "pronto" | "cancelado" | "interrompido";
  source_lang: string;
  target_lang: string;
  document_era?: "modern" | "ancient"; // só vem quando o lote foi pedido no modo Antigo
  total: number;
  done: number;
  errors: number;
  pages: BatchPage[];
}

export type PageEdits = Record<number, { original_text?: string; translated_text?: string }>;

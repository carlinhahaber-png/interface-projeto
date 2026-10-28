export interface ProcessResult {
  original_text: string;
  translated_text: string;
  detected_language: string; // código, ex.: "pt"
  suggested_language?: string; // idioma que o texto parece ter, se diferente do usado
  suggestion_confidence?: number; // 0 a 1
}

export interface TranslateResult {
  translated_text: string;
  translation_notice: string; // aviso (vazio quando a tradução saiu inteira)
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
}

export interface Batch {
  id: string;
  status: "fila" | "rodando" | "pronto" | "cancelado" | "interrompido";
  source_lang: string;
  target_lang: string;
  total: number;
  done: number;
  errors: number;
  pages: BatchPage[];
}

export type PageEdits = Record<number, { original_text?: string; translated_text?: string }>;

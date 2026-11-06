// Versão para busca, igual à do servidor (ocr.normalize): ſ -> s, ligaduras separadas, aspas retas, hifenização de
// fim de linha juntada e espaços repetidos. Abreviações não são expandidas. O texto fiel não muda.
const SAME: Record<string, string> = {
  "ſ": "s", "ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st",
  "“": '"', "”": '"', "„": '"', "‘": "'", "’": "'",
};

export function normalizeText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[ſﬁﬂﬀﬃﬄﬅﬆ“”„‘’]/g, (c) => SAME[c])
    .replace(/(\p{L})[-¬]\n(\p{L})/gu, "$1$2")
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

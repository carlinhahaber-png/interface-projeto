export const LANGUAGES = [
  { code: "pt", name: "Português" },
  { code: "en", name: "Inglês" },
  { code: "es", name: "Espanhol" },
  { code: "fr", name: "Francês" },
  { code: "de", name: "Alemão" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "Japonês" },
  { code: "zh", name: "Chinês" },
];

// Idiomas que o OCR do backend lê (texto de origem).
export const SOURCE_LANGUAGES = [
  { code: "pt", name: "Português" },
  { code: "es", name: "Espanhol" },
  { code: "it", name: "Italiano" },
  { code: "la", name: "Latim" },
];

export function languageName(code: string): string {
  return [...LANGUAGES, ...SOURCE_LANGUAGES].find((l) => l.code === code)?.name ?? code;
}
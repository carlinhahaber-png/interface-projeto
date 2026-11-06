import { Fragment } from "react";

interface Props {
  text: string;
  words: string[]; // palavras de baixa confiança devolvidas pela API
}

/**
 * Texto só para leitura com as palavras de pouca certeza marcadas. A marca não depende só da cor: tem
 * sublinhado pontilhado e uma legenda que diz quantas são.
 */
export default function WordDoubts({ text, words }: Props) {
  const doubt = new Set(words);
  const parts = text.split(/(\s+)/);
  return (
    <div className="doubts">
      <p className="doubts__legend">
        <mark className="doubt">Sublinhado pontilhado</mark> = o programa teve pouca certeza ({words.length}{" "}
        {words.length === 1 ? "palavra" : "palavras"}). Confira com a imagem.
      </p>
      <div className="result__text doubts__text" tabIndex={0} aria-label="Texto com as palavras de pouca certeza marcadas">
        {parts.map((part, i) =>
          doubt.has(part) ? (
            <mark key={i} className="doubt" title="pouca certeza">
              {part}
            </mark>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          )
        )}
      </div>
    </div>
  );
}

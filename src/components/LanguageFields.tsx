import { LANGUAGES, SOURCE_LANGUAGES } from "../languages";

interface Props {
  source: string;
  target: string;
  disabled: boolean;
  sourceHint: string;
  onSource: (code: string) => void;
  onTarget: (code: string) => void;
}

/** Idioma original (o que o OCR lê) e idioma da tradução; usado no envio de um arquivo e no lote. */
export default function LanguageFields({ source, target, disabled, sourceHint, onSource, onTarget }: Props) {
  return (
    <div className="lang-row">
      <label className="field">
        <span className="field__label">Idioma original</span>
        <select className="select" value={source} disabled={disabled} onChange={(e) => onSource(e.target.value)}>
          {SOURCE_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <span className="field__hint" role="status">
          {sourceHint}
        </span>
      </label>
      <label className="field">
        <span className="field__label">Traduzir para</span>
        <select className="select" value={target} disabled={disabled} onChange={(e) => onTarget(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

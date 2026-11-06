export type Era = "modern" | "ancient";

interface Props {
  value: Era;
  disabled: boolean;
  onChange: (era: Era) => void;
}

/** Tipo do documento: Moderno (padrão, rápido) ou Antigo (motor para escrita antiga, mais lento). */
export default function DocumentEra({ value, disabled, onChange }: Props) {
  return (
    <fieldset className="era" disabled={disabled}>
      <legend className="field__label">Tipo do documento</legend>
      <div className="era__options">
        {(
          [
            ["modern", "Moderno (rápido)"],
            ["ancient", "Antigo (mais lento, mais preciso)"],
          ] as [Era, string][]
        ).map(([era, label]) => (
          <label key={era} className="era__option">
            <input type="radio" name="document-era" value={era} checked={value === era} onChange={() => onChange(era)} />
            {label}
          </label>
        ))}
      </div>
      {value === "ancient" && (
        <p className="field__hint" role="status">
          Pode levar alguns minutos por página. Você pode fechar a aba e voltar depois.
        </p>
      )}
    </fieldset>
  );
}

/** Aviso fixo no resultado do modo Antigo. */
export function FidelityNote() {
  return (
    <p className="fidelity-note" role="note">
      Texto fiel ao original. Abreviações não são expandidas. Pode conter erros.
    </p>
  );
}

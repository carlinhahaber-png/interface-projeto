import { useEffect, useState } from "react";

// Leitura fácil (dislexia, TDAH, vista cansada): fonte, tamanho e espaço entre linhas, lembrados no navegador.
// O index.html aplica a escolha salva antes de desenhar a página.
type Settings = { font: "padrao" | "legivel"; size: "normal" | "grande" | "maior"; spacing: "normal" | "amplo" | "maior" };

const KEY = "reading";
const DEFAULTS: Settings = { font: "padrao", size: "normal", spacing: "normal" };
const FONT_URL = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap";

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** Fonte para leitura fácil (Atkinson Hyperlegible, OFL), baixada só quando alguém a escolhe. */
export function loadLegibleFont() {
  if (document.getElementById("font-legivel")) return;
  const link = document.createElement("link");
  link.id = "font-legivel";
  link.rel = "stylesheet";
  link.href = FONT_URL;
  document.head.appendChild(link);
}

const CHOICES: { key: keyof Settings; label: string; options: [string, string][] }[] = [
  { key: "font", label: "Fonte", options: [["padrao", "Padrão"], ["legivel", "Fácil de ler"]] },
  { key: "size", label: "Tamanho do texto", options: [["normal", "Normal"], ["grande", "Grande"], ["maior", "Maior"]] },
  { key: "spacing", label: "Espaço entre linhas", options: [["normal", "Normal"], ["amplo", "Amplo"], ["maior", "Maior"]] },
];

export default function ReadingOptions() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.font = settings.font;
    root.dataset.size = settings.size;
    root.dataset.spacing = settings.spacing;
    if (settings.font === "legivel") loadLegibleFont();
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // armazenamento bloqueado: vale só nesta visita
    }
  }, [settings]);

  return (
    <details className="reading">
      <summary className="reading__summary">Opções de leitura</summary>
      <div className="reading__body">
        {CHOICES.map(({ key, label, options }) => (
          <fieldset key={key} className="reading__group">
            <legend className="field__label">{label}</legend>
            {options.map(([value, name]) => (
              <label key={value} className="reading__option">
                <input
                  type="radio"
                  name={`reading-${key}`}
                  value={value}
                  checked={settings[key] === value}
                  onChange={() => setSettings({ ...settings, [key]: value })}
                />
                {name}
              </label>
            ))}
          </fieldset>
        ))}
        <button type="button" className="text-button" onClick={() => setSettings(DEFAULTS)}>
          Voltar ao padrão
        </button>
      </div>
    </details>
  );
}

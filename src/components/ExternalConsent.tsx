interface Props {
  service: string; // ex.: "Google Gemini"
  terms?: { text: string; url: string } | null; // aviso dos termos vindo do servidor
  onAccept: () => void;
  onDecline: () => void;
}

/** Pergunta antes do primeiro envio de texto para um serviço externo (tradução do latim). */
export default function ExternalConsent({ service, terms, onAccept, onDecline }: Props) {
  return (
    <div className="consent" role="alertdialog" aria-labelledby="consent-title" aria-describedby="consent-text">
      <p id="consent-title" className="consent__title">
        A tradução do latim usa um serviço externo
      </p>
      <p id="consent-text" className="consent__text">
        {terms ? (
          <>
            {terms.text}{" "}
            <a href={terms.url} target="_blank" rel="noreferrer">
              Termos do Google
            </a>
          </>
        ) : (
          <>
            O texto será enviado ao Google ({service}). O Google pode guardar e ler o que for enviado. Não envie
            textos pessoais ou sigilosos.
          </>
        )}
      </p>
      <div className="actions">
        <button type="button" className="button button--small" onClick={onAccept}>
          Enviar e traduzir
        </button>
        <button type="button" className="button button--small button--secondary" onClick={onDecline}>
          Não traduzir
        </button>
      </div>
    </div>
  );
}

/** Selo das traduções feitas pelo serviço externo (IA). label vem do servidor (translated_by). */
export function TestBadge({ label = "IA (Google Gemini)" }: { label?: string }) {
  return <p className="badge">Traduzido por {label}. Pode conter erros: confira com o original.</p>;
}

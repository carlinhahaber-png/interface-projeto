import { useEffect, useState } from "react";
import type { ProcessResult, TranslateResult } from "../types";
import { languageName } from "../languages";
import { externalService, externalTerms, giveConsent, hasConsent, translateExternal, translateText, TRANSLATION_UNAVAILABLE } from "../api";
import ExternalConsent, { TestBadge } from "./ExternalConsent";
import { copyText } from "../copy";
import { normalizeText } from "../normalize";
import WordDoubts from "./WordDoubts";

interface Props {
  result: ProcessResult;
  originalLang: string;
  targetLang: string;
  fileName: string;
}

export default function ResultPanel({
  result,
  originalLang,
  targetLang,
  fileName,
}: Props) {
  const [tab, setTab] = useState<"original" | "translated">("original");
  const [text, setText] = useState(result.original_text);
  const [translation, setTranslation] = useState<TranslateResult | null>(null);
  const [translatedFrom, setTranslatedFrom] = useState(result.original_text);
  const [translating, setTranslating] = useState(true);
  // Latim pelo Gemini (se ligado no servidor): pergunta antes do 1º envio da sessão.
  const [askConsent, setAskConsent] = useState<{ service: string; text: string; terms: { text: string; url: string } | null } | null>(null);
  const [external, setExternal] = useState(false);

  const originalLabel = originalLang
    ? `Texto original (${languageName(originalLang)})`
    : "Texto original";
  const translatedLabel = `Texto traduzido (${languageName(targetLang)})`;
  const translated = translation?.translated_text ?? "";

  async function translate(source: string, signal?: AbortSignal, consented = hasConsent()) {
    setTranslating(true);
    setTranslatedFrom(source);
    setAskConsent(null);
    try {
      const service = await externalService(originalLang);
      if (service && !consented) {
        setAskConsent({ service, text: source, terms: await externalTerms() });
        setTranslating(false);
        return;
      }
      setExternal(Boolean(service));
      const send = service ? translateExternal : translateText;
      setTranslation(await send(source, originalLang, targetLang, signal));
    } catch (e) {
      if (signal?.aborted) return;
      const notice = e instanceof Error ? e.message : TRANSLATION_UNAVAILABLE;
      setTranslation({ translated_text: "", translation_notice: notice });
    }
    setTranslating(false);
  }

  // O original já está na tela; a tradução chega depois.
  useEffect(() => {
    const ctrl = new AbortController();
    translate(result.original_text, ctrl.signal);
    return () => ctrl.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [copied, setCopied] = useState<string | null>(null);

  async function copy() {
    setCopied((await copyText(text)) ? "Texto copiado." : "Não deu para copiar. Selecione o texto e use Ctrl+C.");
  }

  // Palavras de pouca certeza (se a API mandou): vista só de leitura com as marcas, ligada pela pessoa.
  const doubts = (result.low_confidence_words ?? []).filter((w) => text.includes(w));
  const [showDoubts, setShowDoubts] = useState(false);

  function download(normalized = false) {
    const body = normalized ? normalizeText(text) : text;
    let content = `${originalLabel}${normalized ? " — versão normalizada (ſ = s, ligaduras separadas)" : ""}\n${"-".repeat(40)}\n${body}\n`;
    if (translated) {
      content += `\n${translatedLabel}\n${"-".repeat(40)}\n${translated}\n`;
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = (translated ? "traduzido" : "transcricao") + (normalized ? "-normalizado" : "");
    a.download = `${fileName.replace(/\.[^.]+$/, "")}-${suffix}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Texto">
        <button
          role="tab"
          aria-selected={tab === "original"}
          className="tabs__tab"
          onClick={() => setTab("original")}
        >
          Texto original
        </button>
        <button
          role="tab"
          aria-selected={tab === "translated"}
          className="tabs__tab"
          onClick={() => setTab("translated")}
        >
          Texto traduzido
        </button>
      </div>

      <div className="result" data-tab={tab}>
        <section className="result__col result__col--original">
          <h3 className="result__title">{originalLabel}</h3>
          {doubts.length > 0 && (
            <button
              type="button"
              className="text-button doubts__toggle"
              aria-pressed={showDoubts}
              onClick={() => setShowDoubts(!showDoubts)}
            >
              {showDoubts ? "Voltar a editar o texto" : `Marcar palavras com pouca certeza (${doubts.length})`}
            </button>
          )}
          {showDoubts ? (
            <WordDoubts text={text} words={doubts} />
          ) : (
            <textarea
              className="result__text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label={originalLabel}
              spellCheck={false}
            />
          )}
          {text !== translatedFrom && !translating && (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => translate(text)}
            >
              Traduzir de novo
            </button>
          )}
        </section>
        <section className="result__col result__col--translated" aria-busy={translating}>
          <h3 className="result__title">{translatedLabel}</h3>
          {translating ? (
            <p className="message" role="status">
              <span className="spinner spinner--inline" aria-hidden="true" /> Traduzindo...
            </p>
          ) : (
            <>
              {askConsent && (
                <ExternalConsent
                  service={askConsent.service}
                  terms={askConsent.terms}
                  onAccept={() => {
                    giveConsent();
                    translate(askConsent.text, undefined, true);
                  }}
                  onDecline={() => {
                    setAskConsent(null);
                    setTranslation({ translated_text: "", translation_notice: "Tradução não feita. A transcrição continua aqui." });
                  }}
                />
              )}
              {translated && external && <TestBadge label={translation?.translated_by || undefined} />}
              {translated && <pre className="result__text">{translated}</pre>}
              {translation?.translation_notice && (
                <p className="message" role="status">
                  {translation.translation_notice}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <div className="actions">
        <button type="button" className="button button--secondary" onClick={() => download()}>
          Baixar em .txt
        </button>
        <button type="button" className="button button--secondary" onClick={() => download(true)}>
          Baixar versão normalizada (.txt)
        </button>
        <button type="button" className="button button--secondary" onClick={copy}>
          Copiar texto
        </button>
      </div>
      {copied && (
        <p className="message" role="status">
          {copied}
        </p>
      )}
    </div>
  );
}

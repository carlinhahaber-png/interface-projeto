import { useEffect, useMemo, useRef, useState } from "react";

// Os mesmos limites do servidor (ele confere de novo; PDF de várias páginas conta cada página).
export const BATCH_MAX_FILES = 60;
export const BATCH_MAX_MB = 200;
const FILE_MAX_MB = 10;
const ACCEPTED = /\.(pdf|png|jpe?g)$/i;

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Pasta arrastada: percorre as subpastas (API de entradas do navegador).
async function readEntry(entry: any): Promise<File[]> {
  if (entry.isFile) return [await new Promise<File>((ok, fail) => entry.file(ok, fail))];
  if (!entry.isDirectory) return [];
  const reader = entry.createReader();
  const out: File[] = [];
  for (;;) {
    const batch: any[] = await new Promise((ok, fail) => reader.readEntries(ok, fail));
    if (!batch.length) return out;
    for (const child of batch) out.push(...(await readEntry(child)));
  }
}

async function droppedFiles(dt: DataTransfer): Promise<File[]> {
  const entries = [...dt.items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...dt.files];
  const out: File[] = [];
  for (const entry of entries) out.push(...(await readEntry(entry)));
  return out;
}

function Thumb({ file }: { file: File }) {
  const url = useMemo(() => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url ? (
    <img className="file-chip__thumb" src={url} alt="" loading="lazy" />
  ) : (
    <span className="file-chip__thumb file-chip__thumb--pdf">PDF</span>
  );
}

interface Props {
  files: File[];
  disabled: boolean;
  onChange: (files: File[]) => void;
}

/** Vários arquivos (ou uma pasta) com miniaturas; só aceita PDF, JPG e PNG dentro dos limites. */
export default function BatchPicker({ files, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const total = files.reduce((sum, f) => sum + f.size, 0);

  function add(list: File[]) {
    const skipped = { format: 0, size: 0, count: 0 };
    const next = [...files];
    let bytes = total;
    for (const f of list) {
      if (!ACCEPTED.test(f.name)) skipped.format++;
      else if (f.size > FILE_MAX_MB * 1024 * 1024 || bytes + f.size > BATCH_MAX_MB * 1024 * 1024) skipped.size++;
      else if (next.length >= BATCH_MAX_FILES) skipped.count++;
      else {
        next.push(f);
        bytes += f.size;
      }
    }
    // Ordem natural do nome ("pag2" antes de "pag10"): é a ordem das páginas no resultado.
    next.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
    const parts = [];
    if (skipped.format) parts.push(`${skipped.format} fora do formato (só PDF, JPG e PNG)`);
    if (skipped.size) parts.push(`${skipped.size} grande(s) demais (até ${FILE_MAX_MB} MB cada, ${BATCH_MAX_MB} MB no total)`);
    if (skipped.count) parts.push(`${skipped.count} além do limite de ${BATCH_MAX_FILES} arquivos`);
    setNotice(parts.length ? `Ficaram de fora: ${parts.join("; ")}.` : null);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
    if (folderRef.current) folderRef.current.value = "";
  }

  return (
    <div>
      <div
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) add(await droppedFiles(e.dataTransfer));
        }}
      >
        <p className="dropzone__text">Arraste e solte vários arquivos ou uma pasta aqui</p>
        <div className="dropzone__actions">
          <button type="button" className="link-button" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Escolher arquivos
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="link-button" disabled={disabled} onClick={() => folderRef.current?.click()}>
            Escolher uma pasta
          </button>
        </div>
        <p className="dropzone__hint">
          PDF (várias páginas), JPG ou PNG. Até {BATCH_MAX_FILES} páginas e {BATCH_MAX_MB} MB.
        </p>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={(e) => add([...(e.target.files ?? [])])}
        />
        <input
          ref={folderRef}
          type="file"
          hidden
          multiple
          {...{ webkitdirectory: "" }} // escolher pasta: atributo fora do padrão, aceito pelos navegadores atuais
          onChange={(e) => add([...(e.target.files ?? [])])}
        />
      </div>

      {notice && (
        <p className="message" role="status">
          {notice}
        </p>
      )}

      {files.length > 0 && (
        <>
          <p className="batch-files__summary">
            {files.length} arquivo(s), {formatSize(total)}
            <button type="button" className="text-button" disabled={disabled} onClick={() => onChange([])}>
              Tirar todos
            </button>
          </p>
          <ul className="batch-files">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="file-chip">
                <Thumb file={f} />
                <span className="file-chip__name">{f.name}</span>
                <span className="file-chip__size">{formatSize(f.size)}</span>
                <button
                  type="button"
                  className="text-button"
                  disabled={disabled}
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  aria-label={`Tirar ${f.name}`}
                >
                  Tirar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

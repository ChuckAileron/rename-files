import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { listFiles, renameFiles } from './fileUtils';

type FileRename = {
  oldName: string;
  newName: string;
};

type TransformOptions = {
  search: string;
  replace: string;
  prefixFind: string;
  prefixReplace: string;
  suffixFind: string;
  suffixReplace: string;
  prefixEndFind: string;
  prefixEndReplace: string;
  suffixEndFind: string;
  suffixEndReplace: string;
  addPrefix: string;
  addSuffix: string;
};

const INITIAL_OPTIONS: TransformOptions = {
  search: '',
  replace: '',
  prefixFind: '',
  prefixReplace: '',
  suffixFind: '',
  suffixReplace: '',
  prefixEndFind: '',
  prefixEndReplace: '',
  suffixEndFind: '',
  suffixEndReplace: '',
  addPrefix: '',
  addSuffix: '',
};

function splitExtension(name: string): { base: string; ext: string } {
  const idx = name.lastIndexOf('.');
  if (idx > 0) return { base: name.slice(0, idx), ext: name.slice(idx) };
  return { base: name, ext: '' };
}

function applyTransforms(base: string, o: TransformOptions): string {
  let name = base;
  if (o.search) name = name.replaceAll(o.search, o.replace);
  if (o.prefixFind && name.startsWith(o.prefixFind)) {
    name = o.prefixReplace + name.slice(o.prefixFind.length);
  }
  if (o.suffixFind && name.endsWith(o.suffixFind)) {
    name = name.slice(0, name.length - o.suffixFind.length) + o.suffixReplace;
  }
  if (o.prefixEndFind) {
    const idx = name.indexOf(o.prefixEndFind);
    if (idx >= 0) name = name.slice(0, idx) + o.prefixEndReplace;
  }
  if (o.suffixEndFind) {
    const idx = name.lastIndexOf(o.suffixEndFind);
    if (idx >= 0) name = name.slice(0, idx) + o.suffixEndReplace;
  }
  if (o.addPrefix) name = o.addPrefix + name;
  if (o.addSuffix) name = name + o.addSuffix;
  return name;
}

function buildNewName(file: string, o: TransformOptions): string {
  const { base, ext } = splitExtension(file);
  return applyTransforms(base, o) + ext;
}

function computeRenames(files: string[], o: TransformOptions): FileRename[] {
  const taken = new Set<string>(files);
  const result: FileRename[] = [];
  for (const file of files) {
    let candidate = buildNewName(file, o);
    const { base, ext } = splitExtension(candidate);
    let n = 2;
    while (candidate !== file && taken.has(candidate)) {
      candidate = `${base} (${n})${ext}`;
      n += 1;
    }
    taken.add(candidate);
    result.push({ oldName: file, newName: candidate });
  }
  return result;
}

type OptionRowProps = {
  title: string;
  tone: string;
  findValue: string;
  replaceValue: string;
  onFind: (e: ChangeEvent<HTMLInputElement>) => void;
  onReplace: (e: ChangeEvent<HTMLInputElement>) => void;
};

function OptionRow({
  title,
  tone,
  findValue,
  replaceValue,
  onFind,
  onReplace,
}: OptionRowProps) {
  return (
    <div className="option-row">
      <span className={`badge badge-${tone}`}>{title}</span>
      <input
        className="field"
        type="text"
        value={findValue}
        onChange={onFind}
        placeholder="Texto a buscar"
      />
      <span className="arrow">→</span>
      <input
        className="field"
        type="text"
        value={replaceValue}
        onChange={onReplace}
        placeholder="Reemplazar por"
      />
    </div>
  );
}

type AddRowProps = {
  title: string;
  tone: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
};

function AddRow({ title, tone, value, onChange, placeholder }: AddRowProps) {
  return (
    <div className="option-row">
      <span className={`badge badge-${tone}`}>{title}</span>
      <input
        className="field"
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

const App: React.FC = () => {
  const [directory, setDirectory] = useState<string>('');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [ops, setOps] = useState<TransformOptions>(INITIAL_OPTIONS);
  const [notice, setNotice] = useState<string>('');

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      const handler = (_event: unknown, dir: string) => {
        setDirectory(dir);
      };
      ipcRenderer.on('set-directory', handler);
      return () => {
        ipcRenderer.removeListener('set-directory', handler);
      };
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const update =
    (field: keyof TransformOptions) => (e: ChangeEvent<HTMLInputElement>) =>
      setOps((prev) => ({ ...prev, [field]: e.target.value }));

  const renames = useMemo(() => computeRenames(files, ops), [files, ops]);
  const selectedCount = useMemo(() => selectedFiles.size, [selectedFiles]);
  const changedCount = useMemo(
    () =>
      renames.filter(
        (r) => selectedFiles.has(r.oldName) && r.oldName !== r.newName,
      ).length,
    [renames, selectedFiles],
  );
  const allSelected = files.length > 0 && selectedFiles.size === files.length;

  const refreshFiles = async (dir: string): Promise<void> => {
    const items = await listFiles(dir);
    setFiles(items);
    setSelectedFiles(new Set(items));
  };

  const handleSelectDirectory = async (): Promise<void> => {
    // @ts-expect-error electronAPI no está tipado
    const dir: string | null = await window.electronAPI.selectDirectory();
    if (dir) {
      setDirectory(dir);
      setFiles([]);
      setSelectedFiles(new Set());
    }
  };

  const handleListFiles = async (): Promise<void> => {
    setLoading(true);
    try {
      await refreshFiles(directory);
    } catch (error) {
      console.error('Error al listar archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: string): void => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  const handleToggleAll = (): void => {
    setSelectedFiles(allSelected ? new Set() : new Set(files));
  };

  const handleRename = async (): Promise<void> => {
    if (!directory) return;
    setLoading(true);
    let count = 0;
    for (const { oldName, newName } of renames) {
      if (!selectedFiles.has(oldName) || oldName === newName) continue;
      try {
        await renameFiles(directory, [oldName], oldName, newName);
        count += 1;
      } catch (error) {
        console.error(`Error al renombrar "${oldName}":`, error);
      }
    }
    setNotice(
      count > 0
        ? `Se renombraron ${count} archivo${count === 1 ? '' : 's'}`
        : 'No hubo cambios por aplicar',
    );
    try {
      await refreshFiles(directory);
    } catch (error) {
      console.error('Error al listar archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <style>{`
        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          background: #eef1f7;
        }
        .app {
          font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif;
          color: #0f172a;
          min-height: 100vh;
          padding: 32px 20px 56px;
          background:
            radial-gradient(900px 420px at 12% -10%, rgba(99, 102, 241, 0.14), transparent 60%),
            radial-gradient(800px 420px at 92% -5%, rgba(139, 92, 246, 0.12), transparent 60%),
            linear-gradient(180deg, #f7f8fc 0%, #eef1f7 100%);
        }
        .card {
          max-width: 920px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 20px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 44px rgba(15, 23, 42, 0.1);
          overflow: hidden;
        }
        .header {
          padding: 26px 32px 20px;
          background: linear-gradient(135deg, #fafbff 0%, #f5f3ff 100%);
          border-bottom: 1px solid #eef2f7;
        }
        .header-top {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .logo {
          width: 52px;
          height: 52px;
          border-radius: 15px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.45rem;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
          flex-shrink: 0;
        }
        .title {
          margin: 0;
          font-size: 1.55rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #0f172a;
        }
        .subtitle {
          margin: 2px 0 0;
          font-size: 0.85rem;
          color: #64748b;
        }
        .directory-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }
        .dir-icon {
          color: #818cf8;
          display: flex;
          flex-shrink: 0;
        }
        .dir-path {
          flex: 1;
          min-width: 0;
          font-size: 0.85rem;
          color: #475569;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dir-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s, box-shadow 0.15s, border-color 0.15s, transform 0.05s;
        }
        .btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }
        .btn-primary:hover:not(:disabled) {
          filter: brightness(1.06);
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.42);
        }
        .btn-primary:disabled {
          background: #c7d2fe;
          box-shadow: none;
          cursor: not-allowed;
        }
        .btn-outline {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        .btn-outline:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #c7d2fe;
        }
        .btn-outline:disabled {
          color: #cbd5e1;
          cursor: not-allowed;
        }
        .info-banner {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 18px 32px 0;
          padding: 10px 14px;
          border-radius: 12px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 0.82rem;
        }
        .info-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          flex-shrink: 0;
        }
        .section {
          padding: 14px 32px 2px;
        }
        .section-title {
          margin: 0 0 12px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: #94a3b8;
        }
        .option-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .badge {
          width: 150px;
          flex-shrink: 0;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 6px 12px;
          border-radius: 999px;
          text-align: center;
          white-space: nowrap;
        }
        .badge-slate {
          background: #e2e8f0;
          color: #334155;
        }
        .badge-blue {
          background: #e0e7ff;
          color: #4338ca;
        }
        .badge-teal {
          background: #ccfbf1;
          color: #0f766e;
        }
        .badge-violet {
          background: #ede9fe;
          color: #6d28d9;
        }
        .badge-indigo {
          background: #e0e6ff;
          color: #3730a3;
        }
        .badge-amber {
          background: #fef3c7;
          color: #b45309;
        }
        .badge-rose {
          background: #ffe4e6;
          color: #be123c;
        }
        .field {
          flex: 1;
          min-width: 0;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          font-size: 0.9rem;
          font-family: inherit;
          color: #0f172a;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .field:focus {
          outline: none;
          border-color: #818cf8;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .field::placeholder {
          color: #94a3b8;
        }
        .arrow {
          color: #cbd5e1;
          font-weight: 600;
          flex-shrink: 0;
        }
        .file-list-panel {
          margin: 18px 32px 24px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          background: #ffffff;
        }
        .file-list-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.82rem;
          color: #475569;
          font-weight: 600;
        }
        .head-spacer {
          flex: 1;
        }
        .head-count {
          color: #94a3b8;
          font-weight: 500;
        }
        .file-list {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 320px;
          overflow-y: auto;
        }
        .file-list::-webkit-scrollbar {
          width: 10px;
        }
        .file-list::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 8px;
          border: 2px solid #fff;
        }
        .file-list::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .file-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
        }
        .file-row:last-child {
          border-bottom: none;
        }
        .file-row:hover {
          background: #f8fafc;
        }
        .check {
          width: 17px;
          height: 17px;
          accent-color: #6366f1;
          cursor: pointer;
          flex-shrink: 0;
        }
        .names {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex-wrap: wrap;
          font-size: 0.85rem;
        }
        .old-name {
          color: #94a3b8;
          word-break: break-all;
        }
        .new-name {
          color: #4338ca;
          font-weight: 600;
          word-break: break-all;
        }
        .arrow-mini {
          color: #cbd5e1;
          flex-shrink: 0;
        }
        .chip-small {
          background: #f1f5f9;
          color: #94a3b8;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 9px;
          border-radius: 999px;
        }
        .empty-state {
          text-align: center;
          padding: 44px 16px;
          color: #94a3b8;
          font-size: 0.9rem;
        }
        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 32px;
          background: linear-gradient(180deg, #f8fafc, #f1f5f9);
          border-top: 1px solid #e2e8f0;
        }
        .footer-info {
          font-size: 0.85rem;
          color: #475569;
        }
        .btn-rename {
          min-width: 180px;
        }
        .loader-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 440px;
          color: #6366f1;
          font-weight: 600;
        }
        .spinner {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 4px solid #e0e7ff;
          border-top-color: #6366f1;
          animation: spin 1s linear infinite;
        }
        .notice {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
          animation: rise 0.25s ease;
          z-index: 10;
          white-space: nowrap;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
      <div className="card">
        {loading ? (
          <div className="loader-wrap">
            <div className="spinner" />
            <span>Cargando...</span>
          </div>
        ) : (
          <>
            <header className="header">
              <div className="header-top">
                <div className="logo">R</div>
                <div>
                  <h1 className="title">Renombrar Archivos</h1>
                  <p className="subtitle">
                    Herramienta para renombrar archivos en lote
                  </p>
                </div>
              </div>
              <div className="directory-bar">
                <span className="dir-icon">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </span>
                <span className="dir-path">
                  {directory || 'Ningún directorio seleccionado'}
                </span>
                <div className="dir-actions">
                  <button
                    className="btn btn-outline"
                    onClick={handleSelectDirectory}
                  >
                    Seleccionar directorio
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleListFiles}
                    disabled={!directory}
                  >
                    Listar archivos
                  </button>
                </div>
              </div>
            </header>

            <div className="info-banner">
              <span className="info-dot" />
              Todas las operaciones se aplican sin considerar la extensión del
              archivo.
            </div>

            <section className="section">
              <h2 className="section-title">Reemplazos</h2>
              <OptionRow
                title="Buscar"
                tone="slate"
                findValue={ops.search}
                replaceValue={ops.replace}
                onFind={update('search')}
                onReplace={update('replace')}
              />
              <OptionRow
                title="Prefijo"
                tone="blue"
                findValue={ops.prefixFind}
                replaceValue={ops.prefixReplace}
                onFind={update('prefixFind')}
                onReplace={update('prefixReplace')}
              />
              <OptionRow
                title="Sufijo"
                tone="teal"
                findValue={ops.suffixFind}
                replaceValue={ops.suffixReplace}
                onFind={update('suffixFind')}
                onReplace={update('suffixReplace')}
              />
              <OptionRow
                title="Prefijo hasta final"
                tone="violet"
                findValue={ops.prefixEndFind}
                replaceValue={ops.prefixEndReplace}
                onFind={update('prefixEndFind')}
                onReplace={update('prefixEndReplace')}
              />
              <OptionRow
                title="Sufijo hasta final"
                tone="indigo"
                findValue={ops.suffixEndFind}
                replaceValue={ops.suffixEndReplace}
                onFind={update('suffixEndFind')}
                onReplace={update('suffixEndReplace')}
              />
            </section>

            <section className="section">
              <h2 className="section-title">Añadir al nombre</h2>
              <AddRow
                title="Añadir prefijo"
                tone="amber"
                value={ops.addPrefix}
                onChange={update('addPrefix')}
                placeholder="Texto al inicio"
              />
              <AddRow
                title="Añadir sufijo"
                tone="rose"
                value={ops.addSuffix}
                onChange={update('addSuffix')}
                placeholder="Texto al final, antes de la extensión"
              />
            </section>

            <section className="file-list-panel">
              <div className="file-list-head">
                <input
                  type="checkbox"
                  className="check"
                  checked={allSelected}
                  onChange={handleToggleAll}
                />
                <span>{files.length} archivos</span>
                <span className="head-spacer" />
                <span className="head-count">
                  {selectedCount} seleccionados · {changedCount} se renombrarán
                </span>
              </div>
              {files.length === 0 ? (
                <div className="empty-state">
                  Elige un directorio y presiona «Listar archivos» para
                  comenzar.
                </div>
              ) : (
                <ul className="file-list">
                  {renames.map(({ oldName, newName }) => {
                    const selected = selectedFiles.has(oldName);
                    const changed = oldName !== newName;
                    return (
                      <li key={oldName} className="file-row">
                        <input
                          type="checkbox"
                          className="check"
                          checked={selected}
                          onChange={() => handleFileSelect(oldName)}
                        />
                        <div className="names">
                          {changed ? (
                            <>
                              <span className="old-name">{oldName}</span>
                              <span className="arrow-mini">→</span>
                              <span className="new-name">{newName}</span>
                            </>
                          ) : (
                            <>
                              <span
                                className="old-name"
                                style={{ color: '#64748b' }}
                              >
                                {oldName}
                              </span>
                              <span className="chip-small">Sin cambios</span>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <footer className="footer">
              <div className="footer-info">
                {files.length > 0
                  ? `${selectedCount} seleccionados · ${changedCount} se renombrarán`
                  : 'Carga una carpeta para comenzar'}
              </div>
              <button
                className="btn btn-primary btn-rename"
                onClick={handleRename}
                disabled={
                  !directory || selectedCount === 0 || changedCount === 0
                }
              >
                Renombrar{changedCount > 0 ? ` (${changedCount})` : ''}
              </button>
            </footer>
          </>
        )}
      </div>
      {notice && <div className="notice">{notice}</div>}
    </div>
  );
};

export default App;

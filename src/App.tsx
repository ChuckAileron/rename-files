

import React, { useState, useEffect, ChangeEvent } from 'react';
import { listFiles, renameFiles } from './fileUtils';

type FileRename = {
  oldName: string;
  newName: string;
};

const App: React.FC = () => {
  const [directory, setDirectory] = useState<string>('');
  const [files, setFiles] = useState<string[]>([]);
  const [search, setSearch] = useState<string>('');
  const [replace, setReplace] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');

	useEffect(() => {
		// Simula carga inicial
		setTimeout(() => setLoading(false), 500);
		// @ts-ignore
		if (window.require) {
			const { ipcRenderer } = window.require('electron');
			const handler = (_event: unknown, dir: string) => {
				console.log('[FRONTEND] Evento set-directory recibido:', dir);
				setDirectory(dir);
			};
			ipcRenderer.on('set-directory', handler);
			return () => {
				ipcRenderer.removeListener('set-directory', handler);
			};
		}
	}, []);

	const handleSelectDirectory = async (): Promise<void> => {
		// @ts-ignore
		const dir: string = await window.electronAPI.selectDirectory();
		if (dir) {
			setDirectory(dir);
		}
	};

	const handleListFiles = async (): Promise<void> => {
		setLoading(true);
		console.log('[FRONTEND] Botón Listar Archivos presionado. Directorio actual:', directory);
		const files: string[] = await listFiles(directory);
		console.log('[FRONTEND] Archivos recibidos:', files);
		setFiles(files);
		setSelectedFiles(new Set(files));
		setLoading(false);
	};

	const handleFileSelect = (file: string): void => {
		setSelectedFiles((prev: Set<string>) => {
			const newSet: Set<string> = new Set(prev);
			if (newSet.has(file)) {
				newSet.delete(file);
			} else {
				newSet.add(file);
			}
			return newSet;
		});
	};

	const handleRename = async (): Promise<void> => {
		setLoading(true);
		// Aplica prefijo y sufijo en el nombre final
		const filesToRename: string[] = Array.from(selectedFiles);
		const newNames: FileRename[] = [];
		filesToRename.forEach((file: string) => {
			let newName: string = file;
			if (search) newName = newName.replaceAll(search, replace);
			if (prefix) newName = prefix + newName;
			if (suffix) {
				const dotIdx: number = newName.lastIndexOf('.');
				if (dotIdx > 0) {
					newName = newName.slice(0, dotIdx) + suffix + newName.slice(dotIdx);
				} else {
					newName = newName + suffix;
				}
			}
			newNames.push({ oldName: file, newName });
		});
		// Renombrar usando la lógica original, pero pasando los nuevos nombres
		for (const { oldName, newName } of newNames) {
			if (oldName !== newName) {
				await renameFiles(directory, [oldName], oldName, newName);
			}
		}
		await handleListFiles();
		setLoading(false);
	};

  return (
    <div className="main-container">
      <style>{`
        body { background: #f6f8fa; }
        .main-container {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #fff;
          max-width: 700px;
          margin: 40px auto;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          padding: 32px 32px 24px 32px;
        }
        .title {
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 24px;
          color: #222;
          text-align: center;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .input-row {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
          justify-content: center;
        }
        .input-row input {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #d0d7de;
          font-size: 1rem;
        }
        .input-row button {
          padding: 8px 18px;
          border-radius: 6px;
          border: none;
          background: #2563eb;
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .input-row button:disabled {
          background: #b6c3d1;
          cursor: not-allowed;
        }
        .actions button {
          padding: 8px 18px;
          border-radius: 6px;
          border: none;
          background: #2563eb;
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .actions button:disabled {
          background: #b6c3d1;
          cursor: not-allowed;
        }
        .directory {
          font-size: 0.98rem;
          color: #444;
          margin-left: 8px;
          word-break: break-all;
        }
        .file-list {
          margin-top: 18px;
          max-height: 350px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
          padding: 12px 18px;
        }
        .file-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          color: #222;
          padding: 2px 0;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 60 }}>
          <div style={{ border: '6px solid #f3f3f3', borderTop: '6px solid #2563eb', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
          <span style={{ marginTop: 16, color: '#2563eb', fontWeight: 500 }}>Cargando...</span>
        </div>
      ) : (
        <>
          <div className="title">Renombrar Archivos</div>
          <div className="actions">
            <button onClick={handleSelectDirectory}>Seleccionar Directorio</button>
            <span className="directory">{directory}</span>
            <button onClick={handleListFiles} disabled={!directory}>
              Listar Archivos
            </button>
          </div>
          <div className="input-row">
            <input
              type="text"
              placeholder="Buscar substring"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
            <input
              type="text"
              placeholder="Reemplazar por"
              value={replace}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setReplace(e.target.value)}
            />
          </div>
          <div className="input-row">
            <input
              type="text"
              placeholder="Agregar prefijo"
              value={prefix}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPrefix(e.target.value)}
              style={{ minWidth: 80 }}
            />
            <input
              type="text"
              placeholder="Agregar sufijo"
              value={suffix}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSuffix(e.target.value)}
              style={{ minWidth: 80 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <button
              onClick={handleRename}
              disabled={!directory || (!search && !prefix && !suffix)}
              style={{ minWidth: 140, fontSize: '1.1rem', padding: '10px 0' }}
            >
              Renombrar
            </button>
          </div>
          <ul className="file-list">
            {files.map((file: string) => (
              <li key={file}>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file)}
                  onChange={() => handleFileSelect(file)}
                />
                {file}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default App;

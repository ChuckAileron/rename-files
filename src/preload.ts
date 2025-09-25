import { contextBridge, ipcRenderer } from 'electron';
import { RenameArgs } from './types';

contextBridge.exposeInMainWorld('electronAPI', {
	selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),
	listFiles: (directory: string): Promise<string[]> => ipcRenderer.invoke('list-files', directory),
	renameFiles: (args: RenameArgs): Promise<void> => ipcRenderer.invoke('rename-files', args),
});

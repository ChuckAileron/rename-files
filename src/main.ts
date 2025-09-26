import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { RenameArgs } from './types';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
	   mainWindow = new BrowserWindow({
		   width: 800,
		   height: 600,
		   webPreferences: {
			   preload: path.resolve(__dirname, 'preload.js'),
			   nodeIntegration: false,
			   contextIsolation: true,
		   },
	   });
	   mainWindow.setMenu(null);
	   mainWindow.loadURL('file://' + path.resolve(__dirname, '..', 'index.html'));
	   mainWindow.webContents.on('did-finish-load', () => {
		   console.log('[ELECTRON] App iniciada y ventana cargada');
	   });
}

app.whenReady().then(() => {
	createWindow();
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-directory', async (): Promise<string | null> => {
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties: ['openDirectory'],
	});
	if (canceled) return null;
	return filePaths[0];
});

ipcMain.handle('list-files', async (_event, directory: string): Promise<string[]> => {
	try {
		if (!directory || !fs.existsSync(directory)) {
			return [];
		}
		const all: string[] = fs.readdirSync(directory);
		const files: string[] = all.filter((f: string) => {
			try {
				return fs.statSync(path.join(directory, f)).isFile();
			} catch {
				return false;
			}
		});
		return files;
	} catch {
		return [];
	}
});

ipcMain.handle('rename-files', async (_event, args: RenameArgs): Promise<boolean> => {
	const { directory, files, search, replace } = args;
	for (const file of files) {
		if (search && file.includes(search)) {
			const newName = file.replaceAll(search, replace);
			if (newName !== file) {
				fs.renameSync(path.join(directory, file), path.join(directory, newName));
			}
		}
	}
	return true;
});

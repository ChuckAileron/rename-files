import { RenameArgs } from './types';

export async function listFiles(directory: string): Promise<string[]> {
  // @ts-expect-error electronAPI no está tipado
  return window.electronAPI.listFiles(directory) as Promise<string[]>;
}

export async function renameFiles(
  directory: string,
  files: string[],
  search: string,
  replace: string,
): Promise<void> {
  const args: RenameArgs = { directory, files, search, replace };
  // @ts-expect-error electronAPI no está tipado
  await window.electronAPI.renameFiles(args);
}

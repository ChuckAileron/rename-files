import { RenameArgs } from './types';

export async function listFiles(directory: string): Promise<string[]> {
  // @ts-ignore
  return window.electronAPI.listFiles(directory) as Promise<string[]>;
}

export async function renameFiles(
  directory: string,
  files: string[],
  search: string,
  replace: string
): Promise<void> {
  const args: RenameArgs = { directory, files, search, replace };
  // @ts-ignore
  await window.electronAPI.renameFiles(args);
}

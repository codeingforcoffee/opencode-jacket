import { ipcMain, BrowserWindow, dialog } from 'electron';
import { readFile } from 'fs/promises';
import { IPC } from '@shared';
import { getOpenCodeClient } from '../opencode-client';

export function registerFileIPC(): void {
  ipcMain.handle(
    IPC.OPENCODE_FILE_READ,
    async (_, params: { path: string; directory?: string }) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const res = await c.file.read({ path: params.path, directory: params.directory });
        const data = res?.data as { type?: string; content?: string } | undefined;
        return { data: data?.content ?? null };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  ipcMain.handle(
    IPC.OPENCODE_FIND_FILES,
    async (
      _,
      params?: { query?: string; type?: 'file' | 'directory'; limit?: number; directory?: string }
    ) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const res = await c.find.files({
          query: params?.query ?? '*',
          type: params?.type,
          limit: params?.limit ?? 50,
          directory: params?.directory,
        });
        const data = res?.data as string[] | undefined;
        return { data: data ?? [] };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  ipcMain.handle(IPC.OPENCODE_PROJECT_CURRENT, async (_, directory?: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.project.current({ directory });
      return { data: res?.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.PROJECT_LIST, async (_, directory?: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.project.list({ directory });
      return { data: res?.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.PATH_GET, async (_, directory?: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.path.get({ directory });
      return { data: res?.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.FILE_PICK_AND_READ, async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!win) return { error: 'No window' };
    try {
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        title: '选择要附加的文件',
      });
      if (result.canceled || !result.filePaths.length) {
        return { data: [] };
      }
      const files: Array<{ name: string; path: string; content: string }> = [];
      for (const filePath of result.filePaths) {
        try {
          const content = await readFile(filePath, 'utf-8');
          const name = filePath.split(/[/\\]/).pop() ?? filePath;
          files.push({ name, path: filePath, content });
        } catch {
          // 跳过无法以 UTF-8 读取的二进制文件
        }
      }
      return { data: files };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
}

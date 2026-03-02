import { ipcMain } from 'electron';
import { IPC } from '@shared';
import { getOpenCodeClient } from '../opencode-client';
import { withTimeout } from '../utils/with-timeout';

export function registerSessionIPC(): void {
  ipcMain.handle(IPC.OPENCODE_SESSION_CREATE, async (_, body?: { title?: string }) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.session.create({ title: body?.title });
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.OPENCODE_SESSION_LIST, async (_, directory?: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const queryDirectory = directory?.trim();
      const res = await c.session.list(
        queryDirectory
          ? { directory: queryDirectory.replace(/\\/g, '/').replace(/\/+$/, '') || '/' }
          : undefined
      );
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.OPENCODE_SESSION_GET, async (_, id: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.session.get({ sessionID: id });
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.OPENCODE_SESSION_UPDATE,
    async (_, params: { sessionId: string; title?: string }) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      const { sessionId, title } = params;
      try {
        const res = await c.session.update({ sessionID: sessionId, title });
        return { data: res.data };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  ipcMain.handle(IPC.OPENCODE_SESSION_DELETE, async (_, id: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.session.delete({ sessionID: id });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.OPENCODE_SESSION_MESSAGES, async (_, sessionId: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await withTimeout(
        c.session.messages({ sessionID: sessionId }),
        12000,
        'session.messages'
      );
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.SESSION_SUMMARIZE, async (_, sessionId: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.session.summarize({ sessionID: sessionId });
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
}

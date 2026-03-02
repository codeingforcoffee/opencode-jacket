import { ipcMain } from 'electron';
import { IPC } from '@shared';
import { getOpenCodeClient } from '../opencode-client';

export function registerCommandIPC(): void {
  ipcMain.handle(IPC.COMMAND_LIST, async (_, directory?: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.command.list({ directory });
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.SESSION_COMMAND,
    async (
      _,
      params: {
        sessionId: string;
        command: string;
        arguments?: string;
      }
    ) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const res = await c.session.command({
          sessionID: params.sessionId,
          command: params.command,
          arguments: params.arguments,
        });
        return { data: res.data };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );
}

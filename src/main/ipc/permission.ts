import { ipcMain } from 'electron';
import { IPC } from '@shared';
import { getOpenCodeClient, permissionReply } from '../opencode-client';

export function registerPermissionIPC(): void {
  ipcMain.handle(
    IPC.PERMISSION_REPLY,
    async (_, requestID: string, reply: 'once' | 'always' | 'reject') => {
      try {
        await permissionReply(requestID, reply);
        return { success: true };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  ipcMain.handle(IPC.QUESTION_REPLY, async (_, requestID: string, answers: string[][]) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.question.reply({ requestID, answers });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.QUESTION_REJECT, async (_, requestID: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.question.reject({ requestID });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
}

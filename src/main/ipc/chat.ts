import { ipcMain } from 'electron';
import { IPC } from '@shared';
import { getOpenCodeClient } from '../opencode-client';

export function registerChatIPC(): void {
  ipcMain.handle(IPC.OPENCODE_SESSION_ABORT, async (_, sessionId: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.session.abort({ sessionID: sessionId });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.OPENCODE_PROMPT,
    async (
      _,
      params: {
        sessionId: string;
        parts: Array<{ type: string; text?: string }>;
        model?: { providerID?: string; modelID?: string };
      }
    ) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const model =
          params.model?.providerID && params.model?.modelID
            ? { providerID: params.model.providerID, modelID: params.model.modelID }
            : undefined;
        const res = await c.session.promptAsync({
          sessionID: params.sessionId,
          parts: params.parts.map((p) => ({ type: 'text' as const, text: p.text ?? '' })),
          model,
        });
        return { data: res.data };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );
}

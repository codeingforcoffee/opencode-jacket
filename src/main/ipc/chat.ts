import { ipcMain } from 'electron';
import { IPC } from '@shared';
import { getOpenCodeClient } from '../opencode-client';

async function getMcpSystemPrompt(
  c: NonNullable<ReturnType<typeof getOpenCodeClient>>
): Promise<string | undefined> {
  try {
    const res = await c.mcp.status();
    const statusMap = res.data as Record<string, { status?: string }> | undefined;
    if (!statusMap) return undefined;
    const hasConnected = Object.values(statusMap).some((s) => s?.status === 'connected');
    return hasConnected
      ? '已连接 MCP 工具，当涉及业务操作时请优先调用 MCP 工具而非仅基于代码回答。'
      : undefined;
  } catch {
    return undefined;
  }
}

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
        system?: string;
      }
    ) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const model =
          params.model?.providerID && params.model?.modelID
            ? { providerID: params.model.providerID, modelID: params.model.modelID }
            : undefined;
        const system = params.system !== undefined ? params.system : await getMcpSystemPrompt(c);
        const res = await c.session.promptAsync({
          sessionID: params.sessionId,
          parts: params.parts.map((p) => ({ type: 'text' as const, text: p.text ?? '' })),
          model,
          system,
        });
        return { data: res.data };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );
}

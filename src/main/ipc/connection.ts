import { ipcMain } from 'electron';
import { IPC, IPC_EVENTS } from '@shared';
import {
  startOpenCode,
  disconnectOpenCode,
  healthCheck,
  getOpenCodeClient,
} from '../opencode-client';
import { flushChunkBuffer } from '../utils/chunk-buffer';
import { withTimeout } from '../utils/with-timeout';
import { UiConsole } from '../utils/debug-console';

type SendToRenderer = (channel: string, ...args: unknown[]) => void;

export function registerConnectionIPC(
  sendToRenderer: SendToRenderer,
  initStatus: { done: boolean; percent?: number; message?: string }
): void {
  ipcMain.handle(IPC.INIT_GET_STATUS, () => Promise.resolve(initStatus));

  ipcMain.handle(
    IPC.OPENCODE_CONNECT,
    async (_, options?: { hostname?: string; port?: number }) => {
      try {
        await startOpenCode(options ?? {});
        sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: true });
        return { success: true };
      } catch (err) {
        sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: false });
        return { success: false, error: (err as Error).message };
      }
    }
  );

  ipcMain.handle(IPC.OPENCODE_HEALTH, async () => {
    return withTimeout(healthCheck(), 3000, 'health');
  });

  ipcMain.handle(IPC.OPENCODE_DISCONNECT, async () => {
    flushChunkBuffer();
    await disconnectOpenCode();
    sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: false });
    return { success: true };
  });

  ipcMain.handle(IPC.CONFIG_GET, async () => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.config.get();
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.CONFIG_PROVIDERS, async () => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.config.providers();
      UiConsole.log('🍕🍕 ~ ipcMain.handle(IPC.CONFIG_PROVIDERS) ~ res:', res);
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
}

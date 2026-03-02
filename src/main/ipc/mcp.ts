import { ipcMain } from 'electron';
import { IPC } from '@shared';
import { getOpenCodeClient } from '../opencode-client';
import { listMcp, addMcp, removeMcp } from '../mcp';

export function registerMcpIPC(): void {
  ipcMain.handle(IPC.MCP_LIST, async () => {
    try {
      const items = await listMcp();
      return { data: items };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_ADD, async (_, name: string, config: Record<string, unknown>) => {
    try {
      const result = await addMcp(name, config);
      // 触发引擎配置重载
      const c = getOpenCodeClient();
      if (c) {
        try {
          await c.config.get();
        } catch {
          // 忽略重载错误
        }
      }
      return { data: result };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_REMOVE, async (_, name: string) => {
    try {
      const ok = await removeMcp(name);
      // 触发引擎配置重载
      const c = getOpenCodeClient();
      if (c) {
        try {
          await c.config.get();
        } catch {
          // 忽略重载错误
        }
      }
      return { success: ok };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
}

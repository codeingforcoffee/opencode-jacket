import { spawn } from 'child_process';
import { ipcMain } from 'electron';
import { IPC } from '@shared';
import { getOpenCodeClient } from '../opencode-client';
import { listMcp, addMcp, removeMcp, toggleMcpEnabled } from '../mcp';

function mcpDebug(channel: string, ...args: unknown[]): void {
  console.log('[mcp-debug]', channel, ...args);
}

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
    mcpDebug('MCP_ADD', { name, config });
    try {
      const result = await addMcp(name, config);
      const c = getOpenCodeClient();
      if (c) {
        try {
          await c.mcp.connect({ name });
        } catch {
          // 忽略连接错误
        }
      }
      return { data: result };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_TOGGLE, async (_, name: string, enabled: boolean) => {
    mcpDebug('MCP_TOGGLE', { name, enabled });
    try {
      await toggleMcpEnabled(name, enabled);
      const c = getOpenCodeClient();
      if (c) {
        try {
          if (enabled) {
            await c.mcp.connect({ name });
          } else {
            await c.mcp.disconnect({ name });
          }
        } catch (err) {
          console.error('[opencode-debug] MCP_TOGGLE mcp.connect error:', err);
        }
        try {
          await c.config.get();
        } catch (err) {
          console.error('[opencode-debug] MCP_TOGGLE config.get error:', err);
        }
      }
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_STATUS, async () => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.mcp.status();
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_RECONNECT, async (_, name: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.mcp.disconnect({ name });
      await c.mcp.connect({ name });
      await c.config.get();
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_AUTH_START, async (_, name: string) => {
    try {
      const cmd = name
        ? `opencode mcp auth ${/[\s"]/.test(name) ? `"${name.replace(/"/g, '\\"')}"` : name}`
        : 'opencode mcp auth';

      if (process.platform === 'darwin') {
        const escaped = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        spawn('osascript', ['-e', `tell application "Terminal" to do script "${escaped}"`], {
          detached: true,
        });
      } else if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', 'cmd', '/k', cmd], { detached: true, shell: true });
      } else {
        spawn(cmd, [], { detached: true, shell: true });
      }
      return { data: { viaCli: true } };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_AUTH_REMOVE, async (_, name: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.mcp.auth.remove({ name });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.MCP_REMOVE, async (_, name: string) => {
    try {
      const ok = await removeMcp(name);
      const c = getOpenCodeClient();
      if (c) {
        try {
          await c.mcp.disconnect({ name });
        } catch {
          // 忽略断开错误
        }
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

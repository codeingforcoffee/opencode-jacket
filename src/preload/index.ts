import { contextBridge, ipcRenderer } from 'electron';
import { IPC, IPC_EVENTS } from '@shared';

const opencodeAPI = {
  connect: (options?: { hostname?: string; port?: number }) =>
    ipcRenderer.invoke(IPC.OPENCODE_CONNECT, options),
  disconnect: () => ipcRenderer.invoke(IPC.OPENCODE_DISCONNECT),
  health: () => ipcRenderer.invoke(IPC.OPENCODE_HEALTH),
  sessionCreate: (body?: { title?: string }) =>
    ipcRenderer.invoke(IPC.OPENCODE_SESSION_CREATE, body),
  sessionList: () => ipcRenderer.invoke(IPC.OPENCODE_SESSION_LIST),
  sessionGet: (id: string) => ipcRenderer.invoke(IPC.OPENCODE_SESSION_GET, id),
  sessionUpdate: (params: { sessionId: string; title?: string }) =>
    ipcRenderer.invoke(IPC.OPENCODE_SESSION_UPDATE, params),
  sessionDelete: (id: string) => ipcRenderer.invoke(IPC.OPENCODE_SESSION_DELETE, id),
  sessionMessages: (sessionId: string) =>
    ipcRenderer.invoke(IPC.OPENCODE_SESSION_MESSAGES, sessionId),
  mcpList: () => ipcRenderer.invoke(IPC.MCP_LIST),
  mcpAdd: (name: string, config: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC.MCP_ADD, name, config),
  mcpRemove: (name: string) => ipcRenderer.invoke(IPC.MCP_REMOVE, name),
  prompt: (params: {
    sessionId: string;
    parts: Array<{ type: string; text?: string }>;
    model?: { providerID?: string; modelID?: string };
  }) => ipcRenderer.invoke(IPC.OPENCODE_PROMPT, params),
  onEvent: (callback: (event: unknown) => void) => {
    const fn = (_: unknown, event: unknown) => callback(event);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_EVENT, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_EVENT, fn);
  },
  onChunk: (callback: (text: string) => void) => {
    const fn = (_: unknown, text: string) => callback(text);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_CHUNK, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_CHUNK, fn);
  },
  onConnectionStatus: (callback: (status: { connected: boolean }) => void) => {
    const fn = (_: unknown, status: { connected: boolean }) => callback(status);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, fn);
  },
  initGetStatus: () => ipcRenderer.invoke(IPC.INIT_GET_STATUS),
  onInitProgress: (callback: (payload: { percent: number; message: string }) => void) => {
    const fn = (_: unknown, payload: { percent: number; message: string }) => callback(payload);
    ipcRenderer.on(IPC_EVENTS.INIT_PROGRESS, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.INIT_PROGRESS, fn);
  },
  onInitDone: (callback: () => void) => {
    const fn = () => callback();
    ipcRenderer.on(IPC_EVENTS.INIT_DONE, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.INIT_DONE, fn);
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('opencode', opencodeAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  (window as unknown as { opencode: typeof opencodeAPI }).opencode = opencodeAPI;
}

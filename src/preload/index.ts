import { contextBridge, ipcRenderer } from 'electron';
import { IPC, IPC_EVENTS } from '@shared';

const opencodeAPI = {
  connect: (options?: { hostname?: string; port?: number }) =>
    ipcRenderer.invoke(IPC.OPENCODE_CONNECT, options),
  disconnect: () => ipcRenderer.invoke(IPC.OPENCODE_DISCONNECT),
  health: () => ipcRenderer.invoke(IPC.OPENCODE_HEALTH),
  sessionCreate: (body?: { title?: string }) =>
    ipcRenderer.invoke(IPC.OPENCODE_SESSION_CREATE, body),
  sessionList: (directory?: string) => ipcRenderer.invoke(IPC.OPENCODE_SESSION_LIST, directory),
  sessionGet: (id: string) => ipcRenderer.invoke(IPC.OPENCODE_SESSION_GET, id),
  sessionUpdate: (params: { sessionId: string; title?: string }) =>
    ipcRenderer.invoke(IPC.OPENCODE_SESSION_UPDATE, params),
  sessionDelete: (id: string) => ipcRenderer.invoke(IPC.OPENCODE_SESSION_DELETE, id),
  sessionMessages: (sessionId: string) =>
    ipcRenderer.invoke(IPC.OPENCODE_SESSION_MESSAGES, sessionId),
  sessionSummarize: (sessionId: string) => ipcRenderer.invoke(IPC.SESSION_SUMMARIZE, sessionId),
  mcpList: () => ipcRenderer.invoke(IPC.MCP_LIST),
  mcpAdd: (name: string, config: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC.MCP_ADD, name, config),
  mcpToggle: (name: string, enabled: boolean) => ipcRenderer.invoke(IPC.MCP_TOGGLE, name, enabled),
  mcpStatus: () => ipcRenderer.invoke(IPC.MCP_STATUS),
  mcpAuthStart: (name: string) => ipcRenderer.invoke(IPC.MCP_AUTH_START, name),
  mcpAuthRemove: (name: string) => ipcRenderer.invoke(IPC.MCP_AUTH_REMOVE, name),
  mcpReconnect: (name: string) => ipcRenderer.invoke(IPC.MCP_RECONNECT, name),
  mcpRemove: (name: string) => ipcRenderer.invoke(IPC.MCP_REMOVE, name),
  prompt: (params: {
    sessionId: string;
    parts: Array<{ type: string; text?: string }>;
    model?: { providerID?: string; modelID?: string };
    system?: string;
  }) => ipcRenderer.invoke(IPC.OPENCODE_PROMPT, params),
  sessionAbort: (sessionId: string) => ipcRenderer.invoke(IPC.OPENCODE_SESSION_ABORT, sessionId),
  fileRead: (params: { path: string; directory?: string }) =>
    ipcRenderer.invoke(IPC.OPENCODE_FILE_READ, params),
  findFiles: (params?: {
    query?: string;
    type?: 'file' | 'directory';
    limit?: number;
    directory?: string;
  }) => ipcRenderer.invoke(IPC.OPENCODE_FIND_FILES, params),
  projectCurrent: (directory?: string) =>
    ipcRenderer.invoke(IPC.OPENCODE_PROJECT_CURRENT, directory),
  projectList: (directory?: string) => ipcRenderer.invoke(IPC.PROJECT_LIST, directory),
  pathGet: (directory?: string) => ipcRenderer.invoke(IPC.PATH_GET, directory),
  filePickAndRead: () => ipcRenderer.invoke(IPC.FILE_PICK_AND_READ),
  permissionReply: (requestID: string, reply: 'once' | 'always' | 'reject') =>
    ipcRenderer.invoke(IPC.PERMISSION_REPLY, requestID, reply),
  questionReply: (requestID: string, answers: string[][]) =>
    ipcRenderer.invoke(IPC.QUESTION_REPLY, requestID, answers),
  questionReject: (requestID: string) => ipcRenderer.invoke(IPC.QUESTION_REJECT, requestID),
  commandList: (directory?: string) => ipcRenderer.invoke(IPC.COMMAND_LIST, directory),
  sessionCommand: (params: { sessionId: string; command: string; arguments?: string }) =>
    ipcRenderer.invoke(IPC.SESSION_COMMAND, params),
  configGet: () => ipcRenderer.invoke(IPC.CONFIG_GET),
  configProviders: () => ipcRenderer.invoke(IPC.CONFIG_PROVIDERS),
  onEvent: (callback: (event: unknown) => void) => {
    const fn = (_: unknown, event: unknown) => callback(event);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_EVENT, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_EVENT, fn);
  },
  onChunk: (callback: (sessionId: string, text: string) => void) => {
    const fn = (_: unknown, sessionId: string, text: string) => callback(sessionId, text);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_CHUNK, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_CHUNK, fn);
  },
  onConnectionStatus: (callback: (status: { connected: boolean }) => void) => {
    const fn = (_: unknown, status: { connected: boolean }) => callback(status);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, fn);
  },
  onPermission: (
    callback: (request: {
      requestID: string;
      tool?: string;
      filename?: string;
      reason?: string;
      sessionID?: string;
    }) => void
  ) => {
    const fn = (
      _: unknown,
      request: {
        requestID: string;
        tool?: string;
        filename?: string;
        reason?: string;
        sessionID?: string;
      }
    ) => callback(request);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_PERMISSION, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_PERMISSION, fn);
  },
  onQuestion: (
    callback: (request: {
      requestID: string;
      sessionID?: string;
      questions: Array<{
        question: string;
        header: string;
        options: Array<{ label: string; description: string }>;
        multiple?: boolean;
        custom?: boolean;
      }>;
    }) => void
  ) => {
    const fn = (_: unknown, request: Parameters<typeof callback>[0]) => callback(request);
    ipcRenderer.on(IPC_EVENTS.OPENCODE_QUESTION, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.OPENCODE_QUESTION, fn);
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
  onDebugLog: (
    callback: (entry: { level: string; message: string; timestamp: string }) => void
  ) => {
    const fn = (_: unknown, entry: { level: string; message: string; timestamp: string }) =>
      callback(entry);
    ipcRenderer.on(IPC_EVENTS.DEBUG_LOG, fn);
    return () => ipcRenderer.removeListener(IPC_EVENTS.DEBUG_LOG, fn);
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

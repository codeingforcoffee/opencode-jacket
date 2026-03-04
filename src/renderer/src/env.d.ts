/// <reference types="vite/client" />

interface OpenCodeAPI {
  connect: (options?: {
    hostname?: string;
    port?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<{ success: boolean }>;
  health: () => Promise<{ healthy: boolean; version?: string }>;
  sessionCreate: (body?: { title?: string }) => Promise<{ data?: unknown; error?: string }>;
  sessionList: (directory?: string) => Promise<{ data?: unknown; error?: string }>;
  sessionGet: (id: string) => Promise<{ data?: unknown; error?: string }>;
  sessionUpdate: (params: { sessionId: string; title?: string }) => Promise<{
    data?: unknown;
    error?: string;
  }>;
  sessionDelete: (id: string) => Promise<{ success?: boolean; error?: string }>;
  sessionMessages: (sessionId: string) => Promise<{
    data?: Array<{ info: { role?: string }; parts: Array<{ type?: string; text?: string }> }>;
    error?: string;
  }>;
  sessionSummarize: (sessionId: string) => Promise<{ data?: unknown; error?: string }>;
  mcpList: () => Promise<{ data?: unknown; error?: string }>;
  mcpAdd: (
    name: string,
    config: Record<string, unknown>
  ) => Promise<{
    data?: unknown;
    error?: string;
  }>;
  mcpToggle: (name: string, enabled: boolean) => Promise<{ success?: boolean; error?: string }>;
  mcpStatus: () => Promise<{ data?: Record<string, unknown>; error?: string }>;
  mcpAuthStart: (
    name: string
  ) => Promise<{ data?: { authorizationUrl?: string; viaCli?: boolean }; error?: string }>;
  mcpReconnect: (name: string) => Promise<{ success?: boolean; error?: string }>;
  mcpAuthRemove: (name: string) => Promise<{ success?: boolean; error?: string }>;
  mcpRemove: (name: string) => Promise<{ success?: boolean; error?: string }>;
  prompt: (params: {
    sessionId: string;
    parts: Array<{ type: string; text?: string }>;
    model?: { providerID?: string; modelID?: string };
    system?: string;
  }) => Promise<{ data?: unknown; error?: string }>;
  sessionAbort: (sessionId: string) => Promise<{ success?: boolean; error?: string }>;
  fileRead: (params: { path: string; directory?: string }) => Promise<{
    data?: string | null;
    error?: string;
  }>;
  findFiles: (params?: {
    query?: string;
    type?: 'file' | 'directory';
    limit?: number;
    directory?: string;
  }) => Promise<{ data?: string[]; error?: string }>;
  projectCurrent: (directory?: string) => Promise<{ data?: unknown; error?: string }>;
  projectList: (directory?: string) => Promise<{ data?: unknown; error?: string }>;
  pathGet: (directory?: string) => Promise<{ data?: unknown; error?: string }>;
  filePickAndRead: () => Promise<{
    data?: Array<{ name: string; path: string; content: string }>;
    error?: string;
  }>;
  permissionReply: (
    requestID: string,
    reply: 'once' | 'always' | 'reject'
  ) => Promise<{ success?: boolean; error?: string }>;
  questionReply: (
    requestID: string,
    answers: string[][]
  ) => Promise<{ success?: boolean; error?: string }>;
  questionReject: (requestID: string) => Promise<{ success?: boolean; error?: string }>;
  commandList: (directory?: string) => Promise<{
    data?: Array<{ name: string; description?: string; source?: string; hints: string[] }>;
    error?: string;
  }>;
  sessionCommand: (params: {
    sessionId: string;
    command: string;
    arguments?: string;
  }) => Promise<{ data?: unknown; error?: string }>;
  configGet: () => Promise<{ data?: unknown; error?: string }>;
  configProviders: () => Promise<{ data?: unknown; error?: string }>;
  onEvent: (callback: (event: unknown) => void) => () => void;
  onChunk: (callback: (sessionId: string, text: string) => void) => () => void;
  onConnectionStatus: (callback: (status: { connected: boolean }) => void) => () => void;
  onPermission: (
    callback: (request: {
      requestID: string;
      tool?: string;
      filename?: string;
      reason?: string;
      sessionID?: string;
    }) => void
  ) => () => void;
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
  ) => () => void;
  initGetStatus: () => Promise<{ done: boolean; percent?: number; message?: string }>;
  onInitProgress: (callback: (payload: { percent: number; message: string }) => void) => () => void;
  onInitDone: (callback: () => void) => () => void;
  onDebugLog: (
    callback: (entry: { level: string; message: string; timestamp: string }) => void
  ) => () => void;
}

declare global {
  interface Window {
    opencode: OpenCodeAPI;
  }
}

export {};

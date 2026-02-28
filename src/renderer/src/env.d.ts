/// <reference types="vite/client" />

interface OpenCodeAPI {
  connect: (options?: {
    hostname?: string;
    port?: number;
    baseUrl?: string;
    clientOnly?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<{ success: boolean }>;
  health: () => Promise<{ healthy: boolean; version?: string }>;
  sessionCreate: (body?: { title?: string }) => Promise<{ data?: unknown; error?: string }>;
  sessionList: () => Promise<{ data?: unknown; error?: string }>;
  sessionGet: (id: string) => Promise<{ data?: unknown; error?: string }>;
  sessionDelete: (id: string) => Promise<{ success?: boolean; error?: string }>;
  prompt: (params: {
    sessionId: string;
    parts: Array<{ type: string; text?: string }>;
    model?: { providerID?: string; modelID?: string };
  }) => Promise<{ data?: unknown; error?: string }>;
  shell: (params: {
    sessionId: string;
    body: Record<string, unknown>;
  }) => Promise<{ data?: unknown; error?: string }>;
  command: (params: {
    sessionId: string;
    body: Record<string, unknown>;
  }) => Promise<{ data?: unknown; error?: string }>;
  abort: (sessionId: string) => Promise<{ success?: boolean; error?: string }>;
  onEvent: (callback: (event: unknown) => void) => () => void;
  onChunk: (callback: (text: string) => void) => () => void;
  onConnectionStatus: (callback: (status: { connected: boolean }) => void) => () => void;
  initGetStatus: () => Promise<{ done: boolean; percent?: number; message?: string }>;
  onInitProgress: (callback: (payload: { percent: number; message: string }) => void) => () => void;
  onInitDone: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    opencode: OpenCodeAPI;
  }
}

export {};

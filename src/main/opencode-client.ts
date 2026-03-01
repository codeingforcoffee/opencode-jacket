/**
 * OpenCode SDK 封装 - 连接本地已运行的 OpenCode 服务
 */
import { createOpencodeClient } from '@opencode-ai/sdk/v2';

export type OpenCodeClient = Awaited<ReturnType<typeof createOpencodeClient>>;

export interface OpenCodeConnectionOptions {
  hostname?: string;
  port?: number;
}

let client: OpenCodeClient | null = null;
let eventAbortController: AbortController | null = null;

export type EventCallback = (event: unknown) => void;

const eventCallbacks: Set<EventCallback> = new Set();

/**
 * 连接本地已运行的 OpenCode 服务
 */
export async function connectOpenCode(
  options: OpenCodeConnectionOptions = {}
): Promise<OpenCodeClient> {
  if (client) {
    return client;
  }

  const hostname = options.hostname ?? '127.0.0.1';
  const port = options.port ?? 4096;
  const baseUrl = `http://${hostname}:${port}`;

  client = createOpencodeClient({ baseUrl });

  // 订阅 SSE 事件流，与 OpenWork 架构一致（ARCHITECTURE.md: client.event.subscribe）
  try {
    const events = await client.event.subscribe();
    eventAbortController = new AbortController();
    (async () => {
      if (!events?.stream) return;
      for await (const event of events.stream) {
        if (eventAbortController?.signal.aborted) break;
        eventCallbacks.forEach((cb) => cb(event));
      }
    })().catch((err) => {
      if (eventAbortController?.signal.aborted) return;
      console.error('[opencode-client] Event stream error:', err);
    });
  } catch (err) {
    console.warn('[opencode-client] Event subscribe failed:', err);
  }

  return client;
}

/**
 * 断开连接
 */
export function disconnectOpenCode(): void {
  if (eventAbortController) {
    eventAbortController.abort();
    eventAbortController = null;
  }
  eventCallbacks.clear();
  client = null;
}

/**
 * 获取当前客户端（需先 connect）
 */
export function getOpenCodeClient(): OpenCodeClient | null {
  return client;
}

/**
 * 订阅 OpenCode 事件流
 */
export function subscribeEvents(callback: EventCallback): () => void {
  eventCallbacks.add(callback);
  return () => eventCallbacks.delete(callback);
}

/**
 * 健康检查（client.global.health()）
 */
export async function healthCheck(): Promise<{ healthy: boolean; version?: string }> {
  const c = getOpenCodeClient();
  if (!c) {
    return { healthy: false };
  }
  try {
    const res = await c.global.health();
    const data = res?.data as { healthy?: boolean; version?: string } | undefined;
    return {
      healthy: data?.healthy ?? true,
      version: data?.version,
    };
  } catch {
    return { healthy: false };
  }
}

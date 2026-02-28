/**
 * OpenCode SDK 封装 - 优先使用打包的 opencode-ai
 */
import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk/v2';
import { createBundledOpencodeServer } from './opencode-server-bundled';
import { hasBundledOpencode } from './opencode-bundled';

export type OpenCodeClient = Awaited<ReturnType<typeof createOpencode>>['client'];
type OpenCodeServer = { url: string; close: () => void };

export interface OpenCodeConnectionOptions {
  hostname?: string;
  port?: number;
  timeout?: number;
  config?: { model?: string };
}

let client: OpenCodeClient | null = null;
let server: OpenCodeServer | null = null;
let eventAbortController: AbortController | null = null;

export type EventCallback = (event: unknown) => void;

const eventCallbacks: Set<EventCallback> = new Set();

/**
 * 初始化 OpenCode 连接
 * 优先使用打包的 opencode-ai，不可用时回退到 PATH 中的 opencode
 */
export async function connectOpenCode(
  options: OpenCodeConnectionOptions = {}
): Promise<OpenCodeClient> {
  if (client) {
    return client;
  }

  const { hostname = '127.0.0.1', port = 4096, timeout = 5000, config } = options;

  if (hasBundledOpencode()) {
    try {
      const serverResult = await createBundledOpencodeServer({
        hostname,
        port,
        timeout,
        config
      });
      server = serverResult;
      client = createOpencodeClient({ baseUrl: serverResult.url });
    } catch (err) {
      console.warn('[opencode-client] 打包版本启动失败，尝试 PATH:', (err as Error).message);
    }
  }

  if (!client) {
    const opencode = await createOpencode({ hostname, port, timeout, config });
    client = opencode.client;
    server = opencode.server;
  }

  // 订阅 SSE 事件流，转发给渲染进程（与 OpenWork 一致）
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
  if (server) {
    server.close();
    server = null;
  }
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

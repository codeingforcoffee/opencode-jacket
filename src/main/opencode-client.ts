/**
 * OpenCode SDK 封装 - 启动 OpenCode 服务并建立客户端连接
 */
import { createOpencode } from '@opencode-ai/sdk/v2';

export type OpenCodeClient = Awaited<ReturnType<typeof createOpencode>>['client'];
export type OpenCodeServer = Awaited<ReturnType<typeof createOpencode>>['server'];

export interface OpenCodeStartOptions {
  hostname?: string;
  port?: number;
  timeout?: number;
}

let client: OpenCodeClient | null = null;
let server: OpenCodeServer | null = null;
let eventAbortController: AbortController | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_ATTEMPTS = 10;

export type EventCallback = (event: unknown) => void;

const eventCallbacks: Set<EventCallback> = new Set();

async function startEventSubscription(): Promise<void> {
  const c = client;
  if (!c) return;

  eventAbortController = new AbortController();
  const controller = eventAbortController;

  try {
    const events = await c.event.subscribe();
    reconnectAttempt = 0;

    if (!events?.stream) {
      return;
    }

    for await (const event of events.stream) {
      if (controller.signal.aborted) break;
      eventCallbacks.forEach((cb) => cb(event));
    }

    // 流正常结束，尝试重连
    if (!controller.signal.aborted && client) {
      scheduleReconnect();
    }
  } catch (err) {
    if (controller.signal.aborted) return;

    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('abort')) return;

    console.error('[opencode-client] Event stream error:', message);
    if (client) scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (!client) return;

  eventAbortController?.abort();
  eventAbortController = null;

  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    console.warn(`[opencode-client] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    return;
  }

  reconnectAttempt += 1;
  const delay = Math.min(1000 * 2 ** (reconnectAttempt - 1), 30000);

  console.log(
    `[opencode-client] Reconnecting in ${delay}ms (attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void startEventSubscription();
  }, delay);
}

/**
 * 启动 OpenCode 服务并建立连接
 */
export async function startOpenCode(
  options: OpenCodeStartOptions = {},
  onProgress?: (percent: number, message: string) => void
): Promise<OpenCodeClient> {
  if (client) {
    return client;
  }

  onProgress?.(10, '启动 OpenCode 服务...');

  const result = await createOpencode({
    hostname: options.hostname ?? '127.0.0.1',
    port: options.port ?? 4096,
    timeout: options.timeout ?? 30000,
  });

  client = result.client;
  server = result.server;

  onProgress?.(80, '连接已建立，订阅事件流...');

  try {
    void startEventSubscription();
  } catch (err) {
    console.warn('[opencode-client] Event subscribe failed:', err);
  }

  onProgress?.(100, '完成');

  return client;
}

/**
 * 断开连接并关闭服务
 */
export async function disconnectOpenCode(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempt = 0;

  eventAbortController?.abort();
  eventAbortController = null;
  eventCallbacks.clear();
  client = null;

  if (server) {
    const s = server;
    server = null;
    await s.close();
  }
}

/**
 * 获取当前客户端（需先 startOpenCode）
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
export async function healthCheck(): Promise<{
  healthy: boolean;
  version?: string;
}> {
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

/**
 * 回复权限请求
 */
export async function permissionReply(
  requestID: string,
  reply: 'once' | 'always' | 'reject'
): Promise<void> {
  const c = getOpenCodeClient();
  if (!c) throw new Error('Not connected');
  await c.permission.reply({ requestID, reply });
}

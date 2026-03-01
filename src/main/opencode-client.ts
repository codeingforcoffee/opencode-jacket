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
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const DEBUG = true; // 排查用，可改为 false 关闭

export type EventCallback = (event: unknown) => void;

const eventCallbacks: Set<EventCallback> = new Set();

async function startEventSubscription(): Promise<void> {
  const c = client;
  if (!c) return;

  eventAbortController = new AbortController();
  const controller = eventAbortController;

  try {
    if (DEBUG) console.log('[opencode-debug] event.subscribe() 开始');
    const events = await c.event.subscribe();
    reconnectAttempt = 0;

    if (!events?.stream) {
      if (DEBUG) console.warn('[opencode-debug] events.stream 为空');
      return;
    }
    if (DEBUG) console.log('[opencode-debug] event stream 已连接');

    let eventCount = 0;
    for await (const event of events.stream) {
      if (controller.signal.aborted) break;
      eventCount++;
      if (DEBUG && eventCount <= 3) {
        const ev = event as { type?: string };
        console.log('[opencode-debug] 收到事件 #' + eventCount, ev?.type ?? '(无type)');
      }
      eventCallbacks.forEach((cb) => cb(event));
    }

    if (DEBUG) console.log('[opencode-debug] stream 结束, 共', eventCount, '个事件');

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

  try {
    await startEventSubscription();
  } catch (err) {
    console.warn('[opencode-client] Event subscribe failed:', err);
  }

  return client;
}

/**
 * 断开连接
 */
export function disconnectOpenCode(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempt = 0;
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

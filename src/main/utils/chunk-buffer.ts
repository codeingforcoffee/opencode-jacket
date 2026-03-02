/**
 * Chunk 批处理 - 合并流式文本块，减少 IPC 调用与渲染压力
 */
const CHUNK_FLUSH_INTERVAL_MS = 16;
const DEBUG = false; // 排查用

type FlushCallback = (sessionId: string, text: string) => void;

const buffer = new Map<string, string[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sendToRenderer: FlushCallback = () => {};

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (buffer.size === 0) return;

  for (const [sessionId, chunks] of buffer) {
    if (chunks.length > 0) {
      const joined = chunks.join('');
      if (DEBUG)
        console.log(
          '[opencode-debug] chunk-buffer flush, sessionId=',
          sessionId,
          'len=',
          joined.length
        );
      sendToRenderer(sessionId, joined);
    }
  }
  buffer.clear();
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, CHUNK_FLUSH_INTERVAL_MS);
}

/**
 * 初始化 chunk 缓冲，传入发送函数
 */
export function initChunkBuffer(send: FlushCallback): void {
  sendToRenderer = send;
}

/**
 * 将 chunk 加入缓冲，按 sessionId 合并后批量发送
 */
export function pushChunk(sessionId: string, text: string): void {
  if (!text) return;

  const list = buffer.get(sessionId);
  if (list) {
    list.push(text);
  } else {
    buffer.set(sessionId, [text]);
  }
  scheduleFlush();
}

/**
 * 立即刷新缓冲（如断开连接前）
 */
export function flushChunkBuffer(): void {
  flush();
}

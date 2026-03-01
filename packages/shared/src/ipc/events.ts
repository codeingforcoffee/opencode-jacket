/**
 * 主进程 send → 渲染进程 on（事件流）
 */

export const IPC_EVENTS = {
  // 来自 client.event.subscribe() 的原始事件
  OPENCODE_EVENT: 'RENDERER_OPENCODE_EVENT',
  // 解析事件中的流式文本块
  OPENCODE_CHUNK: 'RENDERER_OPENCODE_CHUNK',
  // 连接状态变化
  OPENCODE_CONNECTION_STATUS: 'RENDERER_OPENCODE_CONNECTION_STATUS',
  // 初始化进度（percent, message）
  INIT_PROGRESS: 'RENDERER_INIT_PROGRESS',
  // 初始化完成
  INIT_DONE: 'RENDERER_INIT_DONE',
} as const;

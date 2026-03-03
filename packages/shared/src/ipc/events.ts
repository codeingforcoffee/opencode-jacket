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
  // 权限请求（来自 OpenCode 服务端）
  OPENCODE_PERMISSION: 'RENDERER_OPENCODE_PERMISSION',
  // Question 工具提问（来自 OpenCode 服务端）
  OPENCODE_QUESTION: 'RENDERER_OPENCODE_QUESTION',
  // 主进程 UI 调试日志
  DEBUG_LOG: 'RENDERER_DEBUG_LOG',
} as const;

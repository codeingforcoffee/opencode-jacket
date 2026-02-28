/**
 * IPC 通道 - 按业务域聚合导出
 * 主进程与渲染进程共享，所有 OpenCode 相关请求通过主进程转发给 @opencode-ai/sdk
 *
 * 命名规范：
 * - 主进程 handle（invoke）：MAIN_业务__功能
 * - 渲染进程 on（事件流）：RENDERER_业务_功能
 */

export { SESSION } from './session';
export { CHAT } from './chat';
export { CONNECTION } from './connection';
export { IPC_EVENTS } from './events';

import { CONNECTION } from './connection';
import { SESSION } from './session';
import { CHAT } from './chat';

/** 主进程 handle（invoke 调用）- 扁平化导出，兼容现有用法 */
export const IPC = {
  ...CONNECTION,
  ...SESSION,
  ...CHAT,
} as const;

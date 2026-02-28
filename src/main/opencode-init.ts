/**
 * OpenCode 初始化 - 连接本地已运行的 OpenCode 服务前准备
 */
export type InitProgressCallback = (percent: number, message: string) => void;

/**
 * 确保准备就绪（连接本地 OpenCode 前的占位逻辑）
 */
export async function ensureOpencodeReady(onProgress: InitProgressCallback): Promise<void> {
  onProgress(0, '准备连接...');
  onProgress(100, '已就绪');
}

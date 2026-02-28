/**
 * OpenCode 环境检查
 * 优先使用打包的 opencode-ai，不可用时回退到 PATH 中的 opencode
 */
import { spawn } from 'child_process';
import { platform } from 'os';
import { getBundledOpencodePath } from './opencode-bundled';

export type InitProgressCallback = (percent: number, message: string) => void;

const SPAWN_OPTS: { stdio: ('ignore' | 'pipe')[]; windowsHide?: boolean } = {
  stdio: ['ignore', 'pipe', 'pipe'],
  ...(platform() === 'win32' && { windowsHide: true }),
};

/**
 * 检查打包的 OpenCode 是否可用
 */
export async function checkBundledOpencodeAvailable(): Promise<boolean> {
  const binPath = getBundledOpencodePath();
  if (!binPath) return false;

  return new Promise((resolve) => {
    const isWin = platform() === 'win32';
    const proc = spawn(process.execPath, [binPath, '--version'], {
      shell: isWin,
      ...SPAWN_OPTS,
    });
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve(false);
    }, 5000);
    proc.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });
  });
}

/**
 * 检查 PATH 中的 opencode 是否可用（兜底）
 */
export async function checkPathOpencodeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const isWin = platform() === 'win32';
    const proc = spawn('opencode', ['--version'], {
      shell: isWin,
      ...SPAWN_OPTS,
    });
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve(false);
    }, 5000);
    proc.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });
  });
}

/**
 * 确保 OpenCode 可用：优先使用打包版本，否则检查 PATH
 * 本应用已内置 opencode-ai，通常无需额外安装
 */
export async function ensureOpencodeReady(onProgress: InitProgressCallback): Promise<void> {
  onProgress(0, '检查 OpenCode 环境...');

  // 1. 优先使用打包的 opencode-ai
  const bundledOk = await checkBundledOpencodeAvailable();
  if (bundledOk) {
    onProgress(100, 'OpenCode 已就绪');
    return;
  }

  // 2. 检查 PATH 中是否有 opencode（用户可能已全局安装）
  const pathOk = await checkPathOpencodeAvailable();
  if (pathOk) {
    onProgress(100, 'OpenCode 已就绪');
    return;
  }

  throw new Error(
    '未检测到 OpenCode。本应用已内置 opencode-ai，若仍不可用请检查依赖是否正确安装。'
  );
}

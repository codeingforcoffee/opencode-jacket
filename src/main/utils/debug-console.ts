import { IPC_EVENTS } from '@shared';

type SendFn = (channel: string, ...args: unknown[]) => void;

let _send: SendFn | null = null;

/** 在 sendToRenderer 可用后调用，绑定渲染进程推送函数 */
export function initUiConsole(send: SendFn): void {
  _send = send;
}

function serialize(arg: unknown): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (arg instanceof Error)
    return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function forward(level: string, args: unknown[]): void {
  const message = args.map(serialize).join(' ');
  if (_send) {
    _send(IPC_EVENTS.DEBUG_LOG, { level, message, timestamp: new Date().toISOString() });
  } else {
    // 渲染进程尚未就绪时降级到原生控制台
    const fn = (console as unknown as Record<string, unknown>)[level];
    if (typeof fn === 'function') (fn as (...a: unknown[]) => void)(...args);
    else console.log(...args);
  }
}

export const UiConsole = {
  log: (...args: unknown[]): void => forward('log', args),
  info: (...args: unknown[]): void => forward('info', args),
  warn: (...args: unknown[]): void => forward('warn', args),
  error: (...args: unknown[]): void => forward('error', args),
};

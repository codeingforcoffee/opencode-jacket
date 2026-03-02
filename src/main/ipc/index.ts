import { registerConnectionIPC } from './connection';
import { registerSessionIPC } from './session';
import { registerChatIPC } from './chat';
import { registerFileIPC } from './file';
import { registerMcpIPC } from './mcp';
import { registerPermissionIPC } from './permission';
import { registerCommandIPC } from './command';

type SendToRenderer = (channel: string, ...args: unknown[]) => void;

export function registerAllIPC(
  sendToRenderer: SendToRenderer,
  initStatus: { done: boolean; percent?: number; message?: string }
): void {
  registerConnectionIPC(sendToRenderer, initStatus);
  registerSessionIPC();
  registerChatIPC();
  registerFileIPC();
  registerMcpIPC();
  registerPermissionIPC();
  registerCommandIPC();
}

import { app, shell, BrowserWindow } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { IPC_EVENTS } from '@shared';
import { startOpenCode, disconnectOpenCode, subscribeEvents } from './opencode-client';
import { initChunkBuffer, pushChunk, flushChunkBuffer } from './utils/chunk-buffer';
import { registerAllIPC } from './ipc';
import { initUiConsole, UiConsole } from './utils/debug-console';

let mainWindow: BrowserWindow | null = null;

const initStatus: { done: boolean; percent?: number; message?: string } = {
  done: false,
  percent: 0,
  message: '检查中...',
};

function sendToRenderer(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args);
}

// 绑定主进程 UiConsole，使其可以向渲染进程推送调试日志
initUiConsole(sendToRenderer);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function runOpencodeInit(): void {
  startOpenCode({ hostname: '127.0.0.1', port: 4096 }, (percent, message) => {
    initStatus.done = false;
    initStatus.percent = percent;
    initStatus.message = message;
    sendToRenderer(IPC_EVENTS.INIT_PROGRESS, { percent, message });
  })
    .then(() => {
      initStatus.done = true;
      initStatus.percent = 100;
      initStatus.message = '完成';
      sendToRenderer(IPC_EVENTS.INIT_DONE);
      sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: true });
    })
    .catch((err) => {
      console.error('[main] OpenCode 启动失败:', (err as Error).message);
      initStatus.done = true;
      initStatus.percent = 100;
      initStatus.message = '启动失败';
      sendToRenderer(IPC_EVENTS.INIT_DONE);
      sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: false });
    });
}

function setupEventForwarding(): void {
  subscribeEvents((event) => {
    sendToRenderer(IPC_EVENTS.OPENCODE_EVENT, event);

    const ev = event as {
      type?: string;
      sessionID?: string;
      properties?: {
        text?: string;
        delta?: string;
        sessionID?: string;
        part?: { type?: string; text?: string; sessionID?: string };
        requestID?: string;
        // 权限请求字段
        id?: string;
        permission?: string;
        patterns?: string[];
        // Question 工具字段
        questions?: Array<{
          question: string;
          header: string;
          options: Array<{ label: string; description: string }>;
          multiple?: boolean;
          custom?: boolean;
        }>;
      };
      part?: { text?: string; sessionID?: string; type?: string };
    };
    if (ev.type !== 'server.heartbeat') {
      // 心跳检测不需要打日志
      UiConsole.log('🍕🍕 ~ setupEventForwarding ~ ev:', ev);
    }

    // 权限请求事件转发到渲染进程
    if (ev?.type === 'permission.asked') {
      const props = ev.properties as
        | {
            id?: string;
            sessionID?: string;
            permission?: string;
            patterns?: string[];
          }
        | undefined;
      sendToRenderer(IPC_EVENTS.OPENCODE_PERMISSION, {
        requestID: props?.id,
        tool: props?.permission,
        filename: props?.patterns?.[0],
        sessionID: ev.sessionID ?? props?.sessionID,
      });
    }

    // Question 工具提问事件转发到渲染进程
    if (ev?.type === 'question.asked' && ev.properties?.id) {
      sendToRenderer(IPC_EVENTS.OPENCODE_QUESTION, {
        requestID: ev.properties.id,
        sessionID: ev.sessionID ?? ev.properties.sessionID,
        questions: ev.properties.questions ?? [],
      });
    }

    // 工具调用参数日志
    if (ev?.type === 'message.part.updated') {
      const part = ev?.properties?.part as Record<string, unknown> | undefined;
      if (part?.type === 'tool') {
        const state = part.state as
          | { status?: string; input?: Record<string, unknown> }
          | undefined;
        if (state?.input && Object.keys(state.input).length) {
          console.log('[tool-call]', part.tool, JSON.stringify(state.input, null, 2));
        }
      }
    }

    // 提取流式文本 chunk
    const sessionId =
      ev?.sessionID ??
      ev?.properties?.sessionID ??
      ev?.properties?.part?.sessionID ??
      ev?.part?.sessionID ??
      '';

    let text = '';
    if (ev?.properties?.text) {
      text = ev.properties.text;
    } else if (ev?.type === 'message.part.delta' && ev?.properties?.delta) {
      text = ev.properties.delta;
    } else if (ev?.type === 'text' && ev?.part?.text) {
      text = ev.part.text;
    } else if (ev?.type === 'message.part.updated' && ev?.properties?.part) {
      const part = ev.properties.part;
      if (part?.type === 'text' && typeof part.text === 'string') {
        text = part.text;
      } else if (typeof ev?.properties?.delta === 'string') {
        text = ev.properties.delta;
      }
    } else if (ev?.properties?.delta) {
      text = ev.properties.delta;
    }

    if (text) {
      pushChunk(sessionId, text);
    }
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.opencode.jacket');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerAllIPC(sendToRenderer, initStatus);

  initChunkBuffer((sessionId, text) => {
    sendToRenderer(IPC_EVENTS.OPENCODE_CHUNK, sessionId || '', text);
  });

  setupEventForwarding();

  createWindow();

  mainWindow?.webContents.once('did-finish-load', () => {
    runOpencodeInit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  flushChunkBuffer();
  void disconnectOpenCode();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

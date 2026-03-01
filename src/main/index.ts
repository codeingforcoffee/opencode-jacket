import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { IPC, IPC_EVENTS } from '@shared';
import { addMcp, listMcp, removeMcp } from './mcp';
import {
  connectOpenCode,
  disconnectOpenCode,
  getOpenCodeClient,
  healthCheck,
  subscribeEvents,
} from './opencode-client';
import { ensureOpencodeReady } from './opencode-init';
import { initChunkBuffer, pushChunk, flushChunkBuffer } from './utils/chunk-buffer';
import { withTimeout } from './utils/with-timeout';

let mainWindow: BrowserWindow | null = null;

let initStatus: { done: boolean; percent?: number; message?: string } = {
  done: false,
  percent: 0,
  message: '检查中...',
};

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

function sendToRenderer(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args);
}

function runOpencodeInit(): void {
  ensureOpencodeReady((percent, message) => {
    initStatus = { done: false, percent, message };
    sendToRenderer(IPC_EVENTS.INIT_PROGRESS, { percent, message });
  })
    .then(() => {
      initStatus = { done: true, percent: 100, message: '完成' };
      sendToRenderer(IPC_EVENTS.INIT_DONE);
      connectOpenCode({ hostname: '127.0.0.1', port: 4096 })
        .then(() => {
          sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: true });
        })
        .catch((err) => {
          console.error('[main] OpenCode 自动连接失败:', (err as Error).message);
          sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: false });
        });
    })
    .catch((err) => {
      console.error('[main] OpenCode 初始化失败:', (err as Error).message);
      initStatus = { done: true, percent: 100, message: '初始化失败' };
      sendToRenderer(IPC_EVENTS.INIT_DONE);
      sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: false });
    });
}

function registerOpenCodeIPC(): void {
  ipcMain.handle(IPC.INIT_GET_STATUS, () => Promise.resolve(initStatus));

  // 连接 OpenCode
  ipcMain.handle(
    IPC.OPENCODE_CONNECT,
    async (_, options?: { hostname?: string; port?: number }) => {
      try {
        await connectOpenCode(options ?? {});
        sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: true });
        return { success: true };
      } catch (err) {
        sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: false });
        return { success: false, error: (err as Error).message };
      }
    }
  );

  // 断开连接
  ipcMain.handle(IPC.OPENCODE_DISCONNECT, () => {
    flushChunkBuffer();
    disconnectOpenCode();
    sendToRenderer(IPC_EVENTS.OPENCODE_CONNECTION_STATUS, { connected: false });
    return { success: true };
  });

  // 健康检查
  ipcMain.handle(IPC.OPENCODE_HEALTH, async () => {
    return withTimeout(healthCheck(), 3000, 'health');
  });

  // 创建会话（v2 扁平化 API）
  ipcMain.handle(IPC.OPENCODE_SESSION_CREATE, async (_, body?: { title?: string }) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.session.create({ title: body?.title });
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 列出会话（支持 directory 过滤，服务端按 workspace 过滤）
  ipcMain.handle(IPC.OPENCODE_SESSION_LIST, async (_, directory?: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const queryDirectory = directory?.trim();
      const res = await c.session.list(
        queryDirectory
          ? { directory: queryDirectory.replace(/\\/g, '/').replace(/\/+$/, '') || '/' }
          : undefined
      );
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 获取会话
  ipcMain.handle(IPC.OPENCODE_SESSION_GET, async (_, id: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.session.get({ sessionID: id });
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 更新会话（标题等）
  ipcMain.handle(
    IPC.OPENCODE_SESSION_UPDATE,
    async (_, params: { sessionId: string; title?: string }) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      const { sessionId, title } = params;
      try {
        const res = await c.session.update({ sessionID: sessionId, title });
        return { data: res.data };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  // 删除会话
  ipcMain.handle(IPC.OPENCODE_SESSION_DELETE, async (_, id: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.session.delete({ sessionID: id });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 列出会话消息
  ipcMain.handle(IPC.OPENCODE_SESSION_MESSAGES, async (_, sessionId: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await withTimeout(
        c.session.messages({ sessionID: sessionId }),
        12000,
        'session.messages'
      );
      return { data: res.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 停止会话（Chat）
  ipcMain.handle(IPC.OPENCODE_SESSION_ABORT, async (_, sessionId: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      await c.session.abort({ sessionID: sessionId });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 发送 prompt（Chat）- 使用 promptAsync 立即返回，流式结果通过 SSE 推送
  ipcMain.handle(
    IPC.OPENCODE_PROMPT,
    async (
      _,
      params: {
        sessionId: string;
        parts: Array<{ type: string; text?: string }>;
        model?: { providerID?: string; modelID?: string };
      }
    ) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const model =
          params.model?.providerID && params.model?.modelID
            ? { providerID: params.model.providerID, modelID: params.model.modelID }
            : undefined;
        const res = await c.session.promptAsync({
          sessionID: params.sessionId,
          parts: params.parts.map((p) => ({ type: 'text' as const, text: p.text ?? '' })),
          model,
        });
        return { data: res.data };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  // MCP 列表
  ipcMain.handle(IPC.MCP_LIST, async () => {
    try {
      const items = await listMcp();
      return { data: items };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // MCP 添加
  ipcMain.handle(IPC.MCP_ADD, async (_, name: string, config: Record<string, unknown>) => {
    try {
      const result = await addMcp(name, config);
      return { data: result };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // MCP 删除
  ipcMain.handle(IPC.MCP_REMOVE, async (_, name: string) => {
    try {
      const ok = await removeMcp(name);
      return { success: ok };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 文件 - OpenCode SDK file.read
  ipcMain.handle(
    IPC.OPENCODE_FILE_READ,
    async (_, params: { path: string; directory?: string }) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const res = await c.file.read({
          path: params.path,
          directory: params.directory,
        });
        const data = res?.data as { type?: string; content?: string } | undefined;
        return { data: data?.content ?? null };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  // 文件 - OpenCode SDK find.files
  ipcMain.handle(
    IPC.OPENCODE_FIND_FILES,
    async (
      _,
      params?: { query?: string; type?: 'file' | 'directory'; limit?: number; directory?: string }
    ) => {
      const c = getOpenCodeClient();
      if (!c) return { error: 'Not connected' };
      try {
        const res = await c.find.files({
          query: params?.query ?? '*',
          type: params?.type,
          limit: params?.limit ?? 50,
          directory: params?.directory,
        });
        const data = res?.data as string[] | undefined;
        return { data: data ?? [] };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
  );

  // 项目 - OpenCode SDK project.current
  ipcMain.handle(IPC.OPENCODE_PROJECT_CURRENT, async (_, directory?: string) => {
    const c = getOpenCodeClient();
    if (!c) return { error: 'Not connected' };
    try {
      const res = await c.project.current({ directory });
      return { data: res?.data };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // 本地文件选择并读取（Electron dialog + fs）
  ipcMain.handle(IPC.FILE_PICK_AND_READ, async () => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
    if (!win) return { error: 'No window' };
    try {
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        title: '选择要附加的文件',
      });
      if (result.canceled || !result.filePaths.length) {
        return { data: [] };
      }
      const files: Array<{ name: string; path: string; content: string }> = [];
      for (const filePath of result.filePaths) {
        try {
          const content = await readFile(filePath, 'utf-8');
          const name = filePath.split(/[/\\]/).pop() ?? filePath;
          files.push({ name, path: filePath, content });
        } catch {
          // 跳过无法以 UTF-8 读取的二进制文件
        }
      }
      return { data: files };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.opencode.jacket');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerOpenCodeIPC();

  // Chunk 批处理：合并流式文本块，减少 IPC 与渲染压力
  initChunkBuffer((sessionId, text) => {
    sendToRenderer(IPC_EVENTS.OPENCODE_CHUNK, sessionId || '', text);
  });

  // 事件流转发到渲染进程
  const DEBUG_EVENTS = true; // 排查用
  subscribeEvents((event) => {
    sendToRenderer(IPC_EVENTS.OPENCODE_EVENT, event);
    const ev = event as {
      type?: string;
      sessionID?: string;
      properties?: { text?: string; delta?: string; sessionID?: string; part?: { type?: string; text?: string; sessionID?: string } };
      part?: { text?: string; sessionID?: string; type?: string };
    };
    const sessionId = ev?.sessionID ?? ev?.properties?.sessionID ?? ev?.properties?.part?.sessionID ?? ev?.part?.sessionID ?? '';
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
      if (DEBUG_EVENTS) console.log('[opencode-debug] 提取到 chunk, sessionId=', sessionId, 'len=', text.length);
      pushChunk(sessionId, text);
    } else if (DEBUG_EVENTS && (ev?.type?.includes('part') || ev?.type?.includes('message'))) {
      console.log('[opencode-debug] 未提取到文本, type=', ev?.type, 'ev=', JSON.stringify(ev).slice(0, 200));
    }
  });

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
  disconnectOpenCode();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

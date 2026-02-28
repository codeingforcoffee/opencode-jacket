# OpenCode Jacket 贡献指南

本文档梳理项目结构、架构设计与开发流程，供贡献者参考。

## 一、项目概述

OpenCode Jacket 是 OpenCode 的桌面套壳应用，通过 `@opencode-ai/sdk` 将 Chat、Shell、Command 等请求代理给 OpenCode 服务。应用启动时优先使用打包的 `opencode-ai`，不可用时回退到全局安装或自动安装。

### 技术栈

| 层级 | 技术 |
|------|------|
| 构建 | electron-vite、pnpm workspace |
| 主进程 | Electron、Node.js、@opencode-ai/sdk |
| 渲染进程 | Vue 3、TypeScript、Pinia、Vue Router |
| UI | Element Plus、Tailwind CSS v4 |
| 国际化 | vue-i18n |

---

## 二、项目结构

```
opencode-jacket/
├── packages/
│   └── shared/                 # 共享包（IPC 通道常量）
│       └── src/
│           └── ipc/            # IPC 通道定义
│               ├── index.ts    # 聚合导出
│               ├── events.ts   # 主→渲染 事件流
│               ├── connection.ts
│               ├── session.ts
│               ├── chat.ts
│               ├── shell.ts
│               ├── command.ts
│               └── control.ts
│
├── src/
│   ├── main/                   # 主进程
│   │   ├── index.ts            # 入口、窗口、IPC 注册
│   │   ├── opencode-client.ts  # SDK 封装、连接管理、事件订阅
│   │   ├── opencode-init.ts    # 环境检查与自动安装
│   │   ├── opencode-bundled.ts # 打包版 opencode 路径
│   │   └── opencode-server-bundled.ts  # 打包版服务启动
│   │
│   ├── preload/                # 预加载脚本
│   │   └── index.ts            # contextBridge 暴露 opencode API
│   │
│   └── renderer/               # 渲染进程（Vue SPA）
│       ├── index.html
│       └── src/
│           ├── main.ts         # 入口
│           ├── App.vue         # 根组件
│           ├── env.d.ts        # window.opencode 类型声明
│           ├── router/         # 路由
│           ├── stores/         # Pinia 状态
│           ├── i18n/           # 国际化
│           ├── components/     # 通用组件
│           │   ├── Sidebar.vue
│           │   ├── ChatPanel.vue
│           │   ├── TerminalPanel.vue
│           │   ├── SettingsDrawer.vue
│           └── views/          # 页面视图
│               ├── Chat.vue
│               ├── Shell.vue
│               ├── Settings.vue
│               └── About.vue
│
├── build/                      # 构建资源（图标、entitlements 等）
├── electron.vite.config.ts     # electron-vite 配置
├── electron-builder.yml        # 打包配置
├── pnpm-workspace.yaml
└── package.json
```

---

## 三、架构说明

### 3.1 进程职责

| 进程 | 职责 |
|------|------|
| **Main** | 窗口管理、OpenCode 连接、IPC handle、事件流转发 |
| **Preload** | 安全桥接，通过 `contextBridge` 暴露 `window.opencode` |
| **Renderer** | Vue 应用，通过 `window.opencode` 调用主进程能力 |

### 3.2 数据流

```
Renderer (Vue)
    │
    │  window.opencode.prompt / shell / ...
    ▼
Preload (contextBridge)
    │
    │  ipcRenderer.invoke(IPC.OPENCODE_*)
    ▼
Main (ipcMain.handle)
    │
    │  getOpenCodeClient().session.prompt / shell / ...
    ▼
@opencode-ai/sdk → OpenCode 服务
```

### 3.3 事件流（主→渲染）

主进程订阅 `client.event.subscribe()`，将事件转发给渲染进程：

| 事件通道 | 用途 |
|----------|------|
| `OPENCODE_EVENT` | 原始事件 |
| `OPENCODE_CHUNK` | 流式文本（`message.part.delta` 的 `delta`、`properties.text`） |
| `OPENCODE_CONNECTION_STATUS` | 连接状态 |
| `INIT_PROGRESS` | 初始化进度 |
| `INIT_DONE` | 初始化完成 |

### 3.4 IPC 命名规范

- **主进程 handle（invoke）**：`MAIN_业务__功能`，如 `MAIN_OPENCODE__SHELL`
- **渲染进程 on（事件流）**：`RENDERER_业务_功能`，如 `RENDERER_OPENCODE_CHUNK`

---

## 四、开发环境

### 4.1 前置要求

- Node.js 18+
- pnpm 8+

### 4.2 安装与运行

```bash
pnpm install
pnpm dev
```

### 4.3 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式（热重载） |
| `pnpm start` | 预览构建产物 |
| `pnpm build` | 构建（含 typecheck） |
| `pnpm build:win` | 打包 Windows |
| `pnpm build:mac` | 打包 macOS |
| `pnpm build:linux` | 打包 Linux |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier 格式化 |

### 4.4 路径别名

- `@shared` → `packages/shared/src`
- `@renderer` → `src/renderer/src`

---

## 五、开发规范

### 5.1 代码风格

- 使用 Prettier 格式化（`.prettierrc.yaml`）
- Vue 单文件组件使用 `<script setup lang="ts">`
- 遵循 ESLint 规则（`eslint.config.mjs`）

### 5.2 新增 IPC 通道

1. 在 `packages/shared/src/ipc/` 下新增或修改对应业务文件
2. 在 `packages/shared/src/ipc/index.ts` 中导出
3. 主进程：`ipcMain.handle(IPC.XXX, handler)`
4. 预加载：在 `opencodeAPI` 中暴露方法
5. 渲染进程：在 `env.d.ts` 中补充类型

### 5.3 新增页面

1. 在 `src/renderer/src/views/` 新建 Vue 组件
2. 在 `src/renderer/src/router/index.ts` 添加路由
3. 如需侧边栏入口，在 `Sidebar.vue` 中添加

### 5.4 流式输出

- 主进程在 `subscribeEvents` 中解析 `message.part.delta` 的 `properties.delta`，通过 `OPENCODE_CHUNK` 下发
- 渲染进程通过 `window.opencode.onChunk(callback)` 订阅
- 注意区分来源：Chat 仅在 `sending` 时更新流式文本；Terminal 仅在 `executing` 时追加输出

---

## 六、构建与发布

### 6.1 构建产物

- `out/main/`：主进程
- `out/preload/`：预加载
- `out/renderer/`：渲染进程静态资源

### 6.2 打包配置

- `electron-builder.yml`：应用 ID、输出目录、平台目标等
- Windows：NSIS 安装包
- macOS：DMG（x64 + arm64）
- Linux：AppImage、snap

### 6.3 排除文件

构建时排除源码、配置、文档等，仅打包 `out/`、`packages/shared/dist/`、`node_modules/` 等必要内容。

---

## 七、常见任务

### 添加新的 OpenCode API 调用

1. 在 `src/main/index.ts` 的 `registerOpenCodeIPC` 中新增 `ipcMain.handle`
2. 在 `src/preload/index.ts` 的 `opencodeAPI` 中暴露
3. 在 `src/renderer/src/env.d.ts` 中补充类型
4. 在对应 Vue 组件中调用 `window.opencode.xxx()`

### 调试主进程

- 开发模式下主进程输出在终端
- 可使用 `console.log` 或 Node 调试器

### 调试渲染进程

- 开发模式下自动打开 DevTools
- 或通过菜单/快捷键打开

---

## 八、参考链接

- [Electron 文档](https://www.electronjs.org/docs)
- [electron-vite](https://electron-vite.org/)
- [OpenCode SDK](https://opencode.ai/docs/sdk/)
- [Vue 3](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)

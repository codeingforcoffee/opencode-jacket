# OpenCode Jacket

OpenCode 套壳桌面应用，所有 Chat、Shell、Command 请求通过 `@opencode-ai/sdk` 代理给 OpenCode。

## 技术栈

- Electron + electron-vite
- Vue 3 + TypeScript + Tailwind CSS v4 + Element Plus
- pnpm workspace (monorepo)
- @opencode-ai/sdk

## 项目结构

```
opencode-jacket/
├── packages/shared/     # IPC 通道常量
├── src/
│   ├── main/           # 主进程 + opencode-client
│   ├── preload/        # 预加载脚本
│   └── renderer/       # Vue 渲染进程
```

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
pnpm build:win   # Windows
pnpm build:mac   # macOS
pnpm build:linux # Linux
```

## 使用说明

1. 在设置页配置 OpenCode 连接（默认 127.0.0.1:4096）
2. 点击连接，SDK 将启动或连接 OpenCode 服务
3. 首次使用需执行 `opencode auth login` 配置 LLM provider

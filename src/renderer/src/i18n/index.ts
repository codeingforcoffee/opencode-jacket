import { createI18n } from 'vue-i18n';

const messages = {
  zh: {
    nav: {
      chat: '对话',
      shell: '终端',
      settings: '设置',
      about: '关于',
    },
    chat: {
      placeholder: '输入消息，按 Enter 发送...',
      newSession: '新建会话',
      send: '发送',
    },
    shell: {
      placeholder: '输入 Shell 命令...',
      execute: '执行',
    },
    settings: {
      title: 'OpenCode 连接设置',
      hostname: '主机',
      port: '端口',
      connect: '连接',
      disconnect: '断开',
      healthCheck: '健康检查',
      status: '连接状态',
      connected: '已连接',
      disconnected: '未连接',
    },
    about: {
      title: 'OpenCode Jacket',
      desc: "OpenCode 套壳桌面应用，所有请求通过 {'@'}opencode-ai/sdk 代理给 OpenCode。",
    },
  },
  en: {
    nav: {
      chat: 'Chat',
      shell: 'Shell',
      settings: 'Settings',
      about: 'About',
    },
    chat: {
      placeholder: 'Type a message, press Enter to send...',
      newSession: 'New Session',
      send: 'Send',
    },
    shell: {
      placeholder: 'Enter shell command...',
      execute: 'Execute',
    },
    settings: {
      title: 'OpenCode Connection',
      hostname: 'Hostname',
      port: 'Port',
      connect: 'Connect',
      disconnect: 'Disconnect',
      healthCheck: 'Health Check',
      status: 'Status',
      connected: 'Connected',
      disconnected: 'Disconnected',
    },
    about: {
      title: 'OpenCode Jacket',
      desc: "OpenCode shell desktop app. All requests are delegated to OpenCode via {'@'}opencode-ai/sdk.",
    },
  },
};

export default createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages,
});

import { createI18n } from 'vue-i18n';

const messages = {
  zh: {
    nav: {
      chat: '对话',
      settings: '设置',
    },
    chat: {
      placeholder: '输入消息，按 Enter 发送...',
      newSession: '新建会话',
      send: '发送',
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
  },
  en: {
    nav: {
      chat: 'Chat',
      settings: 'Settings',
    },
    chat: {
      placeholder: 'Type a message, press Enter to send...',
      newSession: 'New Session',
      send: 'Send',
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
  },
};

export default createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages,
});

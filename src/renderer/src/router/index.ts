import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('@renderer/views/ChatView.vue'),
      meta: { title: '对话' },
    },
    {
      path: '/mcp',
      name: 'Mcp',
      component: () => import('@renderer/views/Mcp.vue'),
      meta: { title: 'MCP' },
    },
    {
      path: '/expert',
      name: 'Expert',
      component: () => import('@renderer/views/Expert.vue'),
      meta: { title: '专家探索' },
    },
  ],
});

export default router;

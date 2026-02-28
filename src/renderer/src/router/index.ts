import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('@renderer/views/Chat.vue'),
      meta: { title: '对话' },
    },
    {
      path: '/shell',
      name: 'Shell',
      component: () => import('@renderer/views/Shell.vue'),
      meta: { title: '终端' },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@renderer/views/Settings.vue'),
      meta: { title: '设置' },
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('@renderer/views/About.vue'),
      meta: { title: '关于' },
    },
  ],
});

export default router;

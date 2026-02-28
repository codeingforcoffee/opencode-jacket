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
  ],
});

export default router;

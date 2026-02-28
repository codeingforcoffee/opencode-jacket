import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import i18n from './i18n';
import './assets/styles/main.css';

// 初始化主题，避免首次渲染闪烁
const theme = localStorage.getItem('theme') as 'light' | 'dark' | null;
document.documentElement.classList.toggle('dark', theme === 'dark');

const app = createApp(App);
const pinia = createPinia();

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(pinia);
app.use(ElementPlus);
app.use(i18n);
app.mount('#app');

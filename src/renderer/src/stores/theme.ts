import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

type Theme = 'light' | 'dark';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'light');

  function setTheme(t: Theme) {
    theme.value = t;
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light');
  }

  watch(
    theme,
    (t) => {
      document.documentElement.classList.toggle('dark', t === 'dark');
    },
    { immediate: true }
  );

  return { theme, setTheme, toggleTheme };
});

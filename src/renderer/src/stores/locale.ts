import { defineStore } from 'pinia';
import { ref } from 'vue';

export type Locale = 'zh' | 'en';

export const useLocaleStore = defineStore('locale', () => {
  const stored = localStorage.getItem('locale') as Locale | null;
  const locale = ref<Locale>(stored === 'zh' || stored === 'en' ? stored : 'zh');

  function setLocale(l: Locale) {
    locale.value = l;
    localStorage.setItem('locale', l);
  }

  return { locale, setLocale };
});

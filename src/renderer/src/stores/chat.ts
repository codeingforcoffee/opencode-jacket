import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const thinkingMode = ref(
    localStorage.getItem('chat.thinkingMode') === 'true'
  );

  function setThinkingMode(value: boolean) {
    thinkingMode.value = value;
    localStorage.setItem('chat.thinkingMode', String(value));
  }

  return { thinkingMode, setThinkingMode };
});

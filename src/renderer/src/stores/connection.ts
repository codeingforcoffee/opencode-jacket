import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useConnectionStore = defineStore('connection', () => {
  const connected = ref(false);
  const version = ref<string | undefined>();

  function setConnected(value: boolean) {
    connected.value = value;
  }

  function setVersion(v: string | undefined) {
    version.value = v;
  }

  async function connect(options?: { hostname?: string; port?: number }) {
    if (typeof window.opencode === 'undefined')
      return { success: false, error: 'API not available' };
    const res = await window.opencode.connect(options);
    if (res.success) {
      const health = await window.opencode.health();
      version.value = health.version;
    }
    return res;
  }

  async function disconnect() {
    if (typeof window.opencode === 'undefined') return;
    await window.opencode.disconnect();
    version.value = undefined;
  }

  async function checkHealth() {
    if (typeof window.opencode === 'undefined') return { healthy: false };
    return window.opencode.health();
  }

  return {
    connected,
    version,
    setConnected,
    setVersion,
    connect,
    disconnect,
    checkHealth,
  };
});

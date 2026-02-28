import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Session {
  id: string;
  title?: string;
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref<string>('');

  async function loadSessions() {
    if (typeof window.opencode === 'undefined') return;
    const res = await window.opencode.sessionList();
    if (res.data && Array.isArray(res.data)) {
      sessions.value = res.data as Session[];
      if (sessions.value.length && !currentSessionId.value) {
        currentSessionId.value = sessions.value[0].id;
      }
    }
  }

  async function createSession(title = '新会话') {
    if (typeof window.opencode === 'undefined') return null;
    const res = await window.opencode.sessionCreate({ title });
    if (res.data && typeof res.data === 'object' && 'id' in res.data) {
      const session = res.data as Session;
      sessions.value.push(session);
      currentSessionId.value = session.id;
      return session;
    }
    return null;
  }

  function setCurrentSession(id: string) {
    currentSessionId.value = id;
  }

  return {
    sessions,
    currentSessionId,
    loadSessions,
    createSession,
    setCurrentSession,
  };
});

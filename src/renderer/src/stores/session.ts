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
    let directory: string | undefined;
    try {
      const project = await window.opencode.projectCurrent?.();
      const data = project?.data as { worktree?: string } | undefined;
      if (data?.worktree) {
        directory = String(data.worktree).trim();
      }
    } catch {
      // 无 workspace 时忽略
    }
    const res = await window.opencode.sessionList(directory);
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

  function updateSessionTitle(id: string, title: string) {
    const idx = sessions.value.findIndex((s) => s.id === id);
    if (idx >= 0) sessions.value[idx] = { ...sessions.value[idx], title };
  }

  function removeSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id);
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id ?? '';
    }
  }

  return {
    sessions,
    currentSessionId,
    loadSessions,
    createSession,
    setCurrentSession,
    updateSessionTitle,
    removeSession,
  };
});

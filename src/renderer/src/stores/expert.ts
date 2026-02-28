import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ExpertConfig {
  id: string;
  name: string;
  prompt: string;
  mcpIds: string[];
}

const STORAGE_KEY = 'opencode-jacket-experts';

function loadFromStorage(): ExpertConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExpertConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(list: ExpertConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const useExpertStore = defineStore('expert', () => {
  const experts = ref<ExpertConfig[]>(loadFromStorage());

  function addExpert(config: Omit<ExpertConfig, 'id'>) {
    const id = `expert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: ExpertConfig = { ...config, id };
    experts.value.push(item);
    saveToStorage(experts.value);
    return item;
  }

  function updateExpert(id: string, updates: Partial<Omit<ExpertConfig, 'id'>>) {
    const idx = experts.value.findIndex((e) => e.id === id);
    if (idx >= 0) {
      experts.value[idx] = { ...experts.value[idx], ...updates };
      saveToStorage(experts.value);
    }
  }

  function removeExpert(id: string) {
    experts.value = experts.value.filter((e) => e.id !== id);
    saveToStorage(experts.value);
  }

  return {
    experts,
    addExpert,
    updateExpert,
    removeExpert,
  };
});

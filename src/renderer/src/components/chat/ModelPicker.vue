<template>
  <div ref="triggerRef">
    <!-- 触发按钮 -->
    <button
      class="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-colors select-none"
      :class="
        disabled
          ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer'
      "
      :disabled="disabled"
      @click="toggle"
    >
      <span
        v-if="loading"
        class="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"
      />
      <span v-else class="max-w-[200px] truncate">{{ label }}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Teleport 到 body，避免 overflow-hidden 裁剪 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-150"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="open"
          data-model-picker-panel
          class="fixed z-[9000] w-72 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden"
          :style="panelStyle"
        >
          <!-- 搜索框 -->
          <div class="px-3 pt-3 pb-2">
            <input
              ref="searchRef"
              v-model="search"
              class="w-full h-7 px-2.5 rounded-lg text-xs bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none border border-transparent focus:border-primary-400/50"
              placeholder="搜索模型..."
            />
          </div>

          <!-- 列表 -->
          <div class="overflow-y-auto pb-2" style="max-height: 280px">
            <div
              v-if="loading"
              class="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500"
            >
              <span
                class="inline-block w-4 h-4 rounded-full border-2 border-gray-300 border-t-primary-400 animate-spin"
              />
            </div>
            <div
              v-else-if="filtered.length === 0"
              class="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500"
            >
              暂无可用模型
            </div>
            <template v-for="provider in filtered" :key="provider.id">
              <div
                class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 sticky top-0 bg-white dark:bg-[#1e1e1e]"
              >
                {{ provider.name }}
              </div>
              <button
                v-for="model in provider.models"
                :key="model.id"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
                :class="
                  isSelected(provider.id, model.id)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                "
                @click="select(provider.id, model.id, provider.name, model.name)"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0 transition-opacity"
                  :class="isSelected(provider.id, model.id) ? 'bg-primary-500' : 'opacity-0'"
                />
                <span class="truncate flex-1">{{ model.name }}</span>
                <span
                  v-if="model.free"
                  class="shrink-0 rounded px-1 py-px text-[9px] font-semibold leading-tight bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                  >Free</span
                >
              </button>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{
  (e: 'change', model: { providerID: string; modelID: string } | undefined): void;
}>();

// ── 数据类型 ───────────────────────────────────────────────────
interface ModelItem {
  id: string;
  name: string;
  free: boolean;
}
interface ProviderItem {
  id: string;
  name: string;
  models: ModelItem[];
}

const providers = ref<ProviderItem[]>([]);
const loading = ref(false);

// ── 选中状态（持久化）─────────────────────────────────────────
const STORAGE_KEY = 'opencode_selected_model';
interface SelectedModel {
  providerID: string;
  modelID: string;
  providerName: string;
  modelName: string;
}
function loadStored(): SelectedModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SelectedModel) : null;
  } catch {
    return null;
  }
}

const selectedModel = ref<SelectedModel | null>(loadStored());

const label = computed(() => {
  if (!selectedModel.value) return '选择模型';
  return `${selectedModel.value.providerName} · ${selectedModel.value.modelName}`;
});

function isSelected(providerID: string, modelID: string) {
  return selectedModel.value?.providerID === providerID && selectedModel.value?.modelID === modelID;
}

function select(providerID: string, modelID: string, providerName: string, modelName: string) {
  selectedModel.value = { providerID, modelID, providerName, modelName };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedModel.value));
  emit('change', { providerID, modelID });
  open.value = false;
}

// ── 下拉开关 ──────────────────────────────────────────────────
const open = ref(false);
const search = ref('');
const triggerRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
}

function updatePanelPosition() {
  const el = triggerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  // 面板展示在按钮上方
  panelStyle.value = {
    left: rect.left + 'px',
    bottom: window.innerHeight - rect.top + 8 + 'px',
    transformOrigin: 'bottom left',
  };
}

watch(open, (v) => {
  if (v) {
    updatePanelPosition();
    search.value = '';
    nextTick(() => searchRef.value?.focus());
    if (providers.value.length === 0) loadProviders();
  }
});

// ── 搜索过滤 ──────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return providers.value;
  return providers.value
    .map((p) => ({
      ...p,
      models: p.models.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      ),
    }))
    .filter((p) => p.models.length > 0);
});

// ── 加载 providers ────────────────────────────────────────────
async function loadProviders() {
  if (typeof window.opencode === 'undefined') return;
  loading.value = true;
  try {
    const res = await window.opencode.configProviders();
    if (res.error || !res.data) return;
    providers.value = parseProviders(res.data as Record<string, unknown>);

    // 首次加载时，若无持久化选择则自动选第一个
    if (!selectedModel.value && providers.value.length > 0) {
      const first = providers.value[0];
      const firstModel = first.models[0];
      if (firstModel) select(first.id, firstModel.id, first.name, firstModel.name);
    }
  } finally {
    loading.value = false;
  }
}

/** model id 含 "-free" 视为免费模型 */
function isFreeModel(m: Record<string, unknown>): boolean {
  return String(m.id ?? '').includes('-free');
}

/**
 * 解析 SDK 返回的 providers 数据
 * 实际结构: { providers: Array<{ id, name, models: { [modelId]: Model } }>, default: {...} }
 * Model.models 是对象（字典），不是数组
 */
function parseProviders(raw: Record<string, unknown>): ProviderItem[] {
  // 顶层可能是 { providers: [...] } 或直接数组
  const providerArr: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.providers)
      ? (raw.providers as unknown[])
      : [];

  const result: ProviderItem[] = [];
  for (const item of providerArr) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    const id = String(p.id ?? '');
    const name = String(p.name ?? id);
    if (!id) continue;

    // models 是对象 { [modelId]: Model }，需用 Object.values
    const modelsRaw = p.models;
    let models: ModelItem[] = [];
    if (modelsRaw && typeof modelsRaw === 'object' && !Array.isArray(modelsRaw)) {
      // 对象形式（标准 SDK 结构）
      models = Object.values(modelsRaw as Record<string, unknown>)
        .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
        .map((m) => ({
          id: String(m.id ?? ''),
          name: String(m.name ?? m.id ?? ''),
          free: isFreeModel(m),
        }))
        .filter((m) => m.id);
    } else if (Array.isArray(modelsRaw)) {
      // 数组形式（兼容）
      models = (modelsRaw as Record<string, unknown>[])
        .filter((m) => !!m && typeof m === 'object')
        .map((m) => ({
          id: String(m.id ?? ''),
          name: String(m.name ?? m.id ?? ''),
          free: isFreeModel(m),
        }))
        .filter((m) => m.id);
    }

    if (models.length > 0) result.push({ id, name, models });
  }
  return result;
}

// ── 点击外部关闭 ──────────────────────────────────────────────
function onDocClick(e: MouseEvent) {
  const target = e.target as Node;
  // triggerRef 内部点击由 toggle 处理，这里只处理外部
  if (triggerRef.value?.contains(target)) return;
  // 面板内部不关闭（Teleport 到 body，无法通过 contains 判断，用 class 标记）
  const panel = document.querySelector('[data-model-picker-panel]');
  if (panel?.contains(target)) return;
  open.value = false;
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick);
  loadProviders(); // 预加载
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onDocClick);
});

// ── 暴露当前模型供父组件读取 ───────────────────────────────────
defineExpose({
  getModel: (): { providerID: string; modelID: string } | undefined =>
    selectedModel.value
      ? { providerID: selectedModel.value.providerID, modelID: selectedModel.value.modelID }
      : undefined,
});
</script>

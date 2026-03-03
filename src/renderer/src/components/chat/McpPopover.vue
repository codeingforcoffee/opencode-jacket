<template>
  <div ref="triggerRef">
    <!-- 触发按钮 -->
    <button
      :title="$t('mcp.popover.title')"
      class="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      :class="{ '!bg-gray-200 dark:!bg-[#3a3a3a] !text-gray-700 dark:!text-gray-200': open }"
      @click="toggle"
    >
      <ElIcon :size="15"><Connection /></ElIcon>
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
          data-mcp-popover-panel
          class="fixed z-[9000] w-64 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden"
          :style="panelStyle"
        >
          <!-- 标题栏 -->
          <div class="flex items-center justify-between px-4 pt-3 pb-2">
            <span
              class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
            >
              {{ $t('mcp.popover.title') }}
            </span>
          </div>

          <!-- 列表区 -->
          <div class="overflow-y-auto px-2 pb-2" style="max-height: 280px">
            <!-- 加载中 -->
            <div v-if="loading" class="flex justify-center py-6">
              <span
                class="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-primary-400 animate-spin"
              />
            </div>

            <!-- 空状态 -->
            <div
              v-else-if="!mcpList.length"
              class="py-6 text-center text-xs text-gray-400 dark:text-gray-500"
            >
              {{ $t('mcp.popover.noPlugins') }}
            </div>

            <!-- MCP 列表 -->
            <div v-else class="space-y-0.5">
              <div
                v-for="item in mcpList"
                :key="item.name"
                class="flex items-center justify-between gap-2 rounded-xl px-2 py-2 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="w-6 h-6 shrink-0 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center"
                  >
                    <ElIcon :size="12" class="text-gray-400 dark:text-gray-500"
                      ><Connection
                    /></ElIcon>
                  </div>
                  <span class="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">
                    {{ item.name }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    v-if="
                      item.config.type === 'remote' &&
                      item.config.oauth &&
                      statusMap[item.name]?.status !== 'connected'
                    "
                    class="px-2 h-6 rounded-lg text-[10px] font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors"
                    @click="handleAuth(item.name)"
                  >
                    {{ $t('mcp.popover.auth') }}
                  </button>
                  <ElSwitch
                    :model-value="item.config.enabled !== false"
                    size="small"
                    @change="(val: boolean) => toggleMcp(item, val)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 底部管理入口 -->
          <div class="border-t border-gray-100 dark:border-gray-700/50 px-2 py-2">
            <button
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              @click="goManage"
            >
              <ElIcon :size="13"><Setting /></ElIcon>
              {{ $t('mcp.popover.manage') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- OAuth 授权对话框 -->
    <McpAuthDialog
      v-model="showAuthDialog"
      :name="authingName"
      :authorization-url="authorizationUrl"
      :via-cli="viaCli"
      :refreshing="authRefreshing"
      @update:model-value="onAuthDialogClose"
      @refresh="handleAuthRefresh"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Connection, Setting } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { McpItem, McpStatus } from '@renderer/types';
import McpAuthDialog from '@renderer/components/mcp/McpAuthDialog.vue';

const router = useRouter();
const injectContextSilently = inject<(text: string) => Promise<void>>('injectContextSilently');

// ── 弹窗状态 ──────────────────────────────────────────────────
const open = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

function toggle() {
  open.value = !open.value;
}

function updatePanelPosition() {
  const el = triggerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  panelStyle.value = {
    left: rect.left + 'px',
    bottom: window.innerHeight - rect.top + 8 + 'px',
    transformOrigin: 'bottom left',
  };
}

import { watch } from 'vue';
watch(open, (v) => {
  if (v) {
    updatePanelPosition();
    nextTick(loadMcp);
  }
});

function onDocClick(e: MouseEvent) {
  const target = e.target as Node;
  if (triggerRef.value?.contains(target)) return;
  const panel = document.querySelector('[data-mcp-popover-panel]');
  if (panel?.contains(target)) return;
  open.value = false;
}

onMounted(() => document.addEventListener('mousedown', onDocClick));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick));

// ── MCP 数据 ──────────────────────────────────────────────────
const loading = ref(false);
const mcpList = ref<McpItem[]>([]);
const statusMap = ref<Record<string, McpStatus>>({});

async function loadMcp() {
  if (typeof window.opencode === 'undefined') return;
  loading.value = true;
  try {
    const res = await window.opencode.mcpList();
    mcpList.value = Array.isArray(res.data) ? (res.data as McpItem[]) : [];
    const statusRes = await window.opencode.mcpStatus();
    if (statusRes.data && typeof statusRes.data === 'object') {
      statusMap.value = statusRes.data as Record<string, McpStatus>;
    }
  } finally {
    loading.value = false;
  }
}

// ── Auth ──────────────────────────────────────────────────────
const showAuthDialog = ref(false);
const authingName = ref('');
const authorizationUrl = ref('');
const viaCli = ref(false);
const authRefreshing = ref(false);

async function handleAuth(name: string) {
  if (typeof window.opencode === 'undefined') return;
  authingName.value = name;
  authorizationUrl.value = '';
  viaCli.value = false;
  showAuthDialog.value = true;
  const res = await window.opencode.mcpAuthStart(name);
  if (res.error) {
    ElMessage.error(res.error);
    showAuthDialog.value = false;
    return;
  }
  authorizationUrl.value = res.data?.authorizationUrl ?? '';
  viaCli.value = res.data?.viaCli ?? false;
}

async function doAuthReconnect() {
  if (!authingName.value || typeof window.opencode === 'undefined') return;
  try {
    await window.opencode.mcpReconnect(authingName.value);
    await loadMcp();
  } catch {
    /* ignore */
  }
}

async function handleAuthRefresh() {
  authRefreshing.value = true;
  try {
    await doAuthReconnect();
  } finally {
    authRefreshing.value = false;
  }
}

async function onAuthDialogClose(visibleVal: boolean) {
  showAuthDialog.value = visibleVal;
  if (!visibleVal) {
    if (viaCli.value) await doAuthReconnect();
    else await loadMcp();
  }
}

// ── 开关 ──────────────────────────────────────────────────────
async function toggleMcp(item: McpItem, enabled: boolean) {
  if (typeof window.opencode === 'undefined') return;
  item.config.enabled = enabled;
  try {
    const res = await window.opencode.mcpToggle(item.name, enabled);
    if (res.error) {
      item.config.enabled = !enabled;
      ElMessage.error(res.error);
      return;
    }
    const hint = enabled
      ? `[工具变更] MCP 插件"${item.name}"已重新启用，你现在可以调用它提供的工具。`
      : `[工具变更] MCP 插件"${item.name}"已禁用，请不要再调用它提供的任何工具。`;
    await injectContextSilently?.(hint);
  } catch (e) {
    item.config.enabled = !enabled;
    ElMessage.error((e as Error).message);
  }
}

function goManage() {
  open.value = false;
  router.push('/mcp');
}
</script>

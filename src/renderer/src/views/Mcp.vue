<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-6 overflow-y-auto">
    <div class="max-w-3xl mx-auto w-full space-y-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ $t('mcp.title') }}
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ $t('mcp.subtitle') }}
        </p>
      </div>

      <ElAlert v-if="loadError" :title="loadError" type="error" show-icon class="mb-4" />

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ $t('mcp.connectedCount', { count: mcpList.length }) }}
        </span>
        <ElButton type="primary" size="small" @click="showAddModal = true">
          <ElIcon class="mr-1"><Plus /></ElIcon>
          {{ $t('mcp.addServer') }}
        </ElButton>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <ElIcon class="animate-spin text-2xl"><Loading /></ElIcon>
      </div>

      <div v-else-if="!mcpList.length" class="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{{ $t('mcp.noServers') }}</p>
        <p class="mt-2 text-sm">{{ $t('mcp.noServersHint') }}</p>
        <ElButton type="primary" class="mt-4" @click="showAddModal = true">
          {{ $t('mcp.addServer') }}
        </ElButton>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="entry in mcpList"
          :key="entry.name"
          class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between gap-3"
        >
          <!-- 左侧：图标 + 名称 + 连接信息 -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900/30"
            >
              <ElIcon class="text-primary-600 dark:text-primary-400 text-xl">
                <Connection />
              </ElIcon>
            </div>
            <div class="min-w-0">
              <div class="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {{ entry.name }}
                <McpStatusBadge :status="statusMap[entry.name]" />
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{
                  entry.config.type === 'remote'
                    ? entry.config.url
                    : (entry.config.command || []).join(' ')
                }}
              </div>
            </div>
          </div>

          <!-- 右侧：操作按钮 -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- 已连接时显示移除授权（仅 remote 类型） -->
            <ElButton
              v-if="statusMap[entry.name]?.status === 'connected' && entry.config.type === 'remote'"
              size="small"
              @click="handleAuthRemove(entry.name)"
            >
              {{ $t('mcp.authRemoveButton') }}
            </ElButton>
            <!-- 需要授权或 OAuth 配置的 remote MCP 未连接时显示授权按钮 -->
            <ElButton
              v-else-if="
                entry.config.type === 'remote' &&
                entry.config.oauth &&
                statusMap[entry.name]?.status !== 'connected'
              "
              type="primary"
              size="small"
              @click="handleAuth(entry.name)"
            >
              {{ $t('mcp.authButton') }}
            </ElButton>
            <ElButton type="danger" text size="small" @click="handleRemove(entry.name)">
              {{ $t('mcp.remove') }}
            </ElButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加 MCP 模态框 -->
    <McpAddModal v-model="showAddModal" @added="handleAdded" />

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
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus, Loading, Connection } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { McpItem, McpStatus } from '@renderer/types';

const { t } = useI18n();
import McpAddModal from '@renderer/components/mcp/McpAddModal.vue';
import McpAuthDialog from '@renderer/components/mcp/McpAuthDialog.vue';
import McpStatusBadge from '@renderer/components/mcp/McpStatusBadge.vue';

const mcpList = ref<McpItem[]>([]);
const statusMap = ref<Record<string, McpStatus>>({});
const loading = ref(true);
const loadError = ref('');
const showAddModal = ref(false);

// auth 对话框状态
const showAuthDialog = ref(false);
const authingName = ref('');
const authorizationUrl = ref('');
const viaCli = ref(false);
const authRefreshing = ref(false);

async function loadMcp() {
  if (typeof window.opencode === 'undefined') return;
  loading.value = true;
  loadError.value = '';
  try {
    const listRes = await window.opencode.mcpList();
    if (listRes.error) {
      loadError.value = listRes.error;
      mcpList.value = [];
    } else if (listRes.data && Array.isArray(listRes.data)) {
      mcpList.value = listRes.data as McpItem[];
    }
  } finally {
    loading.value = false;
  }
  // 状态加载不阻塞列表展示，后台异步获取
  try {
    const statusRes = await window.opencode.mcpStatus();
    if (statusRes.data && typeof statusRes.data === 'object') {
      statusMap.value = statusRes.data as Record<string, McpStatus>;
    }
  } catch {
    // 状态获取失败不影响列表展示
  }
}

async function handleRemove(name: string) {
  if (typeof window.opencode === 'undefined') return;
  try {
    const res = await window.opencode.mcpRemove(name);
    if (res.success) {
      await loadMcp();
    } else if (res.error) {
      loadError.value = res.error;
    }
  } catch (e) {
    loadError.value = (e as Error).message;
  }
}

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

async function handleAuthRemove(name: string) {
  if (typeof window.opencode === 'undefined') return;
  try {
    const res = await window.opencode.mcpAuthRemove(name);
    if (res.error) {
      ElMessage.error(res.error);
    } else {
      ElMessage.success(t('mcp.authRemoved'));
      await loadMcp();
    }
  } catch (e) {
    ElMessage.error((e as Error).message);
  }
}

async function doAuthReconnect() {
  if (!authingName.value || typeof window.opencode === 'undefined') return;
  try {
    await window.opencode.mcpReconnect(authingName.value);
    await loadMcp();
  } catch {
    // 忽略
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

async function onAuthDialogClose(visible: boolean) {
  showAuthDialog.value = visible;
  if (!visible) {
    if (viaCli.value) await doAuthReconnect();
    else await loadMcp();
  }
}

function handleAdded() {
  showAddModal.value = false;
  loadMcp();
}

onMounted(() => {
  loadMcp();
});
</script>

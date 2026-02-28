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

      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        show-icon
        class="mb-4"
      />

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ $t('mcp.connectedCount', { count: mcpList.length }) }}
        </span>
        <el-button type="primary" size="small" @click="showAddModal = true">
          <el-icon class="mr-1"><Plus /></el-icon>
          {{ $t('mcp.addServer') }}
        </el-button>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <el-icon class="animate-spin text-2xl"><Loading /></el-icon>
      </div>

      <div v-else-if="!mcpList.length" class="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{{ $t('mcp.noServers') }}</p>
        <p class="mt-2 text-sm">{{ $t('mcp.noServersHint') }}</p>
        <el-button type="primary" class="mt-4" @click="showAddModal = true">
          {{ $t('mcp.addServer') }}
        </el-button>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="entry in mcpList"
          :key="entry.name"
          class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900/30"
            >
              <el-icon class="text-primary-600 dark:text-primary-400 text-xl">
                <Connection />
              </el-icon>
            </div>
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100">{{ entry.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ entry.config.type === 'remote' ? entry.config.url : (entry.config.command || []).join(' ') }}
              </div>
            </div>
          </div>
          <el-button type="danger" text size="small" @click="handleRemove(entry.name)">
            {{ $t('mcp.remove') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加 MCP 模态框 -->
    <McpAddModal
      v-model="showAddModal"
      @added="handleAdded"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, Loading, Connection } from '@element-plus/icons-vue';
interface McpEntry {
  name: string;
  config: { type: string; url?: string; command?: string[] };
  source?: string;
}
import McpAddModal from '@renderer/components/mcp/McpAddModal.vue';

const mcpList = ref<McpEntry[]>([]);
const loading = ref(true);
const loadError = ref('');
const showAddModal = ref(false);
async function loadMcp() {
  if (typeof window.opencode === 'undefined') return;
  loading.value = true;
  loadError.value = '';
  try {
    const res = await window.opencode.mcpList();
    if (res.error) {
      loadError.value = res.error;
      mcpList.value = [];
    } else if (res.data && Array.isArray(res.data)) {
      mcpList.value = res.data as McpEntry[];
    }
  } finally {
    loading.value = false;
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

function handleAdded() {
  showAddModal.value = false;
  loadMcp();
}

onMounted(() => {
  loadMcp();
});
</script>

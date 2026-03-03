<template>
  <ElDialog
    :model-value="modelValue"
    :title="$t('mcp.auth.title', { name })"
    width="480px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="onClosed"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t('mcp.auth.hint') }}
      </p>

      <!-- 状态提示 -->
      <div
        class="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-sm text-blue-700 dark:text-blue-300"
      >
        <ElIcon :size="15"><InfoFilled /></ElIcon>
        <span>{{ viaCli ? $t('mcp.auth.cliHint') : $t('mcp.auth.oauthHint') }}</span>
      </div>

      <!-- 授权 URL（仅非 CLI 模式） -->
      <div v-if="authorizationUrl" class="space-y-1.5">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ $t('mcp.auth.manualHint') }}
        </p>
        <div
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <span class="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
            {{ authorizationUrl }}
          </span>
          <ElButton type="primary" text size="small" class="shrink-0" @click="copyUrl">
            <ElIcon><DocumentCopy /></ElIcon>
          </ElButton>
        </div>
      </div>

      <!-- loading 状态（还没拿到 URL 且非 CLI 模式） -->
      <div v-else-if="!viaCli" class="flex justify-center py-4">
        <ElIcon class="animate-spin text-xl text-gray-400"><Loading /></ElIcon>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <ElButton v-if="authorizationUrl && !viaCli" size="small" @click="openUrl">
          {{ $t('mcp.auth.reopenBrowser') }}
        </ElButton>
        <ElButton v-else-if="viaCli" size="small" :loading="refreshing" @click="emit('refresh')">
          {{ $t('mcp.auth.refreshStatus') }}
        </ElButton>
        <span v-else />
        <ElButton type="primary" @click="$emit('update:modelValue', false)">
          {{ $t('mcp.auth.close') }}
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { InfoFilled, DocumentCopy, Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const { t } = useI18n();
const props = defineProps<{
  modelValue: boolean;
  name: string;
  authorizationUrl?: string;
  viaCli?: boolean;
  refreshing?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  refresh: [];
}>();

function onClosed() {
  // 关闭后由父组件决定是否刷新状态
}

async function copyUrl() {
  if (!props.authorizationUrl) return;
  try {
    await navigator.clipboard.writeText(props.authorizationUrl);
    ElMessage.success(t('mcp.auth.copied'));
  } catch {
    ElMessage.error(t('mcp.auth.copyFailed'));
  }
}

function openUrl() {
  if (props.authorizationUrl) {
    window.open(props.authorizationUrl, '_blank');
  }
}
</script>

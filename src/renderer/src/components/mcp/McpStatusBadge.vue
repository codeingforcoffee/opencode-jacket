<template>
  <span
    v-if="status"
    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
    :class="badgeClass"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { McpStatus } from '@renderer/types';

const { t } = useI18n();
const props = defineProps<{
  status?: McpStatus;
}>();

const badgeClass = computed(() => {
  switch (props.status?.status) {
    case 'connected':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'disabled':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
    case 'needs_auth':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'failed':
    case 'needs_client_registration':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
  }
});

const label = computed(() => {
  switch (props.status?.status) {
    case 'connected':
      return t('mcp.status.connected');
    case 'disabled':
      return t('mcp.status.disabled');
    case 'needs_auth':
      return t('mcp.status.needsAuth');
    case 'failed':
      return t('mcp.status.failed');
    case 'needs_client_registration':
      return t('mcp.status.needsRegistration');
    default:
      return t('mcp.status.unknown');
  }
});
</script>

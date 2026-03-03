<template>
  <Teleport to="body">
    <div v-if="request" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
          {{ $t('permission.title') }}
        </h3>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{{ $t('permission.hint') }}</p>

        <div class="mb-4 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
          <div v-if="request.tool" class="mb-2 flex items-start gap-2">
            <span class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 w-14">{{
              $t('permission.tool')
            }}</span>
            <span class="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{{
              request.tool
            }}</span>
          </div>
          <div v-if="request.filename" class="mb-2 flex items-start gap-2">
            <span class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 w-14">{{
              $t('permission.file')
            }}</span>
            <span class="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{{
              request.filename
            }}</span>
          </div>
          <div v-if="request.reason" class="flex items-start gap-2">
            <span class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 w-14">{{
              $t('permission.reason')
            }}</span>
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ request.reason }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            class="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            @click="reply('once')"
          >
            {{ $t('permission.once') }}
          </button>
          <button
            class="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            @click="reply('always')"
          >
            {{ $t('permission.always') }}
          </button>
          <button
            class="flex-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700"
            @click="reply('reject')"
          >
            {{ $t('permission.reject') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { PermissionRequest } from '@renderer/types';

const props = defineProps<{
  request: PermissionRequest | null;
}>();

const emit = defineEmits<{
  replied: [requestID: string, reply: 'once' | 'always' | 'reject'];
}>();

async function reply(choice: 'once' | 'always' | 'reject'): Promise<void> {
  if (!props.request) return;
  const { requestID } = props.request;
  try {
    await window.opencode.permissionReply(requestID, choice);
  } catch (err) {
    console.error('[PermissionDialog] reply failed:', err);
  }
  emit('replied', requestID, choice);
}
</script>

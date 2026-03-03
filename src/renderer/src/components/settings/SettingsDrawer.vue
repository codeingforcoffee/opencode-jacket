<template>
  <div class="p-4">
    <ElForm label-position="top" class="space-y-4">
      <ElFormItem :label="$t('settings.hostname')">
        <ElInput v-model="hostname" placeholder="127.0.0.1" />
      </ElFormItem>
      <ElFormItem :label="$t('settings.port')">
        <ElInputNumber v-model="port" :min="1" :max="65535" class="w-full" />
      </ElFormItem>
      <ElFormItem>
        <ElButton
          v-if="!connectionStore.connected"
          type="primary"
          :loading="connecting"
          @click="handleConnect"
        >
          {{ $t('settings.connect') }}
        </ElButton>
        <ElButton v-else type="danger" :loading="disconnecting" @click="handleDisconnect">
          {{ $t('settings.disconnect') }}
        </ElButton>
        <ElButton :loading="checking" @click="handleHealthCheck">
          {{ $t('settings.healthCheck') }}
        </ElButton>
      </ElFormItem>
    </ElForm>
    <ElAlert
      v-if="healthResult"
      :title="healthResult.healthy ? $t('settings.healthOk') : $t('settings.healthFail')"
      :type="healthResult.healthy ? 'success' : 'error'"
      :description="
        healthResult.healthy
          ? healthResult.version
            ? $t('settings.healthVersion', { version: healthResult.version })
            : undefined
          : healthResult.error || $t('settings.healthError')
      "
      show-icon
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useConnectionStore } from '@renderer/stores/connection';

const connectionStore = useConnectionStore();
const hostname = ref('127.0.0.1');
const port = ref(4096);
const connecting = ref(false);
const disconnecting = ref(false);
const checking = ref(false);
const healthResult = ref<{ healthy: boolean; version?: string; error?: string } | null>(null);

async function handleConnect() {
  connecting.value = true;
  healthResult.value = null;
  try {
    const options = { hostname: hostname.value, port: port.value };
    const res = await connectionStore.connect(options);
    if (res.success) {
      healthResult.value = await connectionStore.checkHealth();
    } else {
      healthResult.value = { healthy: false, error: res.error };
    }
  } finally {
    connecting.value = false;
  }
}

async function handleDisconnect() {
  disconnecting.value = true;
  healthResult.value = null;
  try {
    await connectionStore.disconnect();
  } finally {
    disconnecting.value = false;
  }
}

async function handleHealthCheck() {
  checking.value = true;
  try {
    healthResult.value = await connectionStore.checkHealth();
  } finally {
    checking.value = false;
  }
}
</script>

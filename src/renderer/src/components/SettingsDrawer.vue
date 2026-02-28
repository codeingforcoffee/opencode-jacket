<template>
  <div class="p-4">
    <el-form label-position="top" class="space-y-4">
      <el-form-item :label="$t('settings.hostname')">
        <el-input v-model="hostname" placeholder="127.0.0.1" />
      </el-form-item>
      <el-form-item :label="$t('settings.port')">
        <el-input-number v-model="port" :min="1" :max="65535" class="w-full" />
      </el-form-item>
      <el-form-item>
        <el-button
          v-if="!connectionStore.connected"
          type="primary"
          :loading="connecting"
          @click="handleConnect"
        >
          {{ $t('settings.connect') }}
        </el-button>
        <el-button v-else type="danger" :loading="disconnecting" @click="handleDisconnect">
          {{ $t('settings.disconnect') }}
        </el-button>
        <el-button :loading="checking" @click="handleHealthCheck">
          {{ $t('settings.healthCheck') }}
        </el-button>
      </el-form-item>
    </el-form>
    <el-alert
      v-if="healthResult"
      :title="healthResult.healthy ? 'OpenCode 服务正常' : 'OpenCode 服务不可用'"
      :type="healthResult.healthy ? 'success' : 'error'"
      :description="
        healthResult.healthy
          ? healthResult.version
            ? `版本: ${healthResult.version}`
            : undefined
          : healthResult.error ||
            'OpenCode 连接失败。本应用已内置 OpenCode，首次使用需在终端运行 opencode auth login 配置 LLM'
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

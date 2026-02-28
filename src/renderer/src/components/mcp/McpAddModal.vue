<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('mcp.addModal.title')"
    width="480px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @close="reset"
  >
    <el-form label-position="top" class="space-y-4">
      <el-form-item :label="$t('mcp.addModal.name')" required>
        <el-input
          v-model="name"
          :placeholder="$t('mcp.addModal.namePlaceholder')"
          maxlength="64"
          show-word-limit
        />
      </el-form-item>
      <el-form-item :label="$t('mcp.addModal.type')">
        <el-radio-group v-model="serverType">
          <el-radio label="remote">{{ $t('mcp.addModal.typeRemote') }}</el-radio>
          <el-radio label="local">{{ $t('mcp.addModal.typeLocal') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item
        v-if="serverType === 'remote'"
        :label="$t('mcp.addModal.url')"
        required
      >
        <el-input
          v-model="url"
          placeholder="https://mcp.example.com/sse"
        />
      </el-form-item>
      <el-form-item
        v-else
        :label="$t('mcp.addModal.command')"
        required
      >
        <el-input
          v-model="command"
          type="textarea"
          :placeholder="$t('mcp.addModal.commandPlaceholder')"
          :rows="2"
        />
      </el-form-item>
      <el-alert v-if="error" :title="error" type="error" show-icon />
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ $t('mcp.addModal.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ $t('mcp.addModal.add') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'added'): void }>();

const name = ref('');
const serverType = ref<'remote' | 'local'>('remote');
const url = ref('');
const command = ref('');
const error = ref('');
const submitting = ref(false);

function reset() {
  name.value = '';
  serverType.value = 'remote';
  url.value = '';
  command.value = '';
  error.value = '';
}

watch(() => props.modelValue, (v) => {
  if (!v) reset();
});

async function handleSubmit() {
  error.value = '';
  const trimmedName = name.value.trim();
  if (!trimmedName) {
    error.value = 'MCP 名称不能为空';
    return;
  }
  if (serverType.value === 'remote') {
    const trimmedUrl = url.value.trim();
    if (!trimmedUrl) {
      error.value = '请输入 MCP 服务器 URL';
      return;
    }
  } else {
    const trimmedCmd = command.value.trim();
    if (!trimmedCmd) {
      error.value = '请输入启动命令';
      return;
    }
  }

  if (typeof window.opencode === 'undefined') return;
  submitting.value = true;
  try {
    const config =
      serverType.value === 'remote'
        ? { type: 'remote' as const, url: url.value.trim() }
        : { type: 'local' as const, command: command.value.trim().split(/\s+/) };
    const res = await window.opencode.mcpAdd(trimmedName, config);
    if (res.error) {
      error.value = res.error;
    } else {
      emit('added');
      emit('update:modelValue', false);
    }
  } finally {
    submitting.value = false;
  }
}
</script>

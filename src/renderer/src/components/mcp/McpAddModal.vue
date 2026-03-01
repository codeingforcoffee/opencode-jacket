<template>
  <ElDialog
    :model-value="modelValue"
    :title="$t('mcp.addModal.title')"
    width="480px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @close="reset"
  >
    <ElForm label-position="top" class="space-y-4">
      <ElFormItem :label="$t('mcp.addModal.name')" required>
        <ElInput
          v-model="name"
          :placeholder="$t('mcp.addModal.namePlaceholder')"
          maxlength="64"
          show-word-limit
        />
      </ElFormItem>
      <ElFormItem :label="$t('mcp.addModal.type')">
        <ElRadioGroup v-model="serverType">
          <ElRadio label="remote">{{ $t('mcp.addModal.typeRemote') }}</ElRadio>
          <ElRadio label="local">{{ $t('mcp.addModal.typeLocal') }}</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem v-if="serverType === 'remote'" :label="$t('mcp.addModal.url')" required>
        <ElInput v-model="url" placeholder="https://mcp.example.com/sse" />
      </ElFormItem>
      <ElFormItem v-else :label="$t('mcp.addModal.command')" required>
        <ElInput
          v-model="command"
          type="textarea"
          :placeholder="$t('mcp.addModal.commandPlaceholder')"
          :rows="2"
        />
      </ElFormItem>
      <ElAlert v-if="error" :title="error" type="error" show-icon />
    </ElForm>
    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">{{ $t('mcp.addModal.cancel') }}</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">
        {{ $t('mcp.addModal.add') }}
      </ElButton>
    </template>
  </ElDialog>
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

watch(
  () => props.modelValue,
  (v) => {
    if (!v) reset();
  }
);

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

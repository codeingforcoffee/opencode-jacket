<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('expert.addModal.title')"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @close="reset"
  >
    <el-form label-position="top" class="space-y-4">
      <el-form-item :label="$t('expert.name')" required>
        <el-input
          v-model="name"
          placeholder="如：代码助手、文档专家"
          maxlength="32"
          show-word-limit
        />
      </el-form-item>
      <el-form-item :label="$t('expert.mcpSelect')">
        <el-select
          v-model="mcpIds"
          multiple
          collapse-tags
          placeholder="选择要启用的 MCP（可选）"
          class="w-full"
        >
          <el-option
            v-for="m in mcpList"
            :key="m.name"
            :label="m.name"
            :value="m.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('expert.prompt')">
        <el-input
          v-model="prompt"
          type="textarea"
          :rows="6"
          placeholder="设置系统提示词，定义专家角色与行为..."
        />
      </el-form-item>
      <el-alert v-if="error" :title="error" type="error" show-icon />
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ $t('expert.addModal.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSave">
        {{ $t('expert.addModal.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useExpertStore } from '@renderer/stores/expert';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'saved'): void }>();

const expertStore = useExpertStore();
const mcpList = ref<Array<{ name: string }>>([]);
const name = ref('');
const mcpIds = ref<string[]>([]);
const prompt = ref('');
const error = ref('');
const submitting = ref(false);

function reset() {
  name.value = '';
  mcpIds.value = [];
  prompt.value = '';
  error.value = '';
}

watch(
  () => props.modelValue,
  async (v) => {
    if (!v) {
      reset();
      return;
    }
    if (typeof window.opencode !== 'undefined') {
      const res = await window.opencode.mcpList();
      if (res.data && Array.isArray(res.data)) {
        mcpList.value = (res.data as Array<{ name: string }>).map((x) => ({ name: x.name }));
      }
    }
  }
);

async function handleSave() {
  error.value = '';
  const trimmedName = name.value.trim();
  if (!trimmedName) {
    error.value = '请输入专家名称';
    return;
  }
  submitting.value = true;
  try {
    expertStore.addExpert({
      name: trimmedName,
      prompt: prompt.value.trim(),
      mcpIds: [...mcpIds.value],
    });
    emit('saved');
    emit('update:modelValue', false);
  } finally {
    submitting.value = false;
  }
}
</script>

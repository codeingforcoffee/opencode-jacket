<template>
  <ElDialog
    :model-value="modelValue"
    :title="editingExpert ? $t('expert.editModal.title') : $t('expert.addModal.title')"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @close="reset"
  >
    <ElForm label-position="top" class="space-y-4">
      <ElFormItem :label="$t('expert.name')" required>
        <ElInput
          v-model="name"
          :placeholder="$t('expert.addModal.namePlaceholder')"
          maxlength="32"
          show-word-limit
        />
      </ElFormItem>
      <ElFormItem :label="$t('expert.mcpSelect')">
        <ElSelect
          v-model="mcpIds"
          multiple
          collapse-tags
          :placeholder="$t('expert.addModal.mcpPlaceholder')"
          class="w-full"
        >
          <ElOption v-for="m in mcpList" :key="m.name" :label="m.name" :value="m.name" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem :label="$t('expert.prompt')">
        <ElInput
          v-model="prompt"
          type="textarea"
          :rows="6"
          :placeholder="$t('expert.addModal.promptPlaceholder')"
        />
      </ElFormItem>
      <ElAlert v-if="error" :title="error" type="error" show-icon />
    </ElForm>
    <template #footer>
      <ElButton @click="emit('update:modelValue', false)">{{
        $t('expert.addModal.cancel')
      }}</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSave">
        {{ $t('expert.addModal.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useExpertStore, type ExpertConfig } from '@renderer/stores/expert';

const { t } = useI18n();
const props = defineProps<{ modelValue: boolean; editingExpert?: ExpertConfig }>();
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
    if (props.editingExpert) {
      name.value = props.editingExpert.name;
      mcpIds.value = [...props.editingExpert.mcpIds];
      prompt.value = props.editingExpert.prompt;
    } else {
      reset();
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
    error.value = t('expert.addModal.nameRequired');
    return;
  }
  submitting.value = true;
  try {
    if (props.editingExpert) {
      expertStore.updateExpert(props.editingExpert.id, {
        name: trimmedName,
        prompt: prompt.value.trim(),
        mcpIds: [...mcpIds.value],
      });
    } else {
      expertStore.addExpert({
        name: trimmedName,
        prompt: prompt.value.trim(),
        mcpIds: [...mcpIds.value],
      });
    }
    emit('saved');
    emit('update:modelValue', false);
  } finally {
    submitting.value = false;
  }
}
</script>

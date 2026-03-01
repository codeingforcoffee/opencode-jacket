<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-6 overflow-y-auto">
    <div class="max-w-3xl mx-auto w-full space-y-6">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ $t('expert.title') }}
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ $t('expert.subtitle') }}
        </p>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ expertStore.experts.length }} 个专家
        </span>
        <ElButton type="primary" size="small" @click="showAddModal = true">
          <ElIcon class="mr-1"><Plus /></ElIcon>
          {{ $t('expert.addExpert') }}
        </ElButton>
      </div>

      <div
        v-if="!expertStore.experts.length"
        class="text-center py-12 text-gray-500 dark:text-gray-400"
      >
        <p>{{ $t('expert.noExperts') }}</p>
        <p class="mt-2 text-sm">{{ $t('expert.noExpertsHint') }}</p>
        <ElButton type="primary" class="mt-4" @click="showAddModal = true">
          {{ $t('expert.addExpert') }}
        </ElButton>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="expert in expertStore.experts"
          :key="expert.id"
          class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 dark:text-gray-100">{{ expert.name }}</div>
              <div
                v-if="expert.prompt"
                class="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
              >
                {{ expert.prompt }}
              </div>
              <div v-if="expert.mcpIds?.length" class="mt-2 flex flex-wrap gap-1">
                <ElTag v-for="m in expert.mcpIds" :key="m" size="small">{{ m }}</ElTag>
              </div>
            </div>
            <ElButton type="danger" text size="small" @click="handleRemove(expert.id)">
              {{ $t('expert.remove') }}
            </ElButton>
          </div>
        </div>
      </div>
    </div>

    <ExpertAddModal v-model="showAddModal" @saved="handleSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { useExpertStore } from '@renderer/stores/expert';
import ExpertAddModal from '@renderer/components/expert/ExpertAddModal.vue';

const expertStore = useExpertStore();
const showAddModal = ref(false);

function handleRemove(id: string) {
  expertStore.removeExpert(id);
}

function handleSaved() {
  showAddModal.value = false;
}
</script>

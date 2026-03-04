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
          {{ $t('expert.count', { n: expertStore.experts.length }) }}
        </span>
        <ElButton type="primary" size="small" @click="openAddModal">
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
        <ElButton type="primary" class="mt-4" @click="openAddModal">
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
            <div class="flex items-center gap-1 shrink-0">
              <ElButton type="primary" size="small" @click="handleEnter(expert)">
                {{ $t('expert.enter') }}
              </ElButton>
              <ElButton size="small" @click="handleEdit(expert)">
                {{ $t('expert.edit') }}
              </ElButton>
              <ElButton type="danger" text size="small" @click="handleRemove(expert.id)">
                {{ $t('expert.remove') }}
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ExpertAddModal v-model="showAddModal" :editing-expert="editingExpert" @saved="handleSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useExpertStore, type ExpertConfig } from '@renderer/stores/expert';
import { useSessionStore } from '@renderer/stores/session';
import ExpertAddModal from '@renderer/components/expert/ExpertAddModal.vue';

const router = useRouter();
const expertStore = useExpertStore();
const sessionStore = useSessionStore();

const showAddModal = ref(false);
const editingExpert = ref<ExpertConfig | undefined>(undefined);

function openAddModal() {
  editingExpert.value = undefined;
  showAddModal.value = true;
}

function handleEdit(expert: ExpertConfig) {
  editingExpert.value = expert;
  showAddModal.value = true;
}

function handleRemove(id: string) {
  expertStore.removeExpert(id);
}

function handleSaved() {
  showAddModal.value = false;
  editingExpert.value = undefined;
}

async function handleEnter(expert: ExpertConfig) {
  if (typeof window.opencode === 'undefined') return;

  let sessionId = expert.sessionId;

  if (sessionId) {
    const res = await window.opencode.sessionGet(sessionId);
    if (res.error || !res.data) {
      sessionId = undefined;
    }
  }

  if (!sessionId) {
    const res = await window.opencode.sessionCreate({ title: expert.name });
    if (res.error || !res.data) {
      ElMessage.error(res.error ?? '创建会话失败');
      return;
    }
    const newSession = res.data as { id: string; title?: string };
    sessionId = newSession.id;
    sessionStore.sessions.push(newSession);
    expertStore.setExpertSession(expert.id, sessionId);
  }

  sessionStore.setCurrentSession(sessionId);
  expertStore.setCurrentExpert(expert.id);
  router.push('/chat');
}
</script>

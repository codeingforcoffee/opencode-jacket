<template>
  <aside
    class="w-56 flex flex-col shrink-0 border-r border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-[#111]"
  >
    <!-- 顶部：品牌 + 新建会话 -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">OpenCode</div>
      <ElButton type="primary" size="small" class="w-full" @click="handleNewSession">
        {{ $t('chat.newSession') }}
      </ElButton>
    </div>

    <!-- 会话列表（始终显示，便于从任意页面返回对话） -->
    <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-for="s in sessionStore.sessions"
          :key="s.id"
          class="group px-3 py-2 mx-2 rounded-md cursor-pointer text-sm transition-colors flex items-center justify-between"
          :class="
            sessionStore.currentSessionId === s.id
              ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="handleSelectSession(s.id)"
        >
          <span class="truncate flex-1">{{ s.title || s.id.slice(0, 8) }}</span>
          <div
            v-if="sessionStore.currentSessionId === s.id"
            class="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0"
            @click.stop
          >
            <ElButton text size="small" type="primary" @click="handleRenameSession(s)">
              <ElIcon><Edit /></ElIcon>
            </ElButton>
            <ElButton text size="small" type="danger" @click="handleDeleteSession(s)">
              <ElIcon><Delete /></ElIcon>
            </ElButton>
          </div>
        </div>
        <div
          v-if="!sessionStore.sessions.length"
          class="px-3 py-4 text-center text-sm text-gray-400 dark:text-gray-500"
        >
          {{ $t('chat.newSession') }}
        </div>
      </div>
    </div>

    <!-- 左下角：MCP、专家探索、设置（仿 ECOwork 样式） -->
    <div class="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 space-y-1">
      <router-link
        v-for="nav in bottomNavItems"
        :key="nav.path"
        :to="nav.path"
        class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
        :class="
          $route.path === nav.path
            ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        "
      >
        <ElIcon class="shrink-0" :size="18">
          <component :is="nav.icon" />
        </ElIcon>
        <span>{{ $t(nav.labelKey) }}</span>
      </router-link>
      <!-- 连接状态指示灯（仅绿/红灯，红灯悬浮提示） -->
      <div
        class="flex items-center gap-3 px-3 py-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800"
      >
        <ElTooltip
          v-if="!connectionStore.connected"
          :content="$t('settings.disconnectedHint')"
          placement="top"
        >
          <span class="inline-block w-2 h-2 rounded-full bg-red-500 cursor-help shrink-0" />
        </ElTooltip>
        <span v-else class="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
      </div>
    </div>

    <!-- 重命名会话对话框 -->
    <ElDialog
      v-model="renameDialogVisible"
      :title="$t('chat.rename')"
      width="360px"
      @close="renameTarget = null"
    >
      <ElInput
        v-model="renameInput"
        :placeholder="$t('chat.rename')"
        maxlength="64"
        show-word-limit
      />
      <template #footer>
        <ElButton @click="renameDialogVisible = false">{{ $t('mcp.addModal.cancel') }}</ElButton>
        <ElButton type="primary" :loading="renameLoading" @click="confirmRename">
          {{ $t('chat.rename') }}
        </ElButton>
      </template>
    </ElDialog>

    <!-- 删除确认 -->
    <ElDialog
      v-model="deleteDialogVisible"
      :title="$t('chat.delete')"
      width="360px"
      @close="deleteTarget = null"
    >
      <p class="text-gray-600 dark:text-gray-400">
        {{ $t('chat.delete') }}「{{ deleteTarget?.title || deleteTarget?.id?.slice(0, 8) }}」？
      </p>
      <template #footer>
        <ElButton @click="deleteDialogVisible = false">{{ $t('mcp.addModal.cancel') }}</ElButton>
        <ElButton type="danger" :loading="deleteLoading" @click="confirmDelete">
          {{ $t('chat.delete') }}
        </ElButton>
      </template>
    </ElDialog>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Edit, Delete, Connection, MagicStick, Setting } from '@element-plus/icons-vue';
import { useSessionStore } from '@renderer/stores/session';
import { useConnectionStore } from '@renderer/stores/connection';

const router = useRouter();
const sessionStore = useSessionStore();
const connectionStore = useConnectionStore();

/** 左下角导航：MCP、专家探索、设置（仿 ECOwork 样式） */
const bottomNavItems: { path: string; labelKey: string; icon: object }[] = [
  { path: '/mcp', labelKey: 'nav.mcp', icon: Connection },
  { path: '/expert', labelKey: 'nav.expert', icon: MagicStick },
  { path: '/settings', labelKey: 'nav.settings', icon: Setting },
];

const renameDialogVisible = ref(false);
const renameTarget = ref<{ id: string; title?: string } | null>(null);
const renameInput = ref('');
const renameLoading = ref(false);

const deleteDialogVisible = ref(false);
const deleteTarget = ref<{ id: string; title?: string } | null>(null);
const deleteLoading = ref(false);

async function handleNewSession() {
  const session = await sessionStore.createSession();
  if (session) {
    router.push('/chat');
  }
}

function handleSelectSession(id: string) {
  sessionStore.setCurrentSession(id);
  router.push('/chat');
}

function handleRenameSession(s: { id: string; title?: string }) {
  renameTarget.value = s;
  renameInput.value = s.title || '';
  renameDialogVisible.value = true;
}

async function confirmRename() {
  const target = renameTarget.value;
  if (!target || typeof window.opencode === 'undefined') return;
  const title = renameInput.value.trim();
  if (!title) return;
  renameLoading.value = true;
  try {
    const res = await window.opencode.sessionUpdate({ sessionId: target.id, title });
    if (!res.error) {
      sessionStore.updateSessionTitle(target.id, title);
      renameDialogVisible.value = false;
    }
  } finally {
    renameLoading.value = false;
  }
}

function handleDeleteSession(s: { id: string; title?: string }) {
  deleteTarget.value = s;
  deleteDialogVisible.value = true;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || typeof window.opencode === 'undefined') return;
  deleteLoading.value = true;
  try {
    const res = await window.opencode.sessionDelete(target.id);
    if (res.success) {
      sessionStore.removeSession(target.id);
      deleteDialogVisible.value = false;
    }
  } finally {
    deleteLoading.value = false;
  }
}
</script>

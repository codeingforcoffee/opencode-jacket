<template>
  <aside
    class="w-56 flex flex-col shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
  >
    <!-- 导航 -->
    <div class="p-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <router-link
        v-for="nav in navItems"
        :key="nav.path"
        :to="nav.path"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors mb-1"
        :class="
          $route.path === nav.path
            ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        "
      >
        <span>{{ $t(nav.labelKey) }}</span>
      </router-link>
    </div>

    <!-- 会话列表区域（仅对话页显示） -->
    <div v-show="isChatRoute" class="flex-1 min-h-0 flex flex-col">
      <div class="p-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <el-button type="primary" size="small" class="w-full" @click="handleNewSession">
          {{ $t('chat.newSession') }}
        </el-button>
      </div>
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
          @click="sessionStore.setCurrentSession(s.id)"
        >
          <span class="truncate flex-1">{{ s.title || s.id.slice(0, 8) }}</span>
          <div
            v-if="sessionStore.currentSessionId === s.id"
            class="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0"
            @click.stop
          >
            <el-button
              text
              size="small"
              type="primary"
              @click="handleRenameSession(s)"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              text
              size="small"
              type="danger"
              @click="handleDeleteSession(s)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
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

    <!-- 功能区 -->
    <div class="shrink-0 border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
      <div class="flex items-center gap-2 px-2 py-1.5">
        <el-tag :type="connectionStore.connected ? 'success' : 'info'" size="small" class="flex-1">
          {{ connectionStore.connected ? $t('settings.connected') : $t('settings.disconnected') }}
        </el-tag>
        <el-button circle size="small" @click="themeStore.toggleTheme">
          {{ themeStore.theme === 'dark' ? '☀' : '🌙' }}
        </el-button>
      </div>
      <el-button
        text
        class="w-full justify-start"
        :type="showSettings ? 'primary' : undefined"
        @click="showSettings = !showSettings"
      >
        <span class="mr-2">⚙</span>
        {{ $t('nav.settings') }}
      </el-button>
    </div>

    <!-- 设置抽屉 -->
    <el-drawer
      v-model="showSettings"
      :title="$t('settings.title')"
      direction="rtl"
      size="320px"
      class="settings-drawer"
    >
      <SettingsDrawer />
    </el-drawer>

    <!-- 重命名会话对话框 -->
    <el-dialog
      v-model="renameDialogVisible"
      :title="$t('chat.rename')"
      width="360px"
      @close="renameTarget = null"
    >
      <el-input v-model="renameInput" :placeholder="$t('chat.rename')" maxlength="64" show-word-limit />
      <template #footer>
        <el-button @click="renameDialogVisible = false">{{ $t('mcp.addModal.cancel') }}</el-button>
        <el-button type="primary" :loading="renameLoading" @click="confirmRename">
          {{ $t('chat.rename') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认 -->
    <el-dialog
      v-model="deleteDialogVisible"
      :title="$t('chat.delete')"
      width="360px"
      @close="deleteTarget = null"
    >
      <p class="text-gray-600 dark:text-gray-400">
        {{ $t('chat.delete') }}「{{ deleteTarget?.title || deleteTarget?.id?.slice(0, 8) }}」？
      </p>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">{{ $t('mcp.addModal.cancel') }}</el-button>
        <el-button type="danger" :loading="deleteLoading" @click="confirmDelete">
          {{ $t('chat.delete') }}
        </el-button>
      </template>
    </el-dialog>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Edit, Delete } from '@element-plus/icons-vue';
import { useSessionStore } from '@renderer/stores/session';
import { useConnectionStore } from '@renderer/stores/connection';
import { useThemeStore } from '@renderer/stores/theme';
import SettingsDrawer from './SettingsDrawer.vue';

const route = useRoute();
const sessionStore = useSessionStore();
const connectionStore = useConnectionStore();
const themeStore = useThemeStore();
const showSettings = ref(false);

const navItems: { path: string; labelKey: string }[] = [
  { path: '/chat', labelKey: 'nav.chat' },
  { path: '/mcp', labelKey: 'nav.mcp' },
  { path: '/expert', labelKey: 'nav.expert' },
];

const isChatRoute = computed(() => route.path === '/chat');

const renameDialogVisible = ref(false);
const renameTarget = ref<{ id: string; title?: string } | null>(null);
const renameInput = ref('');
const renameLoading = ref(false);

const deleteDialogVisible = ref(false);
const deleteTarget = ref<{ id: string; title?: string } | null>(null);
const deleteLoading = ref(false);

async function handleNewSession() {
  await sessionStore.createSession();
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

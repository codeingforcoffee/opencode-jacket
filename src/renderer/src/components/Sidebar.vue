<template>
  <aside
    class="w-56 flex flex-col shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
  >
    <!-- 会话列表区域（可滚动） -->
    <div class="flex-1 min-h-0 flex flex-col">
      <div class="p-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <el-button type="primary" size="small" class="w-full" @click="handleNewSession">
          {{ $t('chat.newSession') }}
        </el-button>
      </div>
      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-for="s in sessionStore.sessions"
          :key="s.id"
          class="px-3 py-2 mx-2 rounded-md cursor-pointer text-sm transition-colors"
          :class="
            sessionStore.currentSessionId === s.id
              ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="sessionStore.setCurrentSession(s.id)"
        >
          {{ s.title || s.id.slice(0, 8) }}
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
      <el-button text class="w-full justify-start" disabled>
        <span class="mr-2">🔌</span>
        MCP
      </el-button>
      <el-button text class="w-full justify-start" disabled>
        <span class="mr-2">📤</span>
        Exports
      </el-button>
      <el-button text class="w-full justify-start" @click="showAbout = true">
        <span class="mr-2">ℹ</span>
        {{ $t('nav.about') }}
      </el-button>
    </div>

    <!-- 关于对话框 -->
    <el-dialog v-model="showAbout" :title="$t('about.title')" width="400px">
      <p class="text-gray-600 dark:text-gray-400">{{ $t('about.desc') }}</p>
      <div class="mt-4 space-y-2 text-sm text-gray-500">
        <p>
          <a
            href="https://opencode.ai/docs/zh-cn/sdk/"
            target="_blank"
            class="text-primary-600 hover:underline"
          >
            OpenCode SDK 文档
          </a>
        </p>
        <p>
          首次使用需配置 LLM provider：
          <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">opencode auth login</code>
        </p>
      </div>
    </el-dialog>

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
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSessionStore } from '@renderer/stores/session';
import { useConnectionStore } from '@renderer/stores/connection';
import { useThemeStore } from '@renderer/stores/theme';
import SettingsDrawer from './SettingsDrawer.vue';

const sessionStore = useSessionStore();
const connectionStore = useConnectionStore();
const themeStore = useThemeStore();
const showSettings = ref(false);
const showAbout = ref(false);

async function handleNewSession() {
  await sessionStore.createSession();
}

onMounted(() => {
  sessionStore.loadSessions();
});
</script>

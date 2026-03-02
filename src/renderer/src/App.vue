<template>
  <ElConfigProvider :locale="locale === 'en' ? en : zhCn">
    <!-- 初始化 loading 遮罩 -->
    <div
      v-if="!initDone"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0d0d0d]"
      :class="{ dark: themeStore.theme === 'dark' }"
    >
      <div class="mb-4 h-2 w-64 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          class="h-full bg-primary-500 transition-all duration-300"
          :style="{ width: `${initPercent}%` }"
        />
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">初始化中：{{ initPercent }}%</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">{{ initMessage }}</p>
    </div>

    <div v-show="initDone" class="h-full flex" :class="{ dark: themeStore.theme === 'dark' }">
      <!-- 左侧：导航 + 会话列表 + 功能区 -->
      <Sidebar />

      <!-- 中间：主内容 -->
      <main class="flex-1 min-w-0 flex flex-col bg-[#fafafa] dark:bg-[#0d0d0d]">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </main>
    </div>

    <!-- 权限请求对话框 -->
    <PermissionDialog :request="pendingPermission" @replied="onPermissionReplied" />

    <!-- Question 工具对话框 -->
    <QuestionDialog :request="pendingQuestion" @done="pendingQuestion = null" />
  </ElConfigProvider>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import en from 'element-plus/dist/locale/en.mjs';
import { useI18n } from 'vue-i18n';
import { useConnectionStore } from '@renderer/stores/connection';
import { useSessionStore } from '@renderer/stores/session';
import { useThemeStore } from '@renderer/stores/theme';
import Sidebar from '@renderer/components/Sidebar.vue';
import PermissionDialog from '@renderer/components/PermissionDialog.vue';
import QuestionDialog from '@renderer/components/QuestionDialog.vue';

interface PermissionRequest {
  requestID: string;
  tool?: string;
  filename?: string;
  reason?: string;
  sessionID?: string;
}

const { locale } = useI18n();
const connectionStore = useConnectionStore();
const sessionStore = useSessionStore();
const themeStore = useThemeStore();

interface QuestionRequest {
  requestID: string;
  sessionID?: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiple?: boolean;
    custom?: boolean;
  }>;
}

const initDone = ref(false);
const initPercent = ref(0);
const initMessage = ref('检查中...');
const pendingPermission = ref<PermissionRequest | null>(null);
const pendingQuestion = ref<QuestionRequest | null>(null);

let unsubConnection: (() => void) | null = null;
let unsubInitProgress: (() => void) | null = null;
let unsubInitDone: (() => void) | null = null;
let unsubPermission: (() => void) | null = null;
let unsubQuestion: (() => void) | null = null;

function onPermissionReplied(_requestID: string, _reply: 'once' | 'always' | 'reject'): void {
  pendingPermission.value = null;
}

onMounted(() => {
  if (typeof window.opencode !== 'undefined') {
    // 获取当前初始化状态（可能主进程已先完成）
    window.opencode.initGetStatus().then((s) => {
      if (s.done) {
        initDone.value = true;
        return;
      }
      initPercent.value = s.percent ?? 0;
      initMessage.value = s.message ?? '初始化中...';
    });
    unsubInitProgress = window.opencode.onInitProgress((p) => {
      initPercent.value = p.percent;
      initMessage.value = p.message;
    });
    unsubInitDone = window.opencode.onInitDone(() => {
      initDone.value = true;
    });

    // 订阅权限请求
    unsubPermission = window.opencode.onPermission((request) => {
      pendingPermission.value = request;
    });

    // 订阅 Question 工具提问
    unsubQuestion = window.opencode.onQuestion((request) => {
      pendingQuestion.value = request;
    });
  } else {
    initDone.value = true;
  }

  if (typeof window.opencode !== 'undefined') {
    unsubConnection = window.opencode.onConnectionStatus(async (status) => {
      connectionStore.setConnected(status.connected);
      if (status.connected) {
        const health = await connectionStore.checkHealth();
        if (health.version) connectionStore.setVersion(health.version);
        // 连接建立后使用 session.list() 恢复会话列表
        sessionStore.loadSessions();
      } else {
        connectionStore.setVersion(undefined);
      }
    });
    connectionStore.checkHealth().then((h) => {
      if (h.healthy) {
        connectionStore.setConnected(true);
        if (h.version) connectionStore.setVersion(h.version);
        sessionStore.loadSessions();
      }
    });
  }
});

onUnmounted(() => {
  unsubConnection?.();
  unsubInitProgress?.();
  unsubInitDone?.();
  unsubPermission?.();
  unsubQuestion?.();
});
</script>

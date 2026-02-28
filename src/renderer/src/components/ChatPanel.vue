<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <div
      v-if="!sessionStore.currentSessionId"
      class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400"
    >
      {{ $t('chat.newSession') }}
    </div>
    <template v-else>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] rounded-lg px-4 py-2 group/msg relative"
            :class="
              msg.role === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            "
          >
            <div class="whitespace-pre-wrap">{{ msg.content }}</div>
            <el-button
              v-if="msg.role === 'assistant' && msg.content"
              type="primary"
              text
              size="small"
              class="absolute top-1 right-1 opacity-0 group-hover/msg:opacity-100 transition-opacity"
              @click="copyToClipboard(msg.content)"
            >
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </div>
        <div v-if="streamingText" class="flex justify-start">
          <div
            class="max-w-[80%] rounded-lg px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group/msg relative"
          >
            <span class="whitespace-pre-wrap">{{ streamingText }}</span>
            <span class="animate-pulse">▌</span>
            <el-button
              v-if="streamingText"
              type="primary"
              text
              size="small"
              class="absolute top-1 right-1 opacity-0 group-hover/msg:opacity-100 transition-opacity"
              @click="copyToClipboard(streamingText)"
            >
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <el-input
          v-model="inputText"
          type="textarea"
          :placeholder="$t('chat.placeholder')"
          :rows="2"
          :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <el-button
          type="primary"
          class="mt-2"
          :loading="sending"
          :disabled="
            !connectionStore.connected || !sessionStore.currentSessionId || !inputText.trim()
          "
          @click="sendMessage"
        >
          {{ $t('chat.send') }}
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { DocumentCopy } from '@element-plus/icons-vue';
import { useSessionStore } from '@renderer/stores/session';
import { useConnectionStore } from '@renderer/stores/connection';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

const { t } = useI18n();
const sessionStore = useSessionStore();
const connectionStore = useConnectionStore();
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
const inputText = ref('');
const streamingText = ref('');
const sending = ref(false);

let unsubChunk: (() => void) | null = null;

async function loadMessages(sessionId: string) {
  if (!sessionId || typeof window.opencode === 'undefined') {
    messages.value = [];
    return;
  }
  const res = await window.opencode.sessionMessages(sessionId);
  if (res.error) {
    messages.value = [];
    return;
  }
  const raw = res.data;
  if (!Array.isArray(raw)) {
    messages.value = [];
    return;
  }
  messages.value = raw.map((item) => {
    const role = (item.info?.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant';
    const content =
      item.parts
        ?.filter((p): p is { type: string; text?: string } => p?.type === 'text')
        .map((p) => p.text ?? '')
        .join('') ?? '';
    return { role, content };
  });
}

watch(
  () => sessionStore.currentSessionId,
  (sessionId) => {
    if (sessionId) {
      loadMessages(sessionId);
    } else {
      messages.value = [];
    }
  },
  { immediate: true }
);

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('chat.copied'));
  } catch {
    ElMessage.error('复制失败');
  }
}

async function sendMessage() {
  const sessionId = sessionStore.currentSessionId;
  if (!sessionId || !inputText.value.trim() || typeof window.opencode === 'undefined') return;
  const text = inputText.value.trim();
  inputText.value = '';
  messages.value.push({ role: 'user', content: text });
  streamingText.value = '';
  sending.value = true;

  try {
    const res = await window.opencode.prompt({
      sessionId,
      parts: [{ type: 'text', text }],
    });
    if (res.error) {
      messages.value.push({ role: 'assistant', content: `错误: ${res.error}` });
    } else if (
      res.data &&
      typeof res.data === 'object' &&
      'parts' in (res.data as { parts?: unknown[] })
    ) {
      const parts = (res.data as { parts?: Array<{ type?: string; text?: string }> }).parts;
      const textPart = parts?.find((p) => p.type === 'text');
      if (textPart?.text) {
        messages.value.push({ role: 'assistant', content: textPart.text });
      }
    }
  } finally {
    streamingText.value = '';
    sending.value = false;
  }
}

onMounted(() => {
  if (typeof window.opencode !== 'undefined') {
    unsubChunk = window.opencode.onChunk((text) => {
      // 仅在本面板发起 prompt 请求时显示流式输出
      if (sending.value) {
        streamingText.value += text;
      }
    });
  }
});

onUnmounted(() => {
  unsubChunk?.();
});
</script>

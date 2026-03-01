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
            <!-- 思考过程（仅 assistant 且有 thinking 时） -->
            <details v-if="msg.role === 'assistant' && msg.thinking" class="mb-2">
              <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                {{ $t('chat.thinking') }}
              </summary>
              <div class="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                {{ msg.thinking }}
              </div>
            </details>
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
        <!-- 流式输出：思考 + 正文 -->
        <div v-if="streamingThinkingText || streamingText" class="flex justify-start">
          <div
            class="max-w-[80%] rounded-lg px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group/msg relative"
          >
            <details v-if="streamingThinkingText" class="mb-2" open>
              <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                {{ $t('chat.thinking') }}
              </summary>
              <div class="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                {{ streamingThinkingText }}<span class="animate-pulse">▌</span>
              </div>
            </details>
            <span class="whitespace-pre-wrap">{{ streamingText }}</span>
            <span v-if="!streamingThinkingText" class="animate-pulse">▌</span>
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
        <div
          v-if="attachments.length"
          class="mb-2 flex flex-wrap gap-2"
        >
          <el-tag
            v-for="(att, idx) in attachments"
            :key="idx"
            closable
            size="small"
            @close="removeAttachment(idx)"
          >
            {{ att.name }}
          </el-tag>
        </div>
        <div class="flex gap-2 items-end">
          <el-button
            :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
            @click="pickFiles"
            title="添加附件"
          >
            <el-icon><DocumentAdd /></el-icon>
          </el-button>
          <el-input
            v-model="inputText"
            type="textarea"
            class="flex-1 min-w-0"
            :placeholder="$t('chat.placeholder')"
            :rows="2"
            :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
            @keydown.enter.exact.prevent="sendMessage"
          />
        </div>
        <div class="mt-2 flex items-center justify-between"
        >
          <el-switch
            v-model="thinkingMode"
            :active-text="$t('chat.thinkingMode')"
            inline-prompt
            class="mr-2"
          />
          <el-button
            type="primary"
            :loading="sending"
            :disabled="
              !connectionStore.connected ||
              !sessionStore.currentSessionId ||
              (!inputText.trim() && !attachments.length)
            "
            @click="sendMessage"
          >
            {{ $t('chat.send') }}
          </el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { DocumentCopy, DocumentAdd } from '@element-plus/icons-vue';
import { useSessionStore } from '@renderer/stores/session';
import { useConnectionStore } from '@renderer/stores/connection';
import { useChatStore } from '@renderer/stores/chat';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

const { t } = useI18n();
const sessionStore = useSessionStore();
const connectionStore = useConnectionStore();
const chatStore = useChatStore();
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string; thinking?: string }>>([]);
const inputText = ref('');
const streamingText = ref('');
const streamingThinkingText = ref('');
const sending = ref(false);

const thinkingMode = computed({
  get: () => chatStore.thinkingMode,
  set: (v) => chatStore.setThinkingMode(v),
});

/** 附件：{ name, content } */
const attachments = ref<Array<{ name: string; content: string }>>([]);

async function pickFiles() {
  if (typeof window.opencode === 'undefined') return;
  const res = await window.opencode.filePickAndRead();
  if (res.error) {
    ElMessage.error(res.error);
    return;
  }
  const files = res.data ?? [];
  for (const f of files) {
    attachments.value.push({ name: f.name, content: f.content });
  }
}

function removeAttachment(idx: number) {
  attachments.value.splice(idx, 1);
}

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
    const textParts = item.parts?.filter((p): p is { type: string; text?: string } => p?.type === 'text')
      ?? [];
    const thinkingParts = item.parts?.filter((p): p is { type: string; text?: string } => p?.type === 'thinking')
      ?? [];
    let content = textParts.map((p) => p.text ?? '').join('');
    const thinking = thinkingParts.map((p) => p.text ?? '').join('') || undefined;
    if (role === 'user') {
      content = content.replace(/---\s*\n\s*\[文件: ([^\]]+)\]\s*\n[\s\S]*?\n---/g, '[附件: $1]');
    }
    return { role, content, thinking };
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
  const text = inputText.value.trim();
  const atts = [...attachments.value];
  if (!sessionId || typeof window.opencode === 'undefined') return;
  if (!text && !atts.length) return;

  inputText.value = '';
  attachments.value = [];

  const displayContent =
    atts.length > 0
      ? `[附件: ${atts.map((a) => a.name).join(', ')}]` + (text ? `\n\n${text}` : '')
      : text;
  messages.value.push({ role: 'user', content: displayContent });
  streamingText.value = '';
  streamingThinkingText.value = '';
  sending.value = true;

  const parts: Array<{ type: string; text?: string }> = [];
  for (const a of atts) {
    parts.push({
      type: 'text',
      text: `---\n[文件: ${a.name}]\n\n${a.content}\n---`,
    });
  }
  if (text) {
    parts.push({ type: 'text', text });
  }

  try {
    const res = await window.opencode.prompt({
      sessionId,
      parts,
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
      const thinkingPart = parts?.find((p) => p.type === 'thinking');
      const content = textPart?.text ?? streamingText.value;
      const thinking = thinkingPart?.text ?? (streamingThinkingText.value || undefined);
      if (content || thinking) {
        messages.value.push({ role: 'assistant', content: content || '', thinking });
      }
    }
  } finally {
    streamingText.value = '';
    streamingThinkingText.value = '';
    sending.value = false;
  }
}

let unsubThinkingChunk: (() => void) | null = null;

onMounted(() => {
  if (typeof window.opencode !== 'undefined') {
    unsubChunk = window.opencode.onChunk((text) => {
      if (sending.value) {
        streamingText.value += text;
      }
    });
    unsubThinkingChunk = window.opencode.onThinkingChunk((text) => {
      if (sending.value) {
        streamingThinkingText.value += text;
      }
    });
  }
});

onUnmounted(() => {
  unsubChunk?.();
  unsubThinkingChunk?.();
});
</script>

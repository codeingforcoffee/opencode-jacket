<template>
  <div class="chat-panel h-full flex flex-col bg-[#fafafa] dark:bg-[#0d0d0d]">
    <!-- 空状态 -->
    <div
      v-if="!sessionStore.currentSessionId"
      class="flex-1 flex flex-col items-center justify-center px-6"
    >
      <div
        class="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gray-100 dark:bg-gray-800/80"
      >
        <ElIcon class="text-4xl text-gray-400 dark:text-gray-500">
          <ChatDotRound />
        </ElIcon>
      </div>
      <p class="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
        {{ $t('chat.newSession') }}
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-500 max-w-xs text-center">
        {{ $t('chat.emptyHint') }}
      </p>
    </div>

    <template v-else>
      <!-- 消息区域 -->
      <div class="flex-1 overflow-y-auto px-6 py-8">
        <div class="max-w-3xl mx-auto space-y-6">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex gap-3"
            :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
          >
            <!-- 头像 -->
            <div
              class="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-medium"
              :class="
                msg.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              "
            >
              <ElIcon v-if="msg.role === 'user'" :size="16"><User /></ElIcon>
              <ElIcon v-else :size="16"><MagicStick /></ElIcon>
            </div>
            <!-- 消息气泡 -->
            <div
              class="flex-1 min-w-0 max-w-[85%] group/msg"
              :class="msg.role === 'user' ? 'flex flex-col items-end' : ''"
            >
              <div
                class="relative rounded-2xl px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                :class="
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/80 rounded-bl-md'
                "
              >
                <div
                  class="whitespace-pre-wrap text-[15px] leading-[1.6]"
                  :class="msg.role === 'user' ? 'text-white' : 'text-gray-800 dark:text-gray-200'"
                >
                  {{ msg.content }}
                </div>
                <ElButton
                  v-if="msg.role === 'assistant' && msg.content"
                  type="primary"
                  text
                  size="small"
                  class="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity !p-1"
                  @click="copyToClipboard(msg.content)"
                >
                  <ElIcon><DocumentCopy /></ElIcon>
                </ElButton>
              </div>
            </div>
          </div>

          <!-- 流式输出 -->
          <div v-if="streamingText" class="flex gap-3">
            <div
              class="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <ElIcon :size="16"><MagicStick /></ElIcon>
            </div>
            <div class="flex-1 min-w-0 max-w-[85%]">
              <div
                class="relative rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/80 shadow-sm group/msg"
              >
                <span
                  class="whitespace-pre-wrap text-[15px] leading-[1.6] text-gray-800 dark:text-gray-200"
                >
                  {{ streamingText }}
                </span>
                <span class="animate-pulse">▌</span>
                <ElButton
                  v-if="streamingText"
                  type="primary"
                  text
                  size="small"
                  class="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity !p-1"
                  @click="copyToClipboard(streamingText)"
                >
                  <ElIcon><DocumentCopy /></ElIcon>
                </ElButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="shrink-0 px-6 pb-6 pt-4">
        <div class="max-w-3xl mx-auto">
          <div
            class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm overflow-hidden transition-all focus-within:border-primary-400 dark:focus-within:border-primary-500 focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary-500/20"
          >
            <div
              v-if="attachments.length"
              class="px-4 py-2 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-700"
            >
              <span
                v-for="(att, idx) in attachments"
                :key="idx"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
              >
                {{ att.name }}
                <ElIcon
                  class="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 text-xs"
                  @click="removeAttachment(idx)"
                >
                  <Close />
                </ElIcon>
              </span>
            </div>
            <div class="flex items-end gap-2 p-3">
              <ElButton
                :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
                title="添加附件"
                class="!rounded-xl !p-2.5 shrink-0 text-gray-500 hover:text-primary-500 hover:!bg-primary-50 dark:hover:!bg-primary-900/30"
                @click="pickFiles"
              >
                <ElIcon :size="20"><DocumentAdd /></ElIcon>
              </ElButton>
              <ElInput
                v-model="inputText"
                type="textarea"
                class="chat-input flex-1 min-w-0"
                :placeholder="$t('chat.placeholder')"
                :rows="2"
                :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
                @keydown.enter.exact="onEnterKeydown"
              />
              <ElButton
                v-if="!sending"
                type="primary"
                :disabled="
                  !connectionStore.connected ||
                  !sessionStore.currentSessionId ||
                  (!inputText.trim() && !attachments.length)
                "
                class="!rounded-xl !px-5 !h-10 shrink-0"
                @click="sendMessage"
              >
                <ElIcon class="mr-1"><Promotion /></ElIcon>
                {{ $t('chat.send') }}
              </ElButton>
              <ElButton
                v-else
                type="danger"
                class="!rounded-xl !px-5 !h-10 shrink-0"
                @click="abortSession"
              >
                <ElIcon class="mr-1"><VideoPause /></ElIcon>
                {{ $t('chat.stop') }}
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import {
  DocumentCopy,
  DocumentAdd,
  ChatDotRound,
  User,
  MagicStick,
  Close,
  Promotion,
  VideoPause,
} from '@element-plus/icons-vue';
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

function onEnterKeydown(e: KeyboardEvent) {
  if (e.isComposing) return;
  e.preventDefault();
  sendMessage();
}

let unsubChunk: (() => void) | null = null;
let unsubEvent: (() => void) | null = null;

// rAF 批处理：合并流式 chunk 更新，减少 Vue 重渲染
let chunkBuffer = '';
let rafScheduled = false;
const DEBUG_CHUNK = true; // 排查用
function scheduleStreamingUpdate(text: string) {
  if (DEBUG_CHUNK) console.log('[opencode-debug] ChatPanel 收到 chunk, len=', text.length, 'sending=', sending.value);
  chunkBuffer += text;
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (chunkBuffer) {
      streamingText.value += chunkBuffer;
      if (DEBUG_CHUNK) console.log('[opencode-debug] ChatPanel rAF 应用, 追加 len=', chunkBuffer.length);
      chunkBuffer = '';
    }
  });
}
function clearChunkBuffer() {
  chunkBuffer = '';
}

async function loadMessages(sessionId: string) {
  if (!sessionId || typeof window.opencode === 'undefined') {
    messages.value = [];
    return;
  }
  const res = await window.opencode.sessionMessages(sessionId);
  // 切换 session 后忽略过期的响应
  if (sessionStore.currentSessionId !== sessionId) return;
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
    const textParts =
      item.parts?.filter((p): p is { type: string; text?: string } => p?.type === 'text') ?? [];
    let content = textParts.map((p) => p.text ?? '').join('');
    if (role === 'user') {
      content = content.replace(/---\s*\n\s*\[文件: ([^\]]+)\]\s*\n[\s\S]*?\n---/g, '[附件: $1]');
    }
    return { role, content };
  });
}

watch(
  () => sessionStore.currentSessionId,
  (sessionId) => {
    clearChunkBuffer();
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

async function abortSession() {
  const sessionId = sessionStore.currentSessionId;
  if (!sessionId || typeof window.opencode === 'undefined') return;
  clearChunkBuffer();
  try {
    const res = await window.opencode.sessionAbort(sessionId);
    if (res.error) {
      ElMessage.error(res.error);
    } else {
      const currentStreaming = streamingText.value;
      streamingText.value = '';
      sending.value = false;
      if (currentStreaming) {
        messages.value.push({ role: 'assistant', content: currentStreaming });
      }
    }
  } catch (err) {
    ElMessage.error((err as Error).message);
    sending.value = false;
    streamingText.value = '';
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
    if (DEBUG_CHUNK) console.log('[opencode-debug] ChatPanel prompt 发送, sessionId=', sessionId);
    const res = await window.opencode.prompt({
      sessionId,
      parts,
    });
    if (DEBUG_CHUNK) console.log('[opencode-debug] ChatPanel prompt 返回, error=', res.error);
    if (res.error) {
      messages.value.push({ role: 'assistant', content: `错误: ${res.error}` });
      clearChunkBuffer();
      streamingText.value = '';
      sending.value = false;
    }
    // 成功时由 session.idle 事件结束发送状态，不在此处设置 sending = false
  } catch (err) {
    ElMessage.error((err as Error).message);
    clearChunkBuffer();
    streamingText.value = '';
    sending.value = false;
  }
}

function finishStreaming() {
  if (streamingText.value) {
    messages.value.push({ role: 'assistant', content: streamingText.value });
  }
  clearChunkBuffer();
  streamingText.value = '';
  sending.value = false;
}

onMounted(() => {
  if (typeof window.opencode !== 'undefined') {
    unsubChunk = window.opencode.onChunk((chunkSessionId, text) => {
      if (sending.value && (!chunkSessionId || chunkSessionId === sessionStore.currentSessionId)) {
        scheduleStreamingUpdate(text);
      }
    });
    unsubEvent = window.opencode.onEvent((event) => {
      const ev = event as { type?: string; properties?: { sessionID?: string; status?: string } };
      if (!sending.value) return;
      const sid = ev?.properties?.sessionID ?? '';
      if (sid !== sessionStore.currentSessionId) return;
      const isIdle =
        ev?.type === 'session.idle' || (ev?.type === 'session.status' && ev?.properties?.status === 'idle');
      if (isIdle) {
        if (DEBUG_CHUNK) console.log('[opencode-debug] session 空闲，结束流式');
        finishStreaming();
      }
    });
  }
});

onUnmounted(() => {
  unsubChunk?.();
  unsubEvent?.();
});
</script>

<style scoped>
.chat-input :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0.5rem 0;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
}
.chat-input :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}
</style>

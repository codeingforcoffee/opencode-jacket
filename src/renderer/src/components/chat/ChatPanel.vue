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

            <!-- 用户消息气泡 -->
            <div
              v-if="msg.role === 'user'"
              class="flex-1 min-w-0 max-w-[85%] flex flex-col items-end"
            >
              <div
                class="relative rounded-2xl rounded-br-md px-4 py-3 bg-primary-500 text-white shadow-sm"
              >
                <div class="whitespace-pre-wrap text-[15px] leading-[1.6]">{{ msg.content }}</div>
              </div>
            </div>

            <!-- Assistant 消息：按 part 分层渲染 -->
            <div v-else class="flex-1 min-w-0 max-w-[85%] space-y-2">
              <!-- 思考过程 -->
              <template v-for="(part, pi) in msg.parts" :key="pi">
                <!-- reasoning part -->
                <details
                  v-if="part.type === 'reasoning'"
                  class="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/60 overflow-hidden"
                >
                  <summary
                    class="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 select-none list-none"
                  >
                    <ElIcon :size="12"><View /></ElIcon>
                    {{ $t('chat.reasoning') }}
                    <ElIcon :size="10" class="ml-auto chevron"><ArrowDown /></ElIcon>
                  </summary>
                  <div
                    class="px-3 pb-3 pt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed border-t border-gray-200 dark:border-gray-700/60"
                  >
                    {{ part.text }}
                  </div>
                </details>

                <!-- tool part -->
                <div
                  v-else-if="part.type === 'tool'"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm"
                  :class="toolPartClass(part.status)"
                >
                  <span class="shrink-0">
                    <span
                      v-if="part.status === 'running'"
                      class="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
                    />
                    <ElIcon v-else-if="part.status === 'completed'" :size="13"
                      ><CircleCheck
                    /></ElIcon>
                    <ElIcon v-else-if="part.status === 'error'" :size="13"><CircleClose /></ElIcon>
                    <ElIcon v-else :size="13"><Loading /></ElIcon>
                  </span>
                  <span class="font-mono text-xs opacity-70">{{ part.name }}</span>
                  <span class="flex-1 truncate text-xs">{{ part.title }}</span>
                </div>

                <!-- text part -->
                <div
                  v-else-if="part.type === 'text' && part.text"
                  class="relative group/msg rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/80 shadow-sm"
                >
                  <div
                    class="whitespace-pre-wrap text-[15px] leading-[1.6] text-gray-800 dark:text-gray-200"
                  >
                    {{ part.text }}
                  </div>
                  <ElButton
                    type="primary"
                    text
                    size="small"
                    class="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity !p-1"
                    @click="copyToClipboard(part.text)"
                  >
                    <ElIcon><DocumentCopy /></ElIcon>
                  </ElButton>
                </div>
              </template>
            </div>
          </div>

          <!-- 流式输出区域（静默注入时不显示） -->
          <div v-if="sending && !silentInjecting" class="flex gap-3">
            <div
              class="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <ElIcon :size="16"><MagicStick /></ElIcon>
            </div>
            <div class="flex-1 min-w-0 max-w-[85%] space-y-2">
              <!-- 流式 reasoning -->
              <details
                v-if="streamingReasoning"
                open
                class="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/60 overflow-hidden"
              >
                <summary
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 select-none list-none"
                >
                  <ElIcon :size="12"><View /></ElIcon>
                  思考过程
                  <span
                    class="ml-1 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block"
                  />
                </summary>
                <div
                  class="px-3 pb-3 pt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed border-t border-gray-200 dark:border-gray-700/60"
                >
                  {{ streamingReasoning }}
                </div>
              </details>

              <!-- 流式工具调用 -->
              <div
                v-for="tool in streamingTools"
                :key="tool.id"
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm"
                :class="toolPartClass(tool.status)"
              >
                <span class="shrink-0">
                  <span
                    v-if="tool.status === 'running'"
                    class="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
                  />
                  <ElIcon v-else-if="tool.status === 'completed'" :size="13"
                    ><CircleCheck
                  /></ElIcon>
                  <ElIcon v-else-if="tool.status === 'error'" :size="13"><CircleClose /></ElIcon>
                  <ElIcon v-else :size="13"><Loading /></ElIcon>
                </span>
                <span class="font-mono text-xs opacity-70">{{ tool.name }}</span>
                <span class="flex-1 truncate text-xs">{{ tool.title }}</span>
              </div>

              <!-- 流式文本 -->
              <div
                v-if="streamingText"
                class="relative group/msg rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/80 shadow-sm"
              >
                <span
                  class="whitespace-pre-wrap text-[15px] leading-[1.6] text-gray-800 dark:text-gray-200"
                  >{{ streamingText }}</span
                ><span class="animate-pulse">▌</span>
                <ElButton
                  type="primary"
                  text
                  size="small"
                  class="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity !p-1"
                  @click="copyToClipboard(streamingText)"
                >
                  <ElIcon><DocumentCopy /></ElIcon>
                </ElButton>
              </div>

              <!-- 没有文字但在 sending 状态：显示等待指示 -->
              <div
                v-if="!streamingText && !streamingReasoning && !streamingTools.length"
                class="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/80 shadow-sm"
              >
                <span
                  class="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]"
                />
                <span
                  class="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]"
                />
                <span
                  class="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="shrink-0 px-4 pb-4 pt-2">
        <div class="max-w-3xl mx-auto">
          <div
            class="rounded-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-transparent shadow-sm overflow-hidden"
          >
            <!-- 附件预览 -->
            <div v-if="attachments.length" class="px-4 pt-3 flex flex-wrap gap-2">
              <span
                v-for="(att, idx) in attachments"
                :key="idx"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] text-sm text-gray-600 dark:text-gray-300"
              >
                {{ att.name }}
                <ElIcon
                  class="cursor-pointer hover:text-gray-900 dark:hover:text-white text-xs"
                  @click="removeAttachment(idx)"
                >
                  <Close />
                </ElIcon>
              </span>
            </div>

            <!-- 文本输入 -->
            <ElInput
              v-model="inputText"
              type="textarea"
              class="chat-input"
              :placeholder="$t('chat.placeholder')"
              :autosize="{ minRows: 2, maxRows: 6 }"
              :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
              @keydown.enter.exact="onEnterKeydown"
            />

            <!-- 底部工具栏 -->
            <div class="flex items-center justify-between px-3 pb-3 pt-1">
              <!-- 左侧按钮组 -->
              <div class="flex items-center gap-1.5">
                <ElTooltip :content="$t('chat.uploadAttachment')" placement="top" :show-after="300">
                  <button
                    class="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
                    @click="pickFiles"
                  >
                    <ElIcon :size="15"><DocumentAdd /></ElIcon>
                  </button>
                </ElTooltip>
                <McpPopover />
                <div class="w-px h-4 bg-gray-200 dark:bg-gray-700/60 mx-0.5" />
                <ModelPicker
                  ref="modelPickerRef"
                  :disabled="!connectionStore.connected"
                  @change="onModelChange"
                />
              </div>

              <!-- 右侧：附件数 + 发送/停止 -->
              <div class="flex items-center gap-2">
                <div
                  v-if="attachments.length"
                  class="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"
                >
                  <ElIcon :size="13"><Folder /></ElIcon>
                  <span>{{ attachments.length }}</span>
                </div>
                <button
                  v-if="!sending"
                  class="px-4 h-8 rounded-xl text-sm font-medium bg-gray-200 dark:bg-[#444] hover:bg-gray-300 dark:hover:bg-[#555] text-gray-600 dark:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="
                    !connectionStore.connected ||
                    !sessionStore.currentSessionId ||
                    (!inputText.trim() && !attachments.length)
                  "
                  @click="sendMessage"
                >
                  {{ $t('chat.send') }}
                </button>
                <button
                  v-else
                  class="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors"
                  :title="$t('chat.stop')"
                  @click="abortSession"
                >
                  <ElIcon :size="14" class="text-white"><VideoPause /></ElIcon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, provide, toRaw } from 'vue';
import {
  DocumentCopy,
  DocumentAdd,
  ChatDotRound,
  User,
  MagicStick,
  Close,
  VideoPause,
  Folder,
  View,
  ArrowDown,
  CircleCheck,
  CircleClose,
  Loading,
} from '@element-plus/icons-vue';
import { useSessionStore } from '@renderer/stores/session';
import { useConnectionStore } from '@renderer/stores/connection';
import McpPopover from './McpPopover.vue';
import ModelPicker from './ModelPicker.vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

const { t } = useI18n();
const sessionStore = useSessionStore();
const connectionStore = useConnectionStore();
const modelPickerRef = ref<InstanceType<typeof ModelPicker> | null>(null);
const currentModel = ref<{ providerID: string; modelID: string } | undefined>(undefined);

function onModelChange(model: { providerID: string; modelID: string } | undefined) {
  currentModel.value = model;
}
// ─── 消息类型 ─────────────────────────────────────────────
type ToolPart = {
  type: 'tool';
  id: string;
  name: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: string;
  error?: string;
};
type ReasoningPart = { type: 'reasoning'; text: string };
type TextPart = { type: 'text'; text: string };
type AssistantPart = TextPart | ReasoningPart | ToolPart;

type UserMsg = { role: 'user'; content: string };
type AssistantMsg = { role: 'assistant'; parts: AssistantPart[] };
type ChatMessage = UserMsg | AssistantMsg;

// ─── 状态 ──────────────────────────────────────────────────
const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const streamingText = ref('');
const streamingReasoning = ref('');
const streamingTools = ref<ToolPart[]>([]);
const sending = ref(false);

const attachments = ref<Array<{ name: string; content: string }>>([]);
const silentInjecting = ref(false);

// ─── 工具 part 样式 ─────────────────────────────────────────
function toolPartClass(status: string) {
  switch (status) {
    case 'completed':
      return 'border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    case 'error':
      return 'border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
    case 'running':
      return 'border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
    default:
      return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400';
  }
}

// ─── 附件 ──────────────────────────────────────────────────
async function pickFiles() {
  if (typeof window.opencode === 'undefined') return;
  const res = await window.opencode.filePickAndRead();
  if (res.error) {
    ElMessage.error(res.error);
    return;
  }
  for (const f of res.data ?? []) {
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

// ─── 流式文本 chunk ─────────────────────────────────────────
let unsubChunk: (() => void) | null = null;
let unsubEvent: (() => void) | null = null;
let chunkBuffer = '';
let rafScheduled = false;

function scheduleStreamingUpdate(text: string) {
  chunkBuffer += text;
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (chunkBuffer) {
      streamingText.value += chunkBuffer;
      chunkBuffer = '';
    }
  });
}

function clearStreamingState() {
  chunkBuffer = '';
  rafScheduled = false;
  streamingText.value = '';
  streamingReasoning.value = '';
  streamingTools.value = [];
}

// ─── 加载历史消息 ────────────────────────────────────────────
async function loadMessages(sessionId: string) {
  if (!sessionId || typeof window.opencode === 'undefined') {
    messages.value = [];
    return;
  }
  const res = await window.opencode.sessionMessages(sessionId);
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

  const result: ChatMessage[] = [];
  for (const item of raw) {
    const role = item.info?.role === 'user' ? 'user' : 'assistant';

    if (role === 'user') {
      const textParts = item.parts?.filter((p: { type?: string }) => p?.type === 'text') ?? [];
      let content = textParts.map((p: { text?: string }) => p.text ?? '').join('');
      content = content.replace(/---\s*\n\s*\[文件: ([^\]]+)\]\s*\n[\s\S]*?\n---/g, '[附件: $1]');
      // 过滤掉静默注入的工具变更通知，不在 UI 中显示
      if (content && !content.startsWith('[工具变更]')) {
        result.push({ role: 'user', content });
      }
    } else {
      const parts: AssistantPart[] = [];
      for (const p of item.parts ?? []) {
        const anyP = p as Record<string, unknown>;
        if (anyP?.type === 'text' && anyP.text) {
          parts.push({ type: 'text', text: anyP.text as string });
        } else if (anyP?.type === 'reasoning' && anyP.text) {
          parts.push({ type: 'reasoning', text: anyP.text as string });
        } else if (anyP?.type === 'tool') {
          const state = anyP.state as Record<string, unknown> | undefined;
          parts.push({
            type: 'tool',
            id: (anyP.id as string) ?? '',
            name: (anyP.tool as string) ?? '',
            title: (state?.title as string) ?? (anyP.tool as string) ?? '',
            status: (state?.status as ToolPart['status']) ?? 'pending',
            output: state?.status === 'completed' ? (state.output as string) : undefined,
            error: state?.status === 'error' ? (state.error as string) : undefined,
          });
        }
      }
      if (parts.length) result.push({ role: 'assistant', parts });
    }
  }
  messages.value = result;
}

watch(
  () => sessionStore.currentSessionId,
  (sessionId) => {
    clearStreamingState();
    sending.value = false;
    if (sessionId) {
      loadMessages(sessionId);
    } else {
      messages.value = [];
    }
  },
  { immediate: true }
);

// ─── 复制 ───────────────────────────────────────────────────
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('chat.copied'));
  } catch {
    ElMessage.error(t('chat.copyFailed'));
  }
}

// ─── 终止 ───────────────────────────────────────────────────
async function abortSession() {
  const sessionId = sessionStore.currentSessionId;
  if (!sessionId || typeof window.opencode === 'undefined') return;
  clearStreamingState();
  try {
    const res = await window.opencode.sessionAbort(sessionId);
    if (res.error) {
      ElMessage.error(res.error);
    } else {
      sending.value = false;
      await loadMessages(sessionId);
    }
  } catch (err) {
    ElMessage.error((err as Error).message);
    sending.value = false;
  }
}

// ─── 发送 ───────────────────────────────────────────────────
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
  clearStreamingState();
  sending.value = true;

  const parts: Array<{ type: string; text?: string }> = [];
  for (const a of atts) {
    parts.push({ type: 'text', text: `---\n[文件: ${a.name}]\n\n${a.content}\n---` });
  }
  if (text) parts.push({ type: 'text', text });

  try {
    const rawModel = toRaw(currentModel.value) ?? modelPickerRef.value?.getModel();
    const model = rawModel
      ? { providerID: rawModel.providerID, modelID: rawModel.modelID }
      : undefined;
    const res = await window.opencode.prompt({ sessionId, parts, model });
    if (res.error) {
      messages.value.push({
        role: 'assistant',
        parts: [{ type: 'text', text: `错误: ${res.error}` }],
      });
      clearStreamingState();
      sending.value = false;
    }
  } catch (err) {
    ElMessage.error((err as Error).message);
    clearStreamingState();
    sending.value = false;
  }
}

// ─── 流式完成 ────────────────────────────────────────────────
async function finishStreaming() {
  const sessionId = sessionStore.currentSessionId;
  sending.value = false;
  silentInjecting.value = false;
  if (sessionId) await loadMessages(sessionId);
  clearStreamingState();
}

// ─── 静默注入上下文（MCP 切换后同步工具状态，不在 UI 中显示）─────────
async function injectContextSilently(text: string) {
  const sessionId = sessionStore.currentSessionId;
  if (!sessionId || typeof window.opencode === 'undefined') return;

  clearStreamingState();
  sending.value = true;
  silentInjecting.value = true;

  try {
    const res = await window.opencode.prompt({
      sessionId,
      parts: [{ type: 'text', text }],
    });
    if (res.error) {
      sending.value = false;
      silentInjecting.value = false;
      return;
    }
    // promptAsync 返回时用户消息已持久化，立即中止 AI 生成
    // session.idle 事件会触发 finishStreaming() 完成后续清理
    await window.opencode.sessionAbort(sessionId);
  } catch {
    sending.value = false;
    silentInjecting.value = false;
  }
}

provide('injectContextSilently', injectContextSilently);

// ─── 事件订阅 ────────────────────────────────────────────────
onMounted(() => {
  if (typeof window.opencode === 'undefined') return;

  unsubChunk = window.opencode.onChunk((chunkSessionId, text) => {
    if (sending.value && (!chunkSessionId || chunkSessionId === sessionStore.currentSessionId)) {
      scheduleStreamingUpdate(text);
    }
  });

  unsubEvent = window.opencode.onEvent((event) => {
    const ev = event as {
      type?: string;
      sessionID?: string;
      properties?: {
        sessionID?: string;
        status?: string;
        part?: Record<string, unknown>;
        delta?: string;
      };
    };

    if (!sending.value) return;
    const sid = ev?.properties?.sessionID ?? ev?.sessionID ?? '';
    if (sid && sid !== sessionStore.currentSessionId) return;

    const evType = ev?.type;

    // session idle → 完成
    if (
      evType === 'session.idle' ||
      (evType === 'session.status' && ev?.properties?.status === 'idle')
    ) {
      finishStreaming();
      return;
    }

    // 实时 part 更新
    if (evType === 'message.part.updated') {
      const part = ev?.properties?.part;
      if (!part) return;

      if (part.type === 'tool') {
        const state = part.state as Record<string, unknown> | undefined;
        const id = part.id as string;
        const toolData: ToolPart = {
          type: 'tool',
          id,
          name: (part.tool as string) ?? '',
          title: (state?.title as string) ?? (part.tool as string) ?? '',
          status: (state?.status as ToolPart['status']) ?? 'pending',
          output: state?.status === 'completed' ? (state.output as string) : undefined,
          error: state?.status === 'error' ? (state.error as string) : undefined,
        };
        const existing = streamingTools.value.find((t) => t.id === id);
        if (existing) {
          Object.assign(existing, toolData);
        } else {
          streamingTools.value.push(toolData);
        }
      } else if (part.type === 'reasoning') {
        streamingReasoning.value = (part.text as string) ?? '';
      }
    }
  });
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
  padding: 1rem 1rem 0.5rem;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  color: inherit;
}
.chat-input :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}
.chat-input :deep(.el-textarea__inner::placeholder) {
  color: #9ca3af;
}
details[open] .chevron {
  transform: rotate(180deg);
}
.chevron {
  transition: transform 0.2s;
}
</style>

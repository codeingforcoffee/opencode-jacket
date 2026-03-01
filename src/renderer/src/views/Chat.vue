<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <div class="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
      <ElButton type="primary" size="small" @click="createSession">{{
        $t('chat.newSession')
      }}</ElButton>
      <ElSelect
        v-model="currentSessionId"
        placeholder="选择会话"
        size="small"
        class="w-48"
        filterable
      >
        <ElOption
          v-for="s in sessions"
          :key="s.id"
          :label="(s as { title?: string }).title || s.id"
          :value="s.id"
        />
      </ElSelect>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-lg px-4 py-2"
          :class="
            msg.role === 'user'
              ? 'bg-primary-500 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          "
        >
          <div class="whitespace-pre-wrap">{{ msg.content }}</div>
        </div>
      </div>
      <div v-if="streamingText" class="flex justify-start">
        <div
          class="max-w-[80%] rounded-lg px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <span class="whitespace-pre-wrap">{{ streamingText }}</span>
          <span class="animate-pulse">▌</span>
        </div>
      </div>
    </div>
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <ElInput
        v-model="inputText"
        type="textarea"
        :placeholder="$t('chat.placeholder')"
        :rows="2"
        :disabled="!connectionStore.connected || !currentSessionId"
        @keydown.enter.exact.prevent="sendMessage"
      />
      <ElButton
        type="primary"
        class="mt-2"
        :loading="sending"
        :disabled="!connectionStore.connected || !currentSessionId || !inputText.trim()"
        @click="sendMessage"
      >
        {{ $t('chat.send') }}
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useConnectionStore } from '@renderer/stores/connection';

const connectionStore = useConnectionStore();
const sessions = ref<Array<{ id: string; title?: string }>>([]);
const currentSessionId = ref<string>('');
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
const inputText = ref('');
const streamingText = ref('');
const sending = ref(false);

let unsubChunk: (() => void) | null = null;

async function createSession() {
  if (typeof window.opencode === 'undefined') return;
  const res = await window.opencode.sessionCreate({ title: '新会话' });
  if (res.data && typeof res.data === 'object' && 'id' in res.data) {
    const session = res.data as { id: string; title?: string };
    sessions.value.push(session);
    currentSessionId.value = session.id;
    messages.value = [];
  }
}

async function loadSessions() {
  if (typeof window.opencode === 'undefined') return;
  const res = await window.opencode.sessionList();
  if (res.data && Array.isArray(res.data)) {
    sessions.value = res.data as Array<{ id: string; title?: string }>;
    if (sessions.value.length && !currentSessionId.value) {
      currentSessionId.value = sessions.value[0].id;
    }
  }
}

async function sendMessage() {
  if (!currentSessionId.value || !inputText.value.trim() || typeof window.opencode === 'undefined')
    return;
  const text = inputText.value.trim();
  inputText.value = '';
  messages.value.push({ role: 'user', content: text });
  streamingText.value = '';
  sending.value = true;

  try {
    const res = await window.opencode.prompt({
      sessionId: currentSessionId.value,
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
  loadSessions();
  if (typeof window.opencode !== 'undefined') {
    unsubChunk = window.opencode.onChunk((chunkSessionId, text) => {
      if (sending.value && (!chunkSessionId || chunkSessionId === currentSessionId.value)) {
        streamingText.value += text;
      }
    });
  }
});

onUnmounted(() => {
  unsubChunk?.();
});
</script>

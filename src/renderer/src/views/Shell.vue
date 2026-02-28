<template>
  <div class="h-full flex flex-col bg-gray-900 text-gray-100 font-mono text-sm">
    <div class="flex items-center gap-2 p-2 border-b border-gray-700">
      <el-select
        v-model="currentSessionId"
        placeholder="选择会话"
        size="small"
        class="w-48"
        filterable
      >
        <el-option
          v-for="s in sessions"
          :key="s.id"
          :label="(s as { title?: string }).title || s.id"
          :value="s.id"
        />
      </el-select>
      <el-button
        v-if="!currentSessionId"
        type="primary"
        size="small"
        :disabled="!connectionStore.connected"
        @click="createSession"
      >
        新建 Shell 会话
      </el-button>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-2">
      <div v-for="(line, i) in outputLines" :key="i" class="whitespace-pre-wrap">{{ line }}</div>
      <div v-if="streamingLine" class="whitespace-pre-wrap">
        {{ streamingLine }}<span class="animate-pulse">▌</span>
      </div>
      <div v-if="executing && !streamingLine" class="text-yellow-400">执行中...</div>
    </div>
    <div class="p-2 border-t border-gray-700 flex gap-2">
      <el-input
        v-model="command"
        :placeholder="$t('shell.placeholder')"
        :disabled="!connectionStore.connected || !currentSessionId"
        @keydown.enter="executeCommand"
      />
      <el-button
        type="primary"
        :loading="executing"
        :disabled="!connectionStore.connected || !currentSessionId || !command.trim()"
        @click="executeCommand"
      >
        {{ $t('shell.execute') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useConnectionStore } from '@renderer/stores/connection';

const connectionStore = useConnectionStore();
const sessions = ref<Array<{ id: string; title?: string }>>([]);
const currentSessionId = ref<string>('');
const command = ref('');
const outputLines = ref<string[]>([]);
const streamingLine = ref('');
const executing = ref(false);

let unsubChunk: (() => void) | null = null;

async function createSession() {
  if (typeof window.opencode === 'undefined') return;
  const res = await window.opencode.sessionCreate({ title: 'Shell' });
  if (res.data && typeof res.data === 'object' && 'id' in res.data) {
    const session = res.data as { id: string; title?: string };
    sessions.value.push(session);
    currentSessionId.value = session.id;
    outputLines.value = [];
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

async function executeCommand() {
  if (!currentSessionId.value || !command.value.trim() || typeof window.opencode === 'undefined')
    return;
  const cmd = command.value.trim();
  command.value = '';
  outputLines.value.push(`$ ${cmd}`);
  streamingLine.value = '';
  executing.value = true;

  unsubChunk?.();
  unsubChunk = window.opencode.onChunk((text) => {
    if (executing.value) {
      streamingLine.value += text;
    }
  });

  try {
    const res = await window.opencode.shell({
      sessionId: currentSessionId.value,
      body: { command: cmd },
    });
    if (res.error) {
      outputLines.value.push(`错误: ${res.error}`);
    } else if (streamingLine.value) {
      outputLines.value.push(streamingLine.value);
    } else if (
      res.data &&
      typeof res.data === 'object' &&
      'parts' in (res.data as { parts?: unknown[] })
    ) {
      const parts = (res.data as { parts?: Array<{ type?: string; text?: string }> }).parts;
      const textPart = parts?.find((p) => p.type === 'text');
      if (textPart?.text) {
        outputLines.value.push(textPart.text);
      }
    }
  } finally {
    executing.value = false;
    streamingLine.value = '';
    unsubChunk?.();
    unsubChunk = null;
  }
}

onMounted(() => {
  loadSessions();
});

onUnmounted(() => {
  unsubChunk?.();
});
</script>

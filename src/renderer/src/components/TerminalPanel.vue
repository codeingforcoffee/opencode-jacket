<template>
  <div
    class="h-full flex flex-col bg-gray-900 text-gray-100 font-mono text-sm border-l border-gray-700"
  >
    <div class="shrink-0 px-3 py-2 border-b border-gray-700 text-gray-400 text-xs">
      {{ $t('nav.shell') }}
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
      <div v-for="(line, i) in outputLines" :key="i" class="whitespace-pre-wrap break-all">
        {{ line }}
      </div>
      <div v-if="streamingLine" class="whitespace-pre-wrap break-all">
        {{ streamingLine }}<span class="animate-pulse">▌</span>
      </div>
      <div v-if="executing && !streamingLine" class="text-yellow-400">执行中...</div>
      <div v-if="!sessionStore.currentSessionId" class="text-gray-500 py-4">
        {{ $t('chat.newSession') }}
      </div>
    </div>
    <div class="shrink-0 p-2 border-t border-gray-700 flex gap-2">
      <el-input
        v-model="command"
        :placeholder="$t('shell.placeholder')"
        :disabled="!connectionStore.connected || !sessionStore.currentSessionId"
        class="flex-1"
        @keydown.enter="executeCommand"
      />
      <el-button
        type="primary"
        size="small"
        :loading="executing"
        :disabled="!connectionStore.connected || !sessionStore.currentSessionId || !command.trim()"
        @click="executeCommand"
      >
        {{ $t('shell.execute') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useSessionStore } from '@renderer/stores/session';
import { useConnectionStore } from '@renderer/stores/connection';

const sessionStore = useSessionStore();
const connectionStore = useConnectionStore();
const command = ref('');
const outputLines = ref<string[]>([]);
const streamingLine = ref('');
const executing = ref(false);

let unsubChunk: (() => void) | null = null;

async function executeCommand() {
  const sessionId = sessionStore.currentSessionId;
  if (!sessionId || !command.value.trim() || typeof window.opencode === 'undefined') return;
  const cmd = command.value.trim();
  command.value = '';
  outputLines.value.push(`$ ${cmd}`);
  streamingLine.value = '';
  executing.value = true;

  // 订阅流式输出，执行期间实时回显
  unsubChunk?.();
  unsubChunk = window.opencode.onChunk((text) => {
    if (executing.value) {
      streamingLine.value += text;
    }
  });

  try {
    const res = await window.opencode.shell({
      sessionId,
      body: { command: cmd },
    });
    if (res.error) {
      outputLines.value.push(`错误: ${res.error}`);
    } else if (streamingLine.value) {
      // 流式输出已收集，追加到结果
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
  sessionStore.loadSessions();
});

onUnmounted(() => {
  unsubChunk?.();
});
</script>

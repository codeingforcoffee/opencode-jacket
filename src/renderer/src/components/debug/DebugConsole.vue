<template>
  <aside
    class="flex h-full w-120 shrink-0 flex-col border-l border-gray-700/60 bg-gray-900/95 font-mono"
    style="font-size: 11px; line-height: 1.5"
  >
    <!-- 标题栏 -->
    <div
      class="flex select-none items-center justify-between border-b border-gray-700/50 px-3 py-2"
    >
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Debug Console
        </span>
        <span class="rounded bg-gray-700/60 px-1.5 py-0.5 text-[10px] text-gray-400">
          {{ entries.length }}
        </span>
      </div>
      <button
        class="rounded px-2 py-0.5 text-[10px] text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-300"
        @click="UiConsole.clear()"
      >
        清空
      </button>
    </div>

    <!-- 过滤器 -->
    <div class="flex items-center gap-1 border-b border-gray-700/30 px-3 py-1.5">
      <button
        v-for="lv in ['all', 'log', 'info', 'warn', 'error'] as const"
        :key="lv"
        class="rounded px-2 py-0.5 text-[10px] transition-colors"
        :class="
          filterLevel === lv
            ? 'bg-gray-600 text-gray-100'
            : 'text-gray-500 hover:bg-gray-700/60 hover:text-gray-300'
        "
        @click="filterLevel = lv"
      >
        {{ lv }}
      </button>
    </div>

    <!-- 日志列表 -->
    <div ref="logContainer" class="flex-1 overflow-y-auto overscroll-contain">
      <div v-if="filtered.length === 0" class="px-3 py-6 text-center text-gray-600">暂无日志</div>
      <div
        v-for="entry in filtered"
        :key="entry.id"
        class="group relative flex gap-1.5 border-b border-gray-800/50 px-2 py-1 hover:bg-gray-800/40"
        :class="levelBg(entry.level)"
      >
        <span class="shrink-0 text-gray-600">{{ formatTime(entry.timestamp) }}</span>
        <span
          class="shrink-0 rounded px-1 text-[9px] font-bold leading-[18px]"
          :class="
            entry.source === 'main'
              ? 'bg-purple-900/60 text-purple-300'
              : 'bg-gray-700/50 text-gray-500'
          "
          >{{ entry.source === 'main' ? 'M' : 'R' }}</span
        >
        <span class="w-8 shrink-0 font-semibold" :class="levelColor(entry.level)">
          {{ entry.level.toUpperCase() }}
        </span>
        <span
          class="min-w-0 flex-1 break-all whitespace-pre-wrap pr-5"
          :class="levelColor(entry.level)"
          >{{ entry.message }}</span
        >

        <!-- 复制按钮 -->
        <button
          class="absolute right-1 top-0.5 flex h-5 w-5 items-center justify-center rounded text-gray-600 opacity-0 transition-opacity hover:bg-gray-700 hover:text-gray-300 group-hover:opacity-100"
          :title="copiedId === entry.id ? '已复制' : '复制'"
          @click.stop="copyEntry(entry)"
        >
          <svg
            v-if="copiedId !== entry.id"
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-green-400"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  UiConsole,
  uiConsoleEntries,
  type LogLevel,
  type LogEntry,
} from '@renderer/utils/ui-console';

const entries = uiConsoleEntries;

let idCounter = 100_000;
let unsubDebugLog: (() => void) | null = null;

// 过滤
const filterLevel = ref<'all' | LogLevel>('all');
const filtered = computed(() =>
  filterLevel.value === 'all'
    ? entries.value
    : entries.value.filter((e) => e.level === filterLevel.value)
);

// 自动滚动
const logContainer = ref<HTMLElement | null>(null);
let autoScroll = true;

watch(
  () => filtered.value.length,
  () => {
    if (autoScroll) nextTick(scrollToBottom);
  }
);

function scrollToBottom() {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
}

// 检测用户是否手动滚动
function onScroll() {
  const el = logContainer.value;
  if (!el) return;
  autoScroll = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
}

// 复制功能
const copiedId = ref<number | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

function copyEntry(entry: LogEntry) {
  const text = `[${formatTime(entry.timestamp)}] [${entry.source.toUpperCase()}] [${entry.level.toUpperCase()}] ${entry.message}`;
  navigator.clipboard.writeText(text).then(() => {
    copiedId.value = entry.id;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedId.value = null;
    }, 1500);
  });
}

onMounted(() => {
  logContainer.value?.addEventListener('scroll', onScroll);

  if (typeof window.opencode !== 'undefined') {
    unsubDebugLog = window.opencode.onDebugLog((entry) => {
      const level = (
        ['log', 'info', 'warn', 'error'].includes(entry.level) ? entry.level : 'log'
      ) as LogLevel;
      const logEntry: LogEntry = {
        id: idCounter++,
        level,
        message: entry.message,
        timestamp: new Date(entry.timestamp),
        source: 'main',
      };
      uiConsoleEntries.value.push(logEntry);
      if (uiConsoleEntries.value.length > 500) {
        uiConsoleEntries.value = uiConsoleEntries.value.slice(-500);
      }
    });
  }
});

onUnmounted(() => {
  logContainer.value?.removeEventListener('scroll', onScroll);
  unsubDebugLog?.();
  if (copiedTimer) clearTimeout(copiedTimer);
});

// 样式辅助
function levelColor(level: LogLevel): string {
  return {
    log: 'text-gray-300',
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  }[level];
}

function levelBg(level: LogLevel): string {
  return {
    log: '',
    info: '',
    warn: 'bg-yellow-950/30',
    error: 'bg-red-950/30',
  }[level];
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}
</script>

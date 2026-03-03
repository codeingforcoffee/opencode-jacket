import { ref } from 'vue';

export type LogLevel = 'log' | 'warn' | 'error' | 'info';

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: Date;
  source: 'renderer' | 'main';
}

let idCounter = 0;
const MAX_ENTRIES = 500;

export const uiConsoleEntries = ref<LogEntry[]>([]);

function serialize(arg: unknown): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function addEntry(level: LogLevel, args: unknown[]): void {
  const message = args.map(serialize).join(' ');
  uiConsoleEntries.value.push({
    id: idCounter++,
    level,
    message,
    timestamp: new Date(),
    source: 'renderer',
  });
  if (uiConsoleEntries.value.length > MAX_ENTRIES) {
    uiConsoleEntries.value = uiConsoleEntries.value.slice(-MAX_ENTRIES);
  }
}

export const UiConsole = {
  entries: uiConsoleEntries,

  log(...args: unknown[]): void {
    addEntry('log', args);
  },

  info(...args: unknown[]): void {
    addEntry('info', args);
  },

  warn(...args: unknown[]): void {
    addEntry('warn', args);
  },

  error(...args: unknown[]): void {
    addEntry('error', args);
  },

  clear(): void {
    uiConsoleEntries.value = [];
  },
};

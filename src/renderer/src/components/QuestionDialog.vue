<template>
  <Teleport to="body">
    <div v-if="request" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <!-- 头部 -->
        <h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
          {{ currentQuestion.header }}
        </h3>
        <p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
          {{ currentQuestion.question }}
        </p>

        <!-- 选项列表 -->
        <div class="mb-4 space-y-2">
          <button
            v-for="option in currentQuestion.options"
            :key="option.label"
            class="flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors"
            :class="
              isSelected(option.label)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
            "
            @click="toggleOption(option.label)"
          >
            <!-- 选中指示器 -->
            <span
              class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              :class="
                isSelected(option.label)
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              "
            >
              <span v-if="isSelected(option.label)" class="h-2 w-2 rounded-full bg-white" />
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                {{ option.label }}
              </p>
              <p v-if="option.description" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ option.description }}
              </p>
            </div>
          </button>
        </div>

        <!-- 自定义输入（custom=true 或未设置时显示） -->
        <div v-if="currentQuestion.custom !== false" class="mb-4">
          <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            或输入自定义回答
          </label>
          <input
            v-model="customText"
            type="text"
            placeholder="输入你的回答..."
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            @keydown.enter="submit"
          />
        </div>

        <!-- 多问题进度 -->
        <p v-if="request.questions.length > 1" class="mb-3 text-xs text-gray-400">
          问题 {{ currentIndex + 1 }} / {{ request.questions.length }}
        </p>

        <!-- 操作按钮 -->
        <div class="flex justify-between gap-2">
          <button
            class="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            @click="reject"
          >
            跳过
          </button>
          <div class="flex gap-2">
            <button
              v-if="currentIndex > 0"
              class="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="prev"
            >
              上一题
            </button>
            <button
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="!canSubmit"
              @click="submit"
            >
              {{ isLastQuestion ? '提交' : '下一题' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface QuestionOption {
  label: string;
  description: string;
}

interface QuestionInfo {
  question: string;
  header: string;
  options: QuestionOption[];
  multiple?: boolean;
  custom?: boolean;
}

interface QuestionRequest {
  requestID: string;
  sessionID?: string;
  questions: QuestionInfo[];
}

const props = defineProps<{
  request: QuestionRequest | null;
}>();

const emit = defineEmits<{
  done: [];
}>();

// 当前问题索引
const currentIndex = ref(0);
// 每道题已选选项（index → Set<label>）
const selections = ref<Map<number, Set<string>>>(new Map());
// 每道题的自定义文本（index → string）
const customTexts = ref<Map<number, string>>(new Map());
// 当前题自定义文本的绑定值（watch 同步到 map）
const customText = ref('');

// 当请求变化时重置所有状态
watch(
  () => props.request,
  () => {
    currentIndex.value = 0;
    selections.value = new Map();
    customTexts.value = new Map();
    customText.value = '';
  }
);

// 当切换题目时同步 customText
watch(currentIndex, (idx) => {
  customText.value = customTexts.value.get(idx) ?? '';
});

watch(customText, (val) => {
  customTexts.value.set(currentIndex.value, val);
});

const currentQuestion = computed<QuestionInfo>(
  () => props.request?.questions[currentIndex.value] ?? { question: '', header: '', options: [] }
);

const isLastQuestion = computed(
  () => currentIndex.value === (props.request?.questions.length ?? 1) - 1
);

function currentSelections(): Set<string> {
  const s = selections.value.get(currentIndex.value);
  if (s) return s;
  const newSet = new Set<string>();
  selections.value.set(currentIndex.value, newSet);
  return newSet;
}

function isSelected(label: string): boolean {
  return currentSelections().has(label);
}

function toggleOption(label: string): void {
  const s = currentSelections();
  if (currentQuestion.value.multiple) {
    if (s.has(label)) {
      s.delete(label);
    } else {
      s.add(label);
    }
  } else {
    s.clear();
    s.add(label);
  }
  // 触发响应式更新
  selections.value = new Map(selections.value);
}

// 当前题是否可以继续（有选项或有自定义文本）
const canSubmit = computed(() => {
  const s = currentSelections();
  const custom = customText.value.trim();
  return s.size > 0 || custom.length > 0;
});

function prev(): void {
  if (currentIndex.value > 0) currentIndex.value--;
}

async function submit(): Promise<void> {
  if (!props.request || !canSubmit.value) return;

  if (!isLastQuestion.value) {
    currentIndex.value++;
    return;
  }

  // 构造 answers: Array<Array<string>>（每道题一个 string[]）
  const answers: string[][] = props.request.questions.map((_, idx) => {
    const s = selections.value.get(idx);
    const custom = customTexts.value.get(idx)?.trim();
    const arr: string[] = s ? [...s] : [];
    if (custom && !arr.includes(custom)) arr.push(custom);
    return arr;
  });

  try {
    await window.opencode.questionReply(props.request.requestID, answers);
  } catch (err) {
    console.error('[QuestionDialog] reply failed:', err);
  }
  emit('done');
}

async function reject(): Promise<void> {
  if (!props.request) return;
  try {
    await window.opencode.questionReject(props.request.requestID);
  } catch (err) {
    console.error('[QuestionDialog] reject failed:', err);
  }
  emit('done');
}
</script>

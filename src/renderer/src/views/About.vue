<template>
  <div class="h-full overflow-y-auto p-6 max-w-2xl mx-auto">
    <h2 class="text-xl font-semibold mb-4">{{ $t('about.title') }}</h2>
    <p class="text-gray-600 dark:text-gray-400">{{ $t('about.desc') }}</p>
    <div class="mt-6 space-y-2">
      <p class="text-sm text-gray-500">
        <a
          href="https://opencode.ai/docs/zh-cn/sdk/"
          target="_blank"
          class="text-primary-600 hover:underline"
          >OpenCode SDK 文档</a
        >
      </p>
      <p class="text-sm text-gray-500">
        首次使用需配置 LLM provider：<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded"
          >opencode auth login</code
        >
      </p>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

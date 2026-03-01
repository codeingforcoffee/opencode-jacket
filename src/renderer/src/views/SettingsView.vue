<template>
  <div class="h-full flex flex-col p-6 max-w-2xl mx-auto">
    <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
      {{ $t('settings.title') }}
    </h1>

    <ElForm label-position="top" class="space-y-8">
      <!-- 语言设置 -->
      <div>
        <h2 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
          {{ $t('settings.language') }}
        </h2>
        <ElRadioGroup v-model="localeValue" @change="handleLocaleChange">
          <ElRadio value="zh">{{ $t('settings.languageZh') }}</ElRadio>
          <ElRadio value="en">{{ $t('settings.languageEn') }}</ElRadio>
        </ElRadioGroup>
      </div>

      <!-- 主题设置 -->
      <div>
        <h2 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
          {{ $t('settings.theme') }}
        </h2>
        <ElRadioGroup v-model="themeValue" @change="handleThemeChange">
          <ElRadio value="light">{{ $t('settings.themeLight') }}</ElRadio>
          <ElRadio value="dark">{{ $t('settings.themeDark') }}</ElRadio>
        </ElRadioGroup>
      </div>

      <!-- 连接配置 -->
      <div>
        <h2 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
          {{ $t('settings.connection') }}
        </h2>
        <SettingsDrawer />
      </div>
    </ElForm>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useThemeStore } from '@renderer/stores/theme';
import SettingsDrawer from '@renderer/components/SettingsDrawer.vue';

const { locale } = useI18n();
const themeStore = useThemeStore();

const localeValue = ref<'zh' | 'en'>('zh');
const themeValue = ref<'light' | 'dark'>('light');

onMounted(() => {
  localeValue.value = (locale.value as 'zh' | 'en') || 'zh';
  themeValue.value = themeStore.theme;
});

watch(
  () => themeStore.theme,
  (t) => {
    themeValue.value = t;
  }
);

function handleLocaleChange(val: 'zh' | 'en') {
  locale.value = val;
  localStorage.setItem('locale', val);
}

function handleThemeChange(val: 'light' | 'dark') {
  themeStore.setTheme(val);
}
</script>

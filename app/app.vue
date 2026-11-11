<script setup lang="ts">
import { zh_tw } from '@nuxt/ui/locale'

const { theme } = useTheme()

useHead({
  htmlAttrs: { 'lang': 'zh-Hant-TW', 'data-theme': theme },
  meta: [{ name: 'theme-color', content: () => (theme.value === 'comic' ? '#fffcf6' : '#fffdf0') }],
})
</script>

<template>
  <UApp :locale="zh_tw">
    <NuxtPage />
  </UApp>
</template>

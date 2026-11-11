<script setup lang="ts">
const { theme } = useTheme()

useHead({
  htmlAttrs: { 'data-theme': theme },
  meta: [{ name: 'theme-color', content: () => (theme.value === 'comic' ? '#fffcf6' : '#fffdf0') }],
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>

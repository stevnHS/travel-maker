<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { theme, themes } = useTheme()

const items = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: '主題' }],
  themes.map(t => ({
    label: t.label,
    icon: t.icon,
    type: 'checkbox' as const,
    checked: theme.value === t.value,
    onSelect: () => { theme.value = t.value },
  })),
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton icon="i-lucide-palette" color="neutral" variant="ghost" aria-label="切換主題" />
  </UDropdownMenu>
</template>

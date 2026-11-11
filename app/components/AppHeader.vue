<script setup lang="ts">
const { user, clear } = useUserSession()

const menu = [[{
  label: '登出',
  icon: 'i-lucide-log-out',
  async onSelect() {
    await clear()
    await navigateTo('/')
  },
}]]
</script>

<template>
  <header class="sticky top-0 z-10 bg-default/90 backdrop-blur comic:border-b-3 comic:border-(--tm-ink) cream:border-b cream:border-default">
    <div class="mx-auto flex h-14 max-w-xl items-center justify-between gap-2 px-4">
      <NuxtLink to="/" class="flex items-center gap-2 font-bold text-highlighted">
        <AppLogo class="size-8" />
        <span>Travel Maker</span>
      </NuxtLink>
      <div class="flex items-center gap-1">
        <ThemeSwitcher />
        <UDropdownMenu v-if="user" :items="menu" :content="{ align: 'end' }">
          <UButton color="neutral" variant="ghost" class="gap-2 px-1.5" :aria-label="user.displayName">
            <UAvatar :src="user.avatarUrl ?? undefined" :alt="user.displayName" size="sm" />
            <span class="max-w-24 truncate max-sm:hidden">{{ user.displayName }}</span>
          </UButton>
        </UDropdownMenu>
      </div>
    </div>
  </header>
</template>

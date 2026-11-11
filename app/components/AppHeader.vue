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
  <header class="border-b border-default">
    <div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
      <NuxtLink to="/" class="font-bold">
        Travel Maker
      </NuxtLink>
      <UDropdownMenu v-if="user" :items="menu" :content="{ align: 'end' }">
        <UButton color="neutral" variant="ghost" class="gap-2">
          <UAvatar :src="user.avatarUrl ?? undefined" :alt="user.displayName" size="sm" />
          <span class="max-sm:hidden">{{ user.displayName }}</span>
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
</template>

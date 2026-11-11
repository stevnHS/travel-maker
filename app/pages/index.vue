<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-4">
    <h1 class="text-2xl font-bold">Travel Maker</h1>
    <p class="text-muted">旅遊行程共編與共同記帳</p>

    <template v-if="loggedIn && user">
      <div class="flex items-center gap-3">
        <UAvatar :src="user.avatarUrl ?? undefined" :alt="user.displayName" />
        <span>{{ user.displayName }}</span>
      </div>
      <UButton color="neutral" variant="outline" @click="logout">登出</UButton>
    </template>

    <UButton v-else to="/auth/line" external size="lg" class="bg-[#06C755] hover:bg-[#05b34c]">
      使用 LINE 登入
    </UButton>
  </main>
</template>

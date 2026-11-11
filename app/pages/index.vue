<script setup lang="ts">
const { loggedIn } = useUserSession()
const { login } = useLogin()
const route = useRoute()
const toast = useToast()

const { data: trips, status, refresh } = await useFetch('/api/trips', {
  immediate: loggedIn.value,
  default: () => [],
})
watch(loggedIn, value => value && refresh())

const createOpen = ref(false)

onMounted(() => {
  if (route.query.error === 'login_failed') {
    toast.add({ title: '登入失敗，請再試一次', color: 'error' })
  }
})
</script>

<template>
  <div v-if="loggedIn">
    <AppHeader />
    <main class="mx-auto max-w-3xl space-y-4 p-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">
          我的旅程
        </h1>
        <UButton icon="i-lucide-plus" @click="createOpen = true">
          建立旅程
        </UButton>
      </div>

      <div v-if="status === 'pending' && !trips.length" class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-20 w-full" />
      </div>

      <UCard v-else-if="!trips.length" class="text-center">
        <p class="text-muted">
          還沒有旅程，建立一個，或請旅伴傳邀請連結給你。
        </p>
      </UCard>

      <ul v-else class="space-y-3">
        <li v-for="trip in trips" :key="trip.id">
          <NuxtLink
            :to="`/trips/${trip.id}`"
            class="block rounded-lg border border-default p-4 transition hover:bg-elevated"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="font-medium">{{ trip.name }}</span>
              <UBadge v-if="trip.role === 'owner'" variant="subtle" size="sm">
                擁有者
              </UBadge>
            </div>
            <div class="mt-1 flex gap-4 text-sm text-muted">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar" />{{ formatDateRange(trip.startDate, trip.endDate) }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-users" />{{ trip.memberCount }} 人
              </span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </main>

    <TripFormModal v-model:open="createOpen" @saved="id => navigateTo(`/trips/${id}`)" />
  </div>

  <main v-else class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-4">
    <h1 class="text-2xl font-bold">
      Travel Maker
    </h1>
    <p class="text-muted">
      旅遊行程共編與共同記帳
    </p>
    <UButton size="lg" class="bg-[#06C755] hover:bg-[#05b34c]" @click="login()">
      使用 LINE 登入
    </UButton>
  </main>
</template>

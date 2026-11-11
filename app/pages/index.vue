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
    <main class="mx-auto max-w-xl space-y-4 p-4 pb-10">
      <SectionHeading icon="i-lucide-map" title="我的旅程">
        <UButton icon="i-lucide-plus" @click="createOpen = true">
          建立旅程
        </UButton>
      </SectionHeading>

      <div v-if="status === 'pending' && !trips.length" class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-20 w-full rounded-2xl" />
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
            class="block p-4 transition
              cream:rounded-[18px] cream:border-l-6 cream:border-primary cream:bg-(--tm-card) cream:shadow-cream cream:hover:bg-(--tm-accent-soft)
              comic:rounded-2xl comic:border-3 comic:border-(--tm-ink) comic:bg-(--tm-card) comic:shadow-comic comic:hover:-translate-y-0.5 comic:active:translate-0.5 comic:active:shadow-none"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="font-bold text-highlighted">{{ trip.name }}</span>
              <UBadge v-if="trip.role === 'owner'" variant="soft" size="sm" icon="i-lucide-crown">
                擁有者
              </UBadge>
            </div>
            <div class="mt-1.5 flex gap-4 text-sm text-muted">
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

  <main v-else class="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-4 text-center">
    <div class="absolute top-3 right-3">
      <ThemeSwitcher />
    </div>
    <AppLogo class="h-14" />
    <h1 class="text-3xl font-bold text-highlighted comic:font-black">
      Travel Maker
    </h1>
    <p class="text-muted">
      和旅伴一起排行程、記帳、分帳
    </p>
    <UButton size="xl" class="bg-[#06C755] text-white hover:bg-[#05b34c] comic:text-white" @click="login()">
      使用 LINE 登入
    </UButton>
  </main>
</template>

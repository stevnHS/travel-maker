<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const tripState = useTrip()
const { tripId, trip, error, refresh } = tripState
// 等資料載入完再渲染分頁；分頁內呼叫 useTrip() 會直接拿到同一份資料
await tripState

useAutoRefresh(refresh, { interval: 30_000 })
useSeoMeta({ title: () => trip.value?.name ?? '旅程' })

const tabs = computed(() => [
  { label: '總覽', icon: 'i-lucide-house', to: `/trips/${tripId}` },
  { label: '行程', icon: 'i-lucide-calendar-days', to: `/trips/${tripId}/itinerary` },
  { label: '記帳', icon: 'i-lucide-wallet', to: `/trips/${tripId}/expenses` },
])
const isActive = (to: string) => route.path === to
</script>

<template>
  <div class="pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
    <AppHeader />

    <main class="mx-auto max-w-xl p-4 pb-6">
      <UCard v-if="error" class="text-center">
        <p class="mb-4">
          {{ getErrorMessage(error, '無法載入旅程') }}
        </p>
        <UButton to="/" color="neutral" variant="outline">
          回首頁
        </UButton>
      </UCard>

      <NuxtPage v-else-if="trip" />
    </main>

    <!-- 底部分頁列 -->
    <nav
      v-if="trip"
      class="fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom)]
        cream:border-t cream:border-default cream:bg-(--tm-card)
        comic:border-t-3 comic:border-(--tm-ink) comic:bg-(--tm-washi)"
    >
      <ul class="mx-auto grid max-w-xl grid-cols-3">
        <li v-for="tab in tabs" :key="tab.to">
          <NuxtLink
            :to="tab.to"
            :aria-current="isActive(tab.to) ? 'page' : undefined"
            class="group flex flex-col items-center gap-0.5 py-2 text-xs text-muted transition
              aria-[current=page]:text-highlighted aria-[current=page]:font-bold"
          >
            <span
              class="flex h-7 w-12 items-center justify-center rounded-full transition
                cream:group-aria-[current=page]:bg-(--tm-accent-soft) cream:group-aria-[current=page]:text-[#f9a825]
                comic:group-aria-[current=page]:border-2 comic:group-aria-[current=page]:border-(--tm-ink) comic:group-aria-[current=page]:bg-(--tm-yamabuki)"
            >
              <UIcon :name="tab.icon" class="size-5" />
            </span>
            {{ tab.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

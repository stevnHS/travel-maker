<script setup lang="ts">
const route = useRoute()
const token = route.params.token as string
const { loggedIn } = useUserSession()
const { login } = useLogin()
const toast = useToast()

const { data, error } = await useFetch(`/api/invites/${encodeURIComponent(token)}`)

const joining = ref(false)

async function join() {
  joining.value = true
  try {
    const { tripId } = await $fetch(`/api/invites/${encodeURIComponent(token)}/join`, { method: 'POST' })
    await navigateTo(`/trips/${tripId}`, { replace: true })
  }
  catch (err) {
    toast.add({ title: getErrorMessage(err), color: 'error' })
  }
  finally {
    joining.value = false
  }
}

useSeoMeta({ title: () => data.value ? `加入「${data.value.trip.name}」` : '旅程邀請' })
</script>

<template>
  <main class="relative mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
    <div class="absolute top-3 right-3">
      <ThemeSwitcher />
    </div>
    <UCard v-if="error">
      <div class="space-y-4 text-center">
        <UIcon name="i-lucide-link-2-off" class="size-10 text-muted" />
        <p>{{ getErrorMessage(error, '無法載入邀請') }}</p>
        <UButton to="/" color="neutral" variant="outline">
          回首頁
        </UButton>
      </div>
    </UCard>

    <UCard v-else-if="data">
      <div class="space-y-4 text-center">
        <p class="text-sm text-muted">
          {{ data.trip.ownerName }} 邀請你加入旅程
        </p>
        <AppLogo class="mx-auto h-10" />
        <h1 class="text-2xl font-bold text-highlighted comic:font-black">
          {{ data.trip.name }}
        </h1>
        <div class="flex justify-center gap-4 text-sm text-muted">
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-calendar" />{{ formatDateRange(data.trip.startDate, data.trip.endDate) }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-users" />{{ data.trip.memberCount }} 人
          </span>
        </div>

        <UButton v-if="data.isMember" :to="`/trips/${data.trip.id}`" block size="lg">
          你已是成員，前往旅程
        </UButton>
        <UButton v-else-if="loggedIn" block size="lg" :loading="joining" @click="join">
          加入旅程
        </UButton>
        <UButton
          v-else
          block
          size="lg"
          class="bg-[#06C755] text-white hover:bg-[#05b34c] comic:text-white"
          @click="login(route.fullPath)"
        >
          使用 LINE 登入後加入
        </UButton>
      </div>
    </UCard>
  </main>
</template>

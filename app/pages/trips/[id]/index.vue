<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const tripId = route.params.id as string
const { user } = useUserSession()
const toast = useToast()
const confirm = useConfirm()

// 這些操作不需回傳值；明確指定 $fetch<unknown> 可避免 typed 路由比對造成型別遞迴過深
const api = (path = ''): string => `/api/trips/${tripId}${path}`

const { data, error, refresh } = await useFetch(`/api/trips/${tripId}`)

const trip = computed(() => data.value?.trip)
const members = computed(() => data.value?.members ?? [])
const isOwner = computed(() => data.value?.myRole === 'owner')

useSeoMeta({ title: () => trip.value?.name ?? '旅程' })

// ── 邀請連結 ─────────────────────────────────────────────

const inviteUrl = computed(() =>
  trip.value ? `${useRequestURL().origin}/join/${trip.value.inviteToken}` : '',
)
const lineShareUrl = computed(() =>
  `https://line.me/R/msg/text/?${encodeURIComponent(`一起規劃「${trip.value?.name}」吧！\n${inviteUrl.value}`)}`,
)

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    toast.add({ title: '已複製邀請連結', color: 'success' })
  }
  catch {
    toast.add({ title: '無法複製，請手動選取連結', color: 'error' })
  }
}

// ── 操作 ─────────────────────────────────────────────────

const editOpen = ref(false)

/** 執行 API 呼叫，失敗時顯示錯誤；成功回傳 true */
async function run(action: () => Promise<unknown>, successTitle?: string) {
  try {
    await action()
    if (successTitle) toast.add({ title: successTitle, color: 'success' })
    return true
  }
  catch (err) {
    toast.add({ title: getErrorMessage(err), color: 'error' })
    return false
  }
}

async function resetInvite() {
  const ok = await confirm({
    title: '重設邀請連結？',
    description: '舊連結將立即失效，已加入的成員不受影響。',
    confirmLabel: '重設',
  })
  if (ok && await run(() => $fetch<unknown>(api('/invite-token'), { method: 'POST' }), '已重設邀請連結')) {
    await refresh()
  }
}

async function deleteTrip() {
  const ok = await confirm({
    title: `刪除「${trip.value?.name}」？`,
    description: '行程與所有記帳資料將一併刪除，無法復原。',
    confirmLabel: '刪除',
    danger: true,
  })
  if (ok && await run(() => $fetch<unknown>(api(), { method: 'DELETE' }), '旅程已刪除')) {
    await navigateTo('/', { replace: true })
  }
}

async function removeMember(member: { id: string, displayName: string }) {
  const ok = await confirm({
    title: `將 ${member.displayName} 移出旅程？`,
    confirmLabel: '移除',
    danger: true,
  })
  if (ok && await run(() => $fetch<unknown>(api(`/members/${member.id}`),{ method: 'DELETE' }), '已移除成員')) {
    await refresh()
  }
}

async function transferOwnership(member: { id: string, displayName: string }) {
  const ok = await confirm({
    title: `將擁有者轉移給 ${member.displayName}？`,
    description: '轉移後你將成為一般成員，無法再管理成員或刪除旅程。',
    confirmLabel: '轉移',
  })
  if (ok && await run(() => $fetch<unknown>(api('/transfer'),{ method: 'POST', body: { userId: member.id } }), '已轉移擁有者')) {
    await refresh()
  }
}

async function leaveTrip() {
  const ok = await confirm({
    title: '退出旅程？',
    description: '退出後需要新的邀請連結才能再次加入。',
    confirmLabel: '退出',
    danger: true,
  })
  if (ok && user.value && await run(() => $fetch<unknown>(api(`/members/${user.value!.id}`),{ method: 'DELETE' }), '已退出旅程')) {
    await navigateTo('/', { replace: true })
  }
}

const ownerMenu: DropdownMenuItem[][] = [
  [{ label: '重設邀請連結', icon: 'i-lucide-refresh-cw', onSelect: resetInvite }],
  [{ label: '刪除旅程', icon: 'i-lucide-trash-2', color: 'error', onSelect: deleteTrip }],
]

function memberMenu(member: { id: string, displayName: string }): DropdownMenuItem[][] {
  return [[
    { label: '轉為擁有者', icon: 'i-lucide-crown', onSelect: () => transferOwnership(member) },
    { label: '移出旅程', icon: 'i-lucide-user-minus', color: 'error', onSelect: () => removeMember(member) },
  ]]
}
</script>

<template>
  <div>
    <AppHeader />

    <main class="mx-auto max-w-3xl space-y-6 p-4">
      <UCard v-if="error" class="text-center">
        <p class="mb-4">
          {{ getErrorMessage(error, '無法載入旅程') }}
        </p>
        <UButton to="/" color="neutral" variant="outline">
          回首頁
        </UButton>
      </UCard>

      <template v-else-if="trip">
        <!-- 旅程資訊 -->
        <section class="flex items-start justify-between gap-4">
          <div class="min-w-0 space-y-1">
            <h1 class="text-2xl font-bold break-words">
              {{ trip.name }}
            </h1>
            <p class="flex items-center gap-1 text-sm text-muted">
              <UIcon name="i-lucide-calendar" />{{ formatDateRange(trip.startDate, trip.endDate) }}
            </p>
            <p v-if="trip.description" class="pt-2 whitespace-pre-line">
              {{ trip.description }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <UButton icon="i-lucide-pencil" color="neutral" variant="outline" @click="editOpen = true">
              編輯
            </UButton>
            <UDropdownMenu v-if="isOwner" :items="ownerMenu" :content="{ align: 'end' }">
              <UButton icon="i-lucide-ellipsis" color="neutral" variant="outline" aria-label="更多操作" />
            </UDropdownMenu>
          </div>
        </section>

        <!-- 邀請 -->
        <UCard>
          <template #header>
            <h2 class="font-medium">
              邀請旅伴
            </h2>
          </template>
          <div class="flex flex-col gap-2 sm:flex-row">
            <UInput :model-value="inviteUrl" readonly class="flex-1" @focus="($event.target as HTMLInputElement).select()" />
            <div class="flex gap-2">
              <UButton icon="i-lucide-copy" color="neutral" variant="outline" @click="copyInvite">
                複製
              </UButton>
              <UButton :to="lineShareUrl" target="_blank" external class="bg-[#06C755] hover:bg-[#05b34c]">
                分享到 LINE
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- 成員 -->
        <UCard>
          <template #header>
            <h2 class="font-medium">
              成員（{{ members.length }}）
            </h2>
          </template>
          <ul class="divide-y divide-default">
            <li v-for="member in members" :key="member.id" class="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <UAvatar :src="member.avatarUrl ?? undefined" :alt="member.displayName" />
              <span class="min-w-0 flex-1 truncate">
                {{ member.displayName }}
                <span v-if="member.id === user?.id" class="text-sm text-muted">（你）</span>
              </span>
              <UBadge v-if="member.role === 'owner'" variant="subtle" size="sm">
                擁有者
              </UBadge>
              <UDropdownMenu v-if="isOwner && member.id !== user?.id" :items="memberMenu(member)" :content="{ align: 'end' }">
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" aria-label="成員操作" />
              </UDropdownMenu>
            </li>
          </ul>
          <template v-if="!isOwner" #footer>
            <UButton color="error" variant="ghost" icon="i-lucide-log-out" @click="leaveTrip">
              退出旅程
            </UButton>
          </template>
        </UCard>
      </template>
    </main>

    <TripFormModal
      v-if="trip"
      v-model:open="editOpen"
      :trip="trip"
      @saved="refresh()"
      @conflict="refresh()"
    />
  </div>
</template>

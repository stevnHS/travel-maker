<script setup lang="ts">
const { user } = useUserSession()
const { tripId, trip, members, memberById, memberName } = useTrip()

const { data, status, refresh } = await useFetch(`/api/trips/${tripId}/expenses`, {
  key: `expenses:${tripId}`,
})
useAutoRefresh(refresh)

const expenses = computed(() => data.value?.expenses ?? [])
const transfers = computed(() => data.value?.transfers ?? [])
const balances = computed(() => (data.value?.balances ?? []).filter(b => b.paid || b.owed))
const myBalance = computed(() => data.value?.balances.find(b => b.userId === user.value?.id))

// 依日期分組（使用者所在時區）
function localDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const groups = computed(() => {
  const map = new Map<string, typeof expenses.value>()
  for (const e of expenses.value) {
    const key = localDate(e.spentAt)
    map.set(key, [...(map.get(key) ?? []), e])
  }
  return [...map.entries()].map(([date, items]) => ({
    date,
    items,
    total: items.reduce((s, e) => s + e.amount, 0),
  }))
})

const myShare = (e: (typeof expenses.value)[number]) => e.splits.find(s => s.userId === user.value?.id)?.amount ?? 0

// 新增支出的預設日期：旅程期間內用今天，否則用出發日
const defaultDate = computed(() => {
  const today = localDate(new Date().toISOString())
  const { startDate, endDate } = trip.value ?? {}
  if (startDate && endDate && (today < startDate || today > endDate)) return startDate
  return today
})

const formOpen = ref(false)
const editingId = ref<string>()
const editingExpense = computed(() => expenses.value.find(e => e.id === editingId.value))

function openCreate() {
  editingId.value = undefined
  formOpen.value = true
}
function openEdit(id: string) {
  editingId.value = id
  formOpen.value = true
}
</script>

<template>
  <div class="space-y-5">
    <!-- 總覽 -->
    <section
      class="p-5
        cream:rounded-[24px] cream:bg-(--tm-accent-soft)
        comic:rounded-3xl comic:border-3 comic:border-(--tm-ink) comic:bg-(--tm-card) comic:shadow-comic-lg"
    >
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="text-sm text-muted">
            旅程總支出
          </p>
          <p class="text-3xl font-bold text-highlighted tabular-nums comic:font-black">
            {{ formatMoney(data?.total ?? 0) }}
          </p>
        </div>
        <UButton icon="i-lucide-plus" size="lg" @click="openCreate">
          記一筆
        </UButton>
      </div>
      <p v-if="myBalance && (myBalance.paid || myBalance.owed)" class="mt-3 text-sm">
        你已付 {{ formatMoney(myBalance.paid) }}，應分攤 {{ formatMoney(myBalance.owed) }}，
        <b v-if="myBalance.net > 0" class="text-success">應收回 {{ formatMoney(myBalance.net) }}</b>
        <b v-else-if="myBalance.net < 0" class="text-error">還需付 {{ formatMoney(-myBalance.net) }}</b>
        <b v-else>已打平</b>
      </p>
    </section>

    <!-- 結算 -->
    <UCard v-if="expenses.length">
      <template #header>
        <SectionHeading icon="i-lucide-scale" title="結算" tone="wakatake" />
      </template>

      <p v-if="!transfers.length" class="text-center text-muted">
        大家已經打平了 🎉
      </p>
      <ul v-else class="space-y-2">
        <li
          v-for="t in transfers"
          :key="`${t.from}-${t.to}`"
          class="flex items-center gap-2 rounded-xl px-3 py-2
            cream:bg-(--ui-bg-muted)
            comic:border-2 comic:border-(--tm-ink)"
          :class="(t.from === user?.id || t.to === user?.id) && 'cream:bg-(--tm-accent-soft) comic:bg-(--tm-accent-soft)'"
        >
          <UAvatar :src="memberById.get(t.from)?.avatarUrl ?? undefined" :alt="memberName(t.from)" size="xs" />
          <span class="truncate font-medium">{{ t.from === user?.id ? '你' : memberName(t.from) }}</span>
          <UIcon name="i-lucide-arrow-right" class="shrink-0 text-muted" />
          <UAvatar :src="memberById.get(t.to)?.avatarUrl ?? undefined" :alt="memberName(t.to)" size="xs" />
          <span class="truncate font-medium">{{ t.to === user?.id ? '你' : memberName(t.to) }}</span>
          <span class="ml-auto shrink-0 font-bold tabular-nums">{{ formatMoney(t.amount) }}</span>
        </li>
      </ul>

      <details class="mt-4 text-sm">
        <summary class="cursor-pointer text-muted">
          每人收支明細
        </summary>
        <table class="mt-2 w-full tabular-nums">
          <thead class="text-xs text-muted">
            <tr>
              <th class="py-1 text-left font-normal">
                成員
              </th>
              <th class="text-right font-normal">
                已付
              </th>
              <th class="text-right font-normal">
                應付
              </th>
              <th class="text-right font-normal">
                淨額
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in balances" :key="b.userId" class="border-t border-(--ui-border-muted)">
              <td class="py-1.5">
                {{ memberName(b.userId) }}
              </td>
              <td class="text-right">
                {{ b.paid.toLocaleString() }}
              </td>
              <td class="text-right">
                {{ b.owed.toLocaleString() }}
              </td>
              <td class="text-right font-bold" :class="b.net > 0 ? 'text-success' : b.net < 0 ? 'text-error' : ''">
                {{ b.net > 0 ? '+' : '' }}{{ b.net.toLocaleString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </UCard>

    <!-- 明細 -->
    <div v-if="status === 'pending' && !expenses.length" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-16 w-full rounded-2xl" />
    </div>

    <UCard v-else-if="!expenses.length" class="text-center">
      <div class="space-y-2 py-4">
        <UIcon name="i-lucide-receipt" class="size-10 text-muted" />
        <p class="text-muted">
          還沒有支出紀錄，按「記一筆」開始記帳
        </p>
      </div>
    </UCard>

    <section v-for="group in groups" v-else :key="group.date" class="space-y-2">
      <div class="flex items-baseline justify-between px-1 text-sm text-muted">
        <span class="font-bold">{{ formatDay(group.date).md }} {{ formatDay(group.date).weekday }}</span>
        <span class="tabular-nums">{{ formatMoney(group.total) }}</span>
      </div>
      <ul class="space-y-2">
        <li v-for="e in group.items" :key="e.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 p-3 text-left transition
              cream:rounded-2xl cream:bg-(--tm-card) cream:shadow-cream cream:hover:bg-(--tm-accent-soft)
              comic:rounded-2xl comic:border-[2.5px] comic:border-(--tm-ink) comic:bg-(--tm-card) comic:shadow-comic-sm comic:active:translate-0.5 comic:active:shadow-none"
            @click="openEdit(e.id)"
          >
            <UAvatar :src="memberById.get(e.paidBy)?.avatarUrl ?? undefined" :alt="memberName(e.paidBy)" size="sm" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold text-highlighted">
                {{ e.title }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ e.paidBy === user?.id ? '你' : memberName(e.paidBy) }} 付款 · {{ splitTypeLabel(e.splitType) }} {{ e.splits.length }} 人
              </p>
            </div>
            <div class="shrink-0 text-right tabular-nums">
              <p class="font-bold">
                {{ formatMoney(e.amount) }}
              </p>
              <p v-if="myShare(e)" class="text-xs text-muted">
                你 {{ myShare(e).toLocaleString() }}
              </p>
            </div>
          </button>
        </li>
      </ul>
    </section>

    <ExpenseFormModal
      v-model:open="formOpen"
      :trip-id="tripId"
      :members="members"
      :expense="editingExpense"
      :editing-id="editingId"
      :default-date="defaultDate"
      @saved="refresh()"
      @conflict="refresh()"
    />
  </div>
</template>

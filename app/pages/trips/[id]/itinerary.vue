<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { tripId } = useTrip()

const { data, status, refresh } = await useFetch(`/api/trips/${tripId}/itinerary`, {
  key: `itinerary:${tripId}`,
})
useAutoRefresh(refresh)

const days = computed(() => data.value?.days ?? [])

// ── 選擇的天：記在網址 ?day=YYYY-MM-DD，方便分享與重新整理 ──────

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const selectedDate = computed({
  get() {
    const q = route.query.day
    if (typeof q === 'string' && days.value.some(d => d.date === q)) return q
    return days.value[0]?.date
  },
  set(date) {
    router.replace({ query: { ...route.query, day: date } })
  },
})
const selectedIndex = computed(() => days.value.findIndex(d => d.date === selectedDate.value))
const selectedDay = computed(() => days.value[selectedIndex.value])

// 旅程進行中時，第一次進來自動跳到今天
onMounted(() => {
  const today = todayString()
  if (!route.query.day && days.value.some(d => d.date === today)) selectedDate.value = today
})

// ── 當天標題 ──────────────────────────────────────────

const editingTitle = ref(false)
const titleDraft = ref('')
const savingTitle = ref(false)

function startEditTitle() {
  titleDraft.value = selectedDay.value?.title ?? ''
  editingTitle.value = true
}

async function saveTitle() {
  const day = selectedDay.value
  if (!day) return
  savingTitle.value = true
  try {
    await $fetch<unknown>(`/api/trips/${tripId}/days/${day.id}` as string, {
      method: 'PATCH',
      body: { title: titleDraft.value, version: day.version },
    })
    editingTitle.value = false
  }
  catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' })
  }
  finally {
    savingTitle.value = false
    await refresh()
  }
}
watch(selectedDate, () => { editingTitle.value = false })

// ── 新增 / 編輯項目 ────────────────────────────────────

const formOpen = ref(false)
const editingId = ref<string>()
// 每次同步後都從最新資料找出編輯中的項目，讓表單能察覺「已被他人更新 / 刪除」
const editingItem = computed(() => {
  if (!editingId.value) return undefined
  for (const day of days.value) {
    const found = day.items.find(i => i.id === editingId.value)
    if (found) return found
  }
  return undefined
})

function openCreate() {
  editingId.value = undefined
  formOpen.value = true
}
function openEdit(id: string) {
  editingId.value = id
  formOpen.value = true
}

// ── 排序 / 刪除 ───────────────────────────────────────

async function move(index: number, direction: -1 | 1) {
  const day = selectedDay.value
  if (!day) return
  const ids = day.items.map(i => i.id)
  const target = index + direction
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]

  // 先在畫面上換位置，失敗再以伺服器資料為準（useFetch 的 data 是 shallowRef，需整個替換）
  const items = [...day.items]
  ;[items[index], items[target]] = [items[target]!, items[index]!]
  data.value = { days: days.value.map(d => (d.id === day.id ? { ...d, items } : d)) }

  try {
    await $fetch<unknown>(`/api/trips/${tripId}/days/${day.id}/order` as string, { method: 'PUT', body: { itemIds: ids } })
  }
  catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' })
  }
  finally {
    await refresh()
  }
}

async function remove(item: { id: string, title: string }) {
  const ok = await confirm({ title: `刪除「${item.title}」？`, confirmLabel: '刪除', danger: true })
  if (!ok) return
  try {
    await $fetch<unknown>(`/api/trips/${tripId}/items/${item.id}` as string, { method: 'DELETE' })
  }
  catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' })
  }
  finally {
    await refresh()
  }
}
</script>

<template>
  <div>
    <!-- 尚未設定日期 -->
    <UCard v-if="!days.length && status !== 'pending'" class="text-center">
      <div class="space-y-4 py-4">
        <UIcon name="i-lucide-calendar-plus" class="size-10 text-muted" />
        <p>先設定旅程的開始與結束日期，<br>就會自動產生每一天的行程表。</p>
        <UButton :to="`/trips/${tripId}?edit=1`" icon="i-lucide-pencil">
          設定旅程日期
        </UButton>
      </div>
    </UCard>

    <template v-else-if="selectedDay">
      <!-- 日期分頁 -->
      <div class="sticky top-14 z-10 -mx-4 bg-default/95 px-4 py-2 backdrop-blur">
        <div class="no-scrollbar flex gap-2 overflow-x-auto">
          <button
            v-for="(day, i) in days"
            :key="day.id"
            type="button"
            :aria-pressed="day.date === selectedDate"
            class="shrink-0 px-3.5 py-1.5 text-center text-xs leading-tight transition
              cream:rounded-2xl cream:border cream:border-default cream:bg-(--tm-card)
              cream:aria-[pressed=true]:border-primary cream:aria-[pressed=true]:bg-primary cream:aria-[pressed=true]:text-white
              comic:rounded-xl comic:border-[2.5px] comic:border-(--tm-ink) comic:bg-(--tm-card) comic:font-bold
              comic:aria-[pressed=true]:bg-(--tm-yamabuki) comic:aria-[pressed=true]:shadow-comic-sm"
            @click="selectedDate = day.date"
          >
            <span class="block text-[11px] opacity-80">第 {{ i + 1 }} 天</span>
            <b class="block text-sm">{{ formatDay(day.date).md }}</b>
            <span class="block opacity-80">{{ formatDay(day.date).weekday }}</span>
          </button>
        </div>
      </div>

      <!-- 當天標題 -->
      <div class="mt-3 mb-4">
        <div v-if="editingTitle" class="flex gap-2">
          <UInput
            v-model="titleDraft"
            placeholder="例如：高雄・岡山／左營／苓雅"
            class="flex-1"
            autofocus
            maxlength="50"
            @keydown.enter="saveTitle"
            @keydown.esc="editingTitle = false"
          />
          <UButton :loading="savingTitle" @click="saveTitle">
            儲存
          </UButton>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" aria-label="取消" @click="editingTitle = false" />
        </div>
        <div v-else class="flex items-center gap-1">
          <h2 class="text-lg font-bold text-highlighted comic:font-black">
            {{ selectedDay.title || `第 ${selectedIndex + 1} 天` }}
          </h2>
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="selectedDay.title ? '修改當天標題' : '新增當天標題'"
            @click="startEditTitle"
          />
        </div>
      </div>

      <!-- 項目 -->
      <TransitionGroup tag="ul" name="list" class="relative space-y-3">
        <li v-for="(item, index) in selectedDay.items" :key="item.id">
          <ItineraryItemCard
            :item="item"
            :is-first="index === 0"
            :is-last="index === selectedDay.items.length - 1"
            @edit="openEdit(item.id)"
            @move="move(index, $event)"
            @remove="remove(item)"
          />
        </li>
      </TransitionGroup>

      <p v-if="!selectedDay.items.length" class="py-8 text-center text-muted">
        這天還沒有行程
      </p>

      <UButton icon="i-lucide-plus" block size="lg" class="mt-4" @click="openCreate">
        新增行程
      </UButton>
    </template>

    <ItemFormModal
      v-model:open="formOpen"
      :trip-id="tripId"
      :days="days"
      :item="editingItem"
      :editing-id="editingId"
      :default-day-id="selectedDay?.id"
      @saved="refresh()"
      @conflict="refresh()"
    />
  </div>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

.list-move { transition: transform 0.25s ease; }
@media (prefers-reduced-motion: reduce) {
  .list-move { transition: none; }
}
</style>

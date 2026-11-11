<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

interface Day {
  id: string
  date: string
}

interface Item {
  id: string
  dayId: string
  title: string
  category: string
  startTime: string | null
  endTime: string | null
  location: string | null
  note: string | null
  version: number
}

const props = defineProps<{
  tripId: string
  days: Day[]
  /** 編輯中的項目（父層每次同步都會傳入最新版本）；新增時為 undefined */
  item?: Item
  /** 編輯時若項目在同步後消失，代表已被他人刪除 */
  editingId?: string
  defaultDayId?: string
}>()

const emit = defineEmits<{ saved: [], conflict: [] }>()
const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const confirm = useConfirm()
const submitting = ref(false)

const state = reactive({
  dayId: '',
  title: '',
  category: 'spot' as ItemCategory,
  startTime: '',
  endTime: '',
  location: '',
  note: '',
})
// 開啟表單時的版本；之後同步到較新版本也不覆蓋使用者正在編輯的內容
const baseVersion = ref(0)

function load() {
  const it = props.item
  Object.assign(state, {
    dayId: it?.dayId ?? props.defaultDayId ?? props.days[0]?.id ?? '',
    title: it?.title ?? '',
    category: (it?.category ?? 'spot') as ItemCategory,
    startTime: formatTime(it?.startTime ?? null),
    endTime: formatTime(it?.endTime ?? null),
    location: it?.location ?? '',
    note: it?.note ?? '',
  })
  baseVersion.value = it?.version ?? 0
}

watch(open, isOpen => isOpen && load(), { immediate: true })

const isEdit = computed(() => Boolean(props.editingId))
const deletedRemotely = computed(() => isEdit.value && !props.item)
const updatedRemotely = computed(() => Boolean(props.item && props.item.version !== baseVersion.value))

const dayOptions = computed(() => props.days.map((d, i) => {
  const { md, weekday } = formatDay(d.date)
  return { label: `第 ${i + 1} 天 · ${md} ${weekday}`, value: d.id }
}))

const api = (path = ''): string => `/api/trips/${props.tripId}/items${path}`

async function onSubmit(event: FormSubmitEvent<ItemInput>) {
  submitting.value = true
  try {
    if (props.editingId) {
      await $fetch<unknown>(api(`/${props.editingId}`), {
        method: 'PATCH',
        body: { ...event.data, version: baseVersion.value },
      })
    }
    else {
      await $fetch<unknown>(api(), { method: 'POST', body: event.data })
    }
    open.value = false
    emit('saved')
  }
  catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' })
    // 衝突時保留表單，讓使用者決定要載入最新內容還是重新編輯
    if ([404, 409].includes(getErrorStatus(error) ?? 0)) emit('conflict')
  }
  finally {
    submitting.value = false
  }
}

async function remove() {
  if (!props.editingId) return
  const ok = await confirm({ title: `刪除「${state.title}」？`, confirmLabel: '刪除', danger: true })
  if (!ok) return
  try {
    await $fetch<unknown>(api(`/${props.editingId}`), { method: 'DELETE' })
    open.value = false
    emit('saved')
  }
  catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' })
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isEdit ? '編輯行程' : '新增行程'">
    <template #body>
      <UAlert
        v-if="deletedRemotely"
        color="error"
        variant="subtle"
        icon="i-lucide-trash-2"
        title="這個行程已被其他成員刪除"
        class="mb-4"
      />
      <UAlert
        v-else-if="updatedRemotely"
        color="warning"
        variant="subtle"
        icon="i-lucide-refresh-cw"
        title="這個行程已被其他成員更新"
        description="你目前看到的是開啟時的內容。"
        :actions="[{ label: '載入最新內容', color: 'neutral', variant: 'outline', onClick: load }]"
        class="mb-4"
      />

      <UForm id="item-form" :schema="itemInputSchema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="分類" name="category">
          <div class="grid grid-cols-3 gap-2">
            <UButton
              v-for="c in ITEM_CATEGORIES"
              :key="c.value"
              :icon="c.icon"
              :color="state.category === c.value ? 'primary' : 'neutral'"
              :variant="state.category === c.value ? 'solid' : 'outline'"
              size="sm"
              block
              @click="state.category = c.value"
            >
              {{ c.label }}
            </UButton>
          </div>
        </UFormField>

        <UFormField label="名稱" name="title" required>
          <UInput v-model="state.title" placeholder="例如：舊市羊肉" class="w-full" />
        </UFormField>

        <UFormField label="日期" name="dayId" required>
          <USelect v-model="state.dayId" :items="dayOptions" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="開始時間" name="startTime">
            <UInput v-model="state.startTime" type="time" class="w-full" />
          </UFormField>
          <UFormField label="結束時間" name="endTime">
            <UInput v-model="state.endTime" type="time" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="地點" name="location" help="填寫後可直接開啟 Google Maps 導航">
          <UInput v-model="state.location" placeholder="例如：岡山區河華路111號" icon="i-lucide-map-pin" class="w-full" />
        </UFormField>

        <UFormField label="備註" name="note">
          <UTextarea v-model="state.note" :rows="3" autoresize placeholder="必吃、要預約、注意事項…" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full items-center gap-2">
        <UButton
          v-if="isEdit && !deletedRemotely"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="remove"
        >
          刪除
        </UButton>
        <div class="flex-1" />
        <UButton color="neutral" variant="ghost" @click="open = false">
          取消
        </UButton>
        <UButton type="submit" form="item-form" :loading="submitting" :disabled="deletedRemotely">
          {{ isEdit ? '儲存' : '新增' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Member {
  id: string
  displayName: string
  avatarUrl: string | null
}

interface Expense {
  id: string
  title: string
  amount: number
  paidBy: string
  splitType: SplitType
  spentAt: string
  note: string | null
  version: number
  splits: { userId: string, amount: number, shares: number | null }[]
}

const props = defineProps<{
  tripId: string
  members: Member[]
  /** 編輯中的支出（父層同步時會傳入最新版本）；新增時為 undefined */
  expense?: Expense
  editingId?: string
  defaultDate: string
}>()

const emit = defineEmits<{ saved: [], conflict: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { user } = useUserSession()
const toast = useToast()
const confirm = useConfirm()
const submitting = ref(false)
const showErrors = ref(false)

interface Row {
  userId: string
  included: boolean
  exact: number | undefined
  shares: number
}

const state = reactive({
  title: '',
  amount: undefined as number | undefined,
  paidBy: '',
  date: '',
  splitType: 'equal' as SplitType,
  note: '',
  rows: [] as Row[],
})
const baseVersion = ref(0)

function localDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load() {
  const e = props.expense
  const splitOf = new Map(e?.splits.map(s => [s.userId, s]))
  Object.assign(state, {
    title: e?.title ?? '',
    amount: e?.amount,
    paidBy: e?.paidBy ?? user.value?.id ?? props.members[0]?.id ?? '',
    date: e ? localDate(e.spentAt) : props.defaultDate,
    splitType: e?.splitType ?? 'equal',
    note: e?.note ?? '',
    rows: props.members.map(m => ({
      userId: m.id,
      included: e ? splitOf.has(m.id) : true,
      exact: splitOf.get(m.id)?.amount,
      shares: splitOf.get(m.id)?.shares ?? 1,
    })),
  })
  baseVersion.value = e?.version ?? 0
  showErrors.value = false
}

watch(open, isOpen => isOpen && load(), { immediate: true })

const isEdit = computed(() => Boolean(props.editingId))
const deletedRemotely = computed(() => isEdit.value && !props.expense)
const updatedRemotely = computed(() => Boolean(props.expense && props.expense.version !== baseVersion.value))

const memberOptions = computed(() => props.members.map(m => ({ label: m.displayName, value: m.id })))
const memberName = (id: string) => props.members.find(m => m.id === id)?.displayName ?? ''

// ── 組出送出的資料，並即時預覽每人應付 ───────────────────

const payload = computed(() => ({
  title: state.title,
  amount: state.amount ?? Number.NaN,
  paidBy: state.paidBy,
  splitType: state.splitType,
  spentAt: state.date ? new Date(`${state.date}T12:00:00`).toISOString() : '',
  note: state.note,
  participants: state.rows
    .filter(r => r.included)
    .map(r => ({
      userId: r.userId,
      value: state.splitType === 'exact' ? r.exact ?? 0 : state.splitType === 'shares' ? r.shares : undefined,
    })),
}))

const validation = computed(() => expenseInputSchema.safeParse(payload.value))
const fieldError = (field: string) => {
  if (!showErrors.value || validation.value.success) return undefined
  return validation.value.error.issues.find(i => i.path[0] === field)?.message
}

const preview = computed(() => {
  const p = payload.value
  if (!Number.isInteger(p.amount) || p.amount <= 0 || !p.participants.length) return new Map<string, number>()
  if (validateSplit(p.amount, p.splitType, p.participants) && p.splitType !== 'exact') return new Map<string, number>()
  return new Map(computeSplits(p.amount, p.splitType, p.paidBy, p.participants).map(s => [s.userId, s.amount]))
})

const exactSum = computed(() => state.rows.filter(r => r.included).reduce((s, r) => s + (r.exact ?? 0), 0))
const exactLeft = computed(() => (state.amount ?? 0) - exactSum.value)

function toggleAll(value: boolean) {
  state.rows.forEach((r) => { r.included = value })
}

// ── 送出 / 刪除 ───────────────────────────────────────

const api = (path = ''): string => `/api/trips/${props.tripId}/expenses${path}`

async function submit() {
  showErrors.value = true
  if (!validation.value.success) return
  submitting.value = true
  try {
    if (props.editingId) {
      await $fetch<unknown>(api(`/${props.editingId}`), {
        method: 'PATCH',
        body: { ...payload.value, version: baseVersion.value },
      })
    }
    else {
      await $fetch<unknown>(api(), { method: 'POST', body: payload.value })
    }
    open.value = false
    emit('saved')
  }
  catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' })
    if ([404, 409].includes(getErrorStatus(error) ?? 0)) emit('conflict')
  }
  finally {
    submitting.value = false
  }
}

async function remove() {
  if (!props.editingId) return
  const ok = await confirm({ title: `刪除「${state.title}」？`, description: '結算會跟著重新計算。', confirmLabel: '刪除', danger: true })
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
  <UModal v-model:open="open" :title="isEdit ? '編輯支出' : '記一筆'">
    <template #body>
      <UAlert
        v-if="deletedRemotely"
        color="error"
        variant="subtle"
        icon="i-lucide-trash-2"
        title="這筆支出已被其他成員刪除"
        class="mb-4"
      />
      <UAlert
        v-else-if="updatedRemotely"
        color="warning"
        variant="subtle"
        icon="i-lucide-refresh-cw"
        title="這筆支出已被其他成員更新"
        description="你目前看到的是開啟時的內容。"
        :actions="[{ label: '載入最新內容', color: 'neutral', variant: 'outline', onClick: load }]"
        class="mb-4"
      />

      <form id="expense-form" class="space-y-4" @submit.prevent="submit">
        <UFormField label="項目" :error="fieldError('title')" required>
          <UInput v-model="state.title" placeholder="例如：午餐、機車租借" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="金額" :error="fieldError('amount')" required>
            <UInput
              v-model.number="state.amount"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              placeholder="0"
              class="w-full"
            >
              <template #leading>
                <span class="text-xs text-muted">NT$</span>
              </template>
            </UInput>
          </UFormField>
          <UFormField label="日期" :error="fieldError('spentAt')" required>
            <UInput v-model="state.date" type="date" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="付款人" :error="fieldError('paidBy')" required>
          <USelect v-model="state.paidBy" :items="memberOptions" class="w-full" />
        </UFormField>

        <UFormField label="分攤方式" :error="fieldError('participants')">
          <div class="mb-3 grid grid-cols-3 gap-2">
            <UButton
              v-for="t in SPLIT_TYPES"
              :key="t.value"
              :color="state.splitType === t.value ? 'primary' : 'neutral'"
              :variant="state.splitType === t.value ? 'solid' : 'outline'"
              size="sm"
              block
              @click="state.splitType = t.value"
            >
              {{ t.label }}
            </UButton>
          </div>

          <div class="mb-1 flex justify-end gap-1">
            <UButton size="xs" color="neutral" variant="ghost" @click="toggleAll(true)">
              全選
            </UButton>
            <UButton size="xs" color="neutral" variant="ghost" @click="toggleAll(false)">
              全不選
            </UButton>
          </div>

          <ul class="divide-y divide-(--ui-border-muted)">
            <li v-for="row in state.rows" :key="row.userId" class="flex items-center gap-3 py-2">
              <UCheckbox v-model="row.included" :label="memberName(row.userId)" class="min-w-0 flex-1" />

              <UInput
                v-if="state.splitType === 'exact' && row.included"
                v-model.number="row.exact"
                type="number"
                inputmode="numeric"
                min="0"
                placeholder="0"
                size="sm"
                class="w-28"
              />
              <UInputNumber
                v-else-if="state.splitType === 'shares' && row.included"
                v-model="row.shares"
                :min="1"
                :max="99"
                size="sm"
                class="w-28"
              />
              <span
                v-if="row.included && state.splitType !== 'exact'"
                class="w-20 text-right text-sm text-muted tabular-nums"
              >
                {{ preview.has(row.userId) ? preview.get(row.userId)!.toLocaleString() : '–' }}
              </span>
            </li>
          </ul>

          <p v-if="state.splitType === 'exact' && state.amount" class="mt-2 text-sm" :class="exactLeft === 0 ? 'text-success' : 'text-muted'">
            <template v-if="exactLeft === 0">
              金額分配完成
            </template>
            <template v-else-if="exactLeft > 0">
              還有 {{ exactLeft.toLocaleString() }} 元未分配
            </template>
            <template v-else>
              超出 {{ (-exactLeft).toLocaleString() }} 元
            </template>
          </p>
          <p v-else-if="state.splitType !== 'exact'" class="mt-2 text-xs text-muted">
            除不盡的零頭由付款人負擔
          </p>
        </UFormField>

        <UFormField label="備註" :error="fieldError('note')">
          <UTextarea v-model="state.note" :rows="2" autoresize class="w-full" />
        </UFormField>
      </form>
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
        <UButton type="submit" form="expense-form" :loading="submitting" :disabled="deletedRemotely">
          {{ isEdit ? '儲存' : '記下' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

interface EditableTrip {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  version: number
}

const props = defineProps<{ trip?: EditableTrip }>()
const emit = defineEmits<{
  saved: [tripId: string]
  conflict: []
}>()
const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const submitting = ref(false)
const state = reactive({ name: '', description: '', startDate: '', endDate: '' })

// 每次開啟時以最新資料重設表單
watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(state, {
    name: props.trip?.name ?? '',
    description: props.trip?.description ?? '',
    startDate: props.trip?.startDate ?? '',
    endDate: props.trip?.endDate ?? '',
  })
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<TripInput>) {
  submitting.value = true
  try {
    if (props.trip) {
      await $fetch(`/api/trips/${props.trip.id}`, {
        method: 'PATCH',
        body: { ...event.data, version: props.trip.version },
      })
      emit('saved', props.trip.id)
    }
    else {
      const { id } = await $fetch('/api/trips', { method: 'POST', body: event.data })
      emit('saved', id)
    }
    open.value = false
  }
  catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' })
    if (getErrorStatus(error) === 409) {
      open.value = false
      emit('conflict')
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="trip ? '編輯旅程' : '建立旅程'">
    <template #body>
      <UForm id="trip-form" :schema="tripInputSchema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="名稱" name="name" required>
          <UInput v-model="state.name" placeholder="例如：東京五日遊" class="w-full" autofocus />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="開始日期" name="startDate">
            <UInput v-model="state.startDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="結束日期" name="endDate">
            <UInput v-model="state.endDate" type="date" :min="state.startDate || undefined" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="說明" name="description">
          <UTextarea v-model="state.description" :rows="3" autoresize class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">
          取消
        </UButton>
        <UButton type="submit" form="trip-form" :loading="submitting">
          {{ trip ? '儲存' : '建立' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

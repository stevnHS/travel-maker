<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}>()

const emit = defineEmits<{ close: [confirmed: boolean] }>()
</script>

<template>
  <UModal :title="title" :description="description" :close="false">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="emit('close', false)">
          取消
        </UButton>
        <UButton :color="danger ? 'error' : 'primary'" @click="emit('close', true)">
          {{ confirmLabel ?? '確定' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

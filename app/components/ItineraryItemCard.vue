<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

interface Item {
  id: string
  title: string
  category: string
  startTime: string | null
  endTime: string | null
  location: string | null
  note: string | null
}

const props = defineProps<{
  item: Item
  isFirst: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  edit: []
  move: [direction: -1 | 1]
  remove: []
}>()

const category = computed(() => getCategory(props.item.category))
const timeRange = computed(() => {
  const start = formatTime(props.item.startTime)
  const end = formatTime(props.item.endTime)
  return start && end ? `${start}–${end}` : start || end
})

const menu = computed<DropdownMenuItem[][]>(() => [
  [
    { label: '編輯', icon: 'i-lucide-pencil', onSelect: () => emit('edit') },
    { label: '往前移', icon: 'i-lucide-arrow-up', disabled: props.isFirst, onSelect: () => emit('move', -1) },
    { label: '往後移', icon: 'i-lucide-arrow-down', disabled: props.isLast, onSelect: () => emit('move', 1) },
  ],
  [{ label: '刪除', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => emit('remove') }],
])
</script>

<template>
  <article
    class="relative cursor-pointer p-4 pr-12 transition
      cream:rounded-[18px] cream:border-l-6 cream:border-(--cat) cream:bg-(--tm-card) cream:shadow-cream
      comic:rounded-2xl comic:border-3 comic:border-(--tm-ink) comic:bg-(--tm-card) comic:shadow-comic"
    :class="item.category === 'transport' && 'cream:bg-[repeating-linear-gradient(135deg,var(--tm-card)_0_10px,var(--ui-bg)_10px_20px)]'"
    :style="{ '--cat': category.color, '--tone': `var(--tm-${category.tone})` }"
    @click="emit('edit')"
  >
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span
        class="inline-flex items-center gap-1
          comic:rounded-full comic:border-2 comic:border-(--tm-ink) comic:bg-(--tone) comic:px-2 comic:py-0.5 comic:font-bold comic:text-(--tm-ink)"
      >
        <UIcon :name="category.icon" class="size-3.5" />{{ category.label }}
      </span>
      <span v-if="timeRange" class="font-medium tabular-nums">· {{ timeRange }}</span>
    </div>

    <h3 class="mt-1 text-base font-bold break-words text-highlighted">
      {{ item.title }}
    </h3>

    <p v-if="item.location" class="mt-0.5 flex items-center gap-1 text-sm text-muted">
      <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
      <span class="truncate">{{ item.location }}</span>
    </p>

    <p v-if="item.note" class="mt-2 text-sm whitespace-pre-line">
      {{ item.note }}
    </p>

    <UButton
      v-if="item.location"
      :to="mapsUrl(item.location)"
      target="_blank"
      external
      size="xs"
      icon="i-lucide-navigation"
      class="mt-3"
      @click.stop
    >
      Google Maps 導航
    </UButton>

    <div class="absolute top-2 right-2" @click.stop>
      <UDropdownMenu :items="menu" :content="{ align: 'end' }">
        <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" aria-label="行程操作" />
      </UDropdownMenu>
    </div>
  </article>
</template>

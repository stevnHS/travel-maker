<script setup lang="ts">
withDefaults(defineProps<{
  icon: string
  title: string
  /** 漫畫主題下圖示方塊的底色 */
  tone?: 'coral' | 'yamabuki' | 'mizu' | 'wakatake'
}>(), { tone: 'yamabuki' })
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <h2 class="flex items-center gap-2 font-bold text-highlighted comic:text-lg comic:font-black">
      <span
        class="inline-flex size-7 items-center justify-center rounded-lg
          cream:bg-(--tm-accent-soft) cream:text-[#f9a825]
          comic:border-[2.5px] comic:border-(--tm-ink) comic:bg-(--tone) comic:shadow-comic-sm"
        :style="{ '--tone': `var(--tm-${tone})` }"
      >
        <UIcon :name="icon" class="size-4" />
      </span>
      {{ title }}
    </h2>
    <slot />
  </div>
</template>

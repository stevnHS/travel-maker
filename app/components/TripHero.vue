<script setup lang="ts">
const props = defineProps<{
  name: string
  startDate: string | null
  endDate: string | null
  memberCount: number
}>()

const { theme } = useTheme()

// 倒數依使用者所在時區的「今天」計算，只在瀏覽器端算，避免與伺服器時區不一致
const today = ref<string>()
onMounted(() => {
  const d = new Date()
  today.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const dayCount = computed(() => {
  if (!props.startDate || !props.endDate) return null
  return (Date.parse(props.endDate) - Date.parse(props.startDate)) / 86_400_000 + 1
})

const countdown = computed(() => {
  if (!props.startDate || !today.value) return { value: '–', unit: '' }
  const diff = (Date.parse(props.startDate) - Date.parse(today.value)) / 86_400_000
  if (diff > 0) return { label: '距離出發', value: String(diff), unit: '天' }
  if (props.endDate && today.value <= props.endDate) return { label: '旅程進行中', value: `第 ${1 - diff}`, unit: '天' }
  return { label: '旅程已結束', value: '✓', unit: '' }
})
</script>

<template>
  <section
    class="relative overflow-hidden px-5 pt-6 pb-5 text-center
      cream:rounded-[24px] cream:bg-(--tm-accent-soft)
      comic:rounded-3xl comic:border-3 comic:border-(--tm-ink) comic:bg-(--tm-card) comic:shadow-comic-lg"
  >
    <!-- 主題插圖 -->
    <svg v-if="theme === 'comic'" viewBox="0 0 240 90" class="mx-auto mb-3 h-20" aria-hidden="true">
      <path d="M0 78c40-8 80-8 120-4s80 6 120-2v18H0z" fill="var(--tm-wakatake)" stroke="var(--tm-ink)" stroke-width="3" />
      <circle cx="58" cy="26" r="11" fill="var(--tm-coral)" stroke="var(--tm-ink)" stroke-width="3" class="animate-float" />
      <path d="m80 76 38-58 38 58z" fill="var(--tm-mizu)" stroke="var(--tm-ink)" stroke-width="3" stroke-linejoin="round" />
      <path d="m106 36 12-18 12 18-6 5-6-4-6 4z" fill="#fff" stroke="var(--tm-ink)" stroke-width="3" stroke-linejoin="round" />
      <rect x="160" y="56" width="44" height="16" rx="4" fill="var(--tm-yamabuki)" stroke="var(--tm-ink)" stroke-width="3" />
      <path d="M168 62h8m6 0h8" stroke="var(--tm-ink)" stroke-width="3" stroke-linecap="round" />
    </svg>
    <AppLogo v-else class="mx-auto mb-2 h-8" />

    <h1 class="text-2xl font-bold break-words text-highlighted comic:font-black">
      {{ name }}
    </h1>
    <p class="mt-1 text-sm text-muted">
      {{ formatDateRange(startDate, endDate) }}<template v-if="dayCount">
        · {{ dayCount }} 天
      </template>
    </p>

    <dl
      class="mt-5 grid grid-cols-3 divide-x
        cream:divide-(--ui-border-accented) cream:rounded-2xl cream:bg-(--tm-card) cream:py-3
        comic:divide-x-2 comic:divide-(--tm-ink) comic:rounded-2xl comic:border-[2.5px] comic:border-(--tm-ink) comic:py-3"
    >
      <div>
        <dt class="text-xs text-muted">
          出發日
        </dt>
        <dd class="mt-1 text-sm font-semibold">
          {{ startDate ? startDate.slice(5).replace('-', '/') : '未定' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          {{ countdown.label ?? '倒數' }}
        </dt>
        <dd class="mt-1 text-sm font-semibold">
          <span class="text-xl font-bold cream:text-[#e65100] comic:font-black">{{ countdown.value }}</span>
          {{ countdown.unit }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          旅伴
        </dt>
        <dd class="mt-1 text-sm font-semibold">
          <span class="text-xl font-bold comic:font-black">{{ memberCount }}</span> 人
        </dd>
      </div>
    </dl>

    <div class="absolute top-3 right-3">
      <slot name="actions" />
    </div>
  </section>
</template>

<style scoped>
@keyframes gentle-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.animate-float {
  animation: gentle-float 4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-float { animation: none; }
}
</style>

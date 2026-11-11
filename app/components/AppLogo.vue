<script setup lang="ts">
const { theme } = useTheme()
</script>

<!-- 依主題切換的小圖示：漫畫風是手繪手札，奶油黃是蝴蝶結 -->
<template>
  <svg v-if="theme === 'comic'" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="13.5" fill="var(--tm-coral)" stroke="var(--tm-ink)" stroke-width="2.5" />
    <path d="M10 11h12v11H10z" fill="#fff" stroke="var(--tm-ink)" stroke-width="2" stroke-linejoin="round" />
    <path d="M16 11v11" stroke="var(--tm-ink)" stroke-width="2" />
  </svg>
  <svg v-else viewBox="0 0 46 30" aria-hidden="true">
    <path d="M23 15 6 5c-3-1-5 1-5 4v12c0 3 2 5 5 4z" fill="#fbc02d" />
    <path d="m23 15 17-10c3-1 5 1 5 4v12c0 3-2 5-5 4z" fill="#fbc02d" />
    <path d="m21 16-6 13 4-1 2 2 2-12zM25 16l6 13-4-1-2 2-2-12z" fill="#f9a825" />
    <circle cx="23" cy="15" r="5" fill="#f9a825" />
  </svg>
</template>

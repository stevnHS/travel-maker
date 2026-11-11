// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  ui: {
    // 兩個主題都是淺色設計，先不支援深色模式
    colorMode: false,
  },
  fonts: {
    // 字型由 @nuxt/fonts 下載並自架；主題用到的字型見 main.css
    families: [
      { name: 'Noto Sans TC', provider: 'google', weights: [400, 500, 700] },
      { name: 'Zen Maru Gothic', provider: 'google', weights: [400, 700, 900] },
      { name: 'Huninn', provider: 'google', weights: [400] },
    ],
  },
  runtimeConfig: {
    // 由 NUXT_DATABASE_URL 覆寫
    databaseUrl: '',
  },
})

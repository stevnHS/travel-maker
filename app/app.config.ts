/*
 * Nuxt UI 元件的主題差異。
 * 色彩由 main.css 的 --ui-* 變數處理，這裡只放「形狀」：邊框、陰影、圓角、字重。
 * cream: / comic: 是 main.css 定義的 custom variant，只在對應主題下生效。
 */

// 漫畫風共用：墨色粗框 + 硬陰影
const comicOutline = 'comic:ring-0 comic:border-(--tm-ink)'

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'stone',
    },

    button: {
      slots: {
        base: 'cream:rounded-full cream:font-semibold comic:rounded-full comic:font-bold comic:transition-all',
      },
      variants: {
        variant: {
          solid: `${comicOutline} comic:border-[2.5px] comic:shadow-comic-sm comic:active:translate-0.5 comic:active:shadow-none`,
          outline: `${comicOutline} comic:border-[2.5px] comic:shadow-comic-sm comic:active:translate-0.5 comic:active:shadow-none`,
          soft: `${comicOutline} comic:border-[2.5px] comic:shadow-comic-sm comic:active:translate-0.5 comic:active:shadow-none`,
          subtle: `${comicOutline} comic:border-[2.5px] comic:shadow-comic-sm comic:active:translate-0.5 comic:active:shadow-none`,
        },
      },
      compoundVariants: [
        // 粉彩底一律配墨色字
        {
          color: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
          variant: ['solid', 'outline', 'soft', 'subtle'],
          class: 'comic:text-(--tm-ink)',
        },
      ],
    },

    card: {
      slots: {
        root: [
          'cream:ring-0 cream:rounded-[18px] cream:bg-(--tm-card) cream:shadow-cream cream:divide-(--ui-border-muted)',
          `${comicOutline} comic:border-3 comic:rounded-3xl comic:bg-(--tm-card) comic:shadow-comic comic:divide-y-3`,
        ].join(' '),
      },
    },

    modal: {
      slots: {
        content: [
          'cream:ring-0 cream:rounded-3xl cream:divide-(--ui-border-muted)',
          `${comicOutline} comic:border-3 comic:rounded-3xl comic:shadow-comic-lg comic:divide-y-3`,
        ].join(' '),
      },
    },

    input: {
      slots: {
        base: 'cream:rounded-xl cream:bg-(--tm-card) comic:rounded-xl comic:bg-(--tm-card) comic:ring-2',
      },
    },

    textarea: {
      slots: {
        base: 'cream:rounded-xl cream:bg-(--tm-card) comic:rounded-xl comic:bg-(--tm-card) comic:ring-2',
      },
    },

    badge: {
      slots: {
        base: 'cream:rounded-full cream:font-bold comic:rounded-full comic:font-bold comic:ring-2 comic:ring-inset comic:ring-(--tm-ink) comic:text-(--tm-ink)',
      },
    },

    dropdownMenu: {
      slots: {
        content: `cream:rounded-xl cream:ring-(--ui-border-accented) ${comicOutline} comic:border-[2.5px] comic:rounded-xl comic:shadow-comic`,
      },
    },

    avatar: {
      slots: {
        root: 'cream:bg-(--tm-accent-soft) comic:bg-(--tm-accent-soft) comic:ring-2 comic:ring-(--tm-ink)',
      },
    },

    toast: {
      slots: {
        root: `cream:rounded-2xl ${comicOutline} comic:border-[2.5px] comic:rounded-2xl comic:shadow-comic`,
      },
    },
  },
})

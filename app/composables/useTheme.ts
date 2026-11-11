export const THEMES = [
  { value: 'cream', label: '奶油黃', icon: 'i-lucide-sun' },
  { value: 'comic', label: '漫畫手繪', icon: 'i-lucide-pen-tool' },
] as const

export type ThemeName = (typeof THEMES)[number]['value']

const DEFAULT_THEME: ThemeName = 'cream'

function isTheme(value: unknown): value is ThemeName {
  return THEMES.some(t => t.value === value)
}

/**
 * 每位使用者自選的主題，存在 cookie，伺服器渲染時即可輸出 data-theme，不會閃爍。
 */
export function useTheme() {
  const cookie = useCookie<string>('theme', {
    default: () => DEFAULT_THEME,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const theme = computed<ThemeName>({
    get: () => (isTheme(cookie.value) ? cookie.value : DEFAULT_THEME),
    set: (value) => { cookie.value = value },
  })

  return { theme, themes: THEMES }
}

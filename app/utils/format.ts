/** 取出 server API 回傳的錯誤訊息（放在 body.message） */
export function getErrorMessage(error: unknown, fallback = '發生錯誤，請稍後再試') {
  const data = (error as { data?: { message?: unknown } } | null)?.data
  return typeof data?.message === 'string' && data.message ? data.message : fallback
}

export function getErrorStatus(error: unknown): number | undefined {
  return (error as { statusCode?: number } | null)?.statusCode
}

/** 2026-12-01、2026-12-05 → 2026/12/01 – 12/05 */
export function formatDateRange(start: string | null, end: string | null) {
  const fmt = (d: string, withYear: boolean) => {
    const [y, m, day] = d.split('-')
    return withYear ? `${y}/${m}/${day}` : `${m}/${day}`
  }
  if (!start && !end) return '日期未定'
  if (!start || !end) return fmt((start ?? end)!, true)
  if (start === end) return fmt(start, true)
  return `${fmt(start, true)} – ${fmt(end, start.slice(0, 4) !== end.slice(0, 4))}`
}

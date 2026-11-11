import { z } from 'zod'

export const ITEM_CATEGORIES = [
  { value: 'spot', label: '景點', icon: 'i-lucide-camera', color: '#ffd54f', tone: 'yamabuki' },
  { value: 'food', label: '美食', icon: 'i-lucide-utensils', color: '#ffb74d', tone: 'coral' },
  { value: 'transport', label: '交通', icon: 'i-lucide-tram-front', color: '#90caf9', tone: 'mizu' },
  { value: 'stay', label: '住宿', icon: 'i-lucide-bed-double', color: '#b39ddb', tone: 'mizu' },
  { value: 'shopping', label: '購物', icon: 'i-lucide-shopping-bag', color: '#f48fb1', tone: 'coral' },
  { value: 'other', label: '其他', icon: 'i-lucide-sparkles', color: '#a5d6a7', tone: 'wakatake' },
] as const

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]['value']

export function getCategory(value: string) {
  return ITEM_CATEGORIES.find(c => c.value === value) ?? ITEM_CATEGORIES[0]
}

const categoryValues = ITEM_CATEGORIES.map(c => c.value) as [ItemCategory, ...ItemCategory[]]

// <input type="time"> 送出 HH:MM，資料庫回傳 HH:MM:SS，兩者都接受
const optionalTime = z.preprocess(
  v => (v === '' || v === undefined ? null : v),
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, '時間格式錯誤').nullable(),
)

const optionalText = (max: number) => z.preprocess(
  v => (typeof v === 'string' ? v.trim() || null : v ?? null),
  z.string().max(max, `最多 ${max} 字`).nullable(),
)

export const itemInputSchema = z.object({
  dayId: z.uuid({ error: '請選擇日期' }),
  title: z.string().trim().min(1, '請輸入名稱').max(100, '最多 100 字'),
  category: z.enum(categoryValues),
  startTime: optionalTime,
  endTime: optionalTime,
  location: optionalText(200),
  note: optionalText(2000),
}).refine(d => !d.startTime || !d.endTime || d.startTime <= d.endTime, {
  path: ['endTime'],
  message: '結束時間不可早於開始時間',
})

export const itemUpdateSchema = itemInputSchema.and(z.object({ version: z.number().int().positive() }))

export const dayUpdateSchema = z.object({
  title: optionalText(50),
  version: z.number().int().positive(),
})

export const reorderSchema = z.object({
  itemIds: z.array(z.uuid()).max(200),
})

export type ItemInput = z.output<typeof itemInputSchema>

/** 12:30:00 → 12:30 */
export function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : ''
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 2026-12-25 → { md: '12/25', weekday: '週五' }（以 UTC 計算，避免時區位移） */
export function formatDay(date: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return { md: `${m}/${d}`, weekday: `週${weekday}` }
}

/** 列出起訖日期之間（含）的每一天 */
export function eachDate(start: string, end: string) {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

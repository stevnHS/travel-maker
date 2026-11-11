import { z } from 'zod'

export const MAX_TRIP_DAYS = 60

// <input type="date"> 清空時會送出空字串，統一轉成 null
const optionalDate = z.preprocess(
  v => (v === '' || v === undefined ? null : v),
  z.iso.date({ error: '日期格式錯誤' }).nullable(),
)

const optionalText = (max: number) => z.preprocess(
  v => (typeof v === 'string' ? v.trim() || null : v ?? null),
  z.string().max(max, `最多 ${max} 字`).nullable(),
)

function daysBetween(start: string, end: string) {
  return (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1
}

export const tripInputSchema = z.object({
  name: z.string().trim().min(1, '請輸入旅程名稱').max(100, '最多 100 字'),
  description: optionalText(1000),
  startDate: optionalDate,
  endDate: optionalDate,
}).superRefine((d, ctx) => {
  if (!d.startDate || !d.endDate) return
  if (d.startDate > d.endDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: '結束日期不可早於開始日期' })
  }
  else if (daysBetween(d.startDate, d.endDate) > MAX_TRIP_DAYS) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: `旅程最長 ${MAX_TRIP_DAYS} 天` })
  }
})

export const tripUpdateSchema = tripInputSchema.and(z.object({
  version: z.number().int().positive(),
}))

export type TripInput = z.output<typeof tripInputSchema>

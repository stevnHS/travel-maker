import { and, asc, eq, exists, notInArray, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'

/** 旅程日期區間內的每一天；未設定完整日期則為空 */
export function tripDates(startDate: string | null, endDate: string | null) {
  return startDate && endDate ? eachDate(startDate, endDate) : []
}

/** 落在新日期區間之外、且仍有行程項目的天（這些天不能被刪掉） */
export async function findBlockedDays(tripId: string, dates: string[]) {
  const db = useDb()
  const { tripDays, itineraryItems } = schema
  const rows = await db
    .select({ date: tripDays.date })
    .from(tripDays)
    .where(and(
      eq(tripDays.tripId, tripId),
      dates.length ? notInArray(tripDays.date, dates) : undefined,
      exists(db.select({ one: sql`1` }).from(itineraryItems).where(eq(itineraryItems.dayId, tripDays.id))),
    ))
    .orderBy(asc(tripDays.date))
  return rows.map(r => r.date)
}

/** 讓 trip_days 與日期區間一致：補上缺少的天、刪除區間外的空白天 */
export async function syncTripDays(tripId: string, dates: string[]) {
  const db = useDb()
  const { tripDays, itineraryItems } = schema

  const removeEmpty = db.delete(tripDays).where(and(
    eq(tripDays.tripId, tripId),
    dates.length ? notInArray(tripDays.date, dates) : undefined,
    sql`not exists (select 1 from ${itineraryItems} where ${itineraryItems.dayId} = ${tripDays.id})`,
  ))

  if (!dates.length) {
    await removeEmpty
    return
  }
  await db.batch([
    removeEmpty,
    db.insert(tripDays).values(dates.map(date => ({ tripId, date }))).onConflictDoNothing(),
  ])
}

export function blockedDaysError(dates: string[]) {
  const list = dates.map(d => formatDay(d).md).join('、')
  return createError({ statusCode: 409, message: `${list} 還有行程項目，請先移除或移到其他天，再修改旅程日期` })
}

const dayParams = z.object({ dayId: z.uuid() })
const itemParams = z.object({ itemId: z.uuid() })

/** 確認網址中的 dayId 屬於此旅程 */
export async function requireDay(event: H3Event, tripId: string) {
  const { dayId } = await getValidatedRouterParams(event, dayParams.parse)
  return assertDayInTrip(tripId, dayId)
}

export async function assertDayInTrip(tripId: string, dayId: string) {
  const { tripDays } = schema
  const [day] = await useDb()
    .select({ id: tripDays.id, version: tripDays.version })
    .from(tripDays)
    .where(and(eq(tripDays.id, dayId), eq(tripDays.tripId, tripId)))
    .limit(1)
  if (!day) throw createError({ statusCode: 404, message: '找不到這一天，旅程日期可能已被修改' })
  return day
}

/** 確認網址中的 itemId 屬於此旅程 */
export async function requireItem(event: H3Event, tripId: string) {
  const { itemId } = await getValidatedRouterParams(event, itemParams.parse)
  const { itineraryItems } = schema
  const [item] = await useDb()
    .select({ id: itineraryItems.id, dayId: itineraryItems.dayId })
    .from(itineraryItems)
    .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripId, tripId)))
    .limit(1)
  if (!item) throw createError({ statusCode: 404, message: '找不到此行程，可能已被其他成員刪除' })
  return item
}

/** 新項目排在當天最後 */
export function nextSortOrder(dayId: string) {
  const { itineraryItems } = schema
  return sql<number>`(select coalesce(max(${itineraryItems.sortOrder}), -1) + 1 from ${itineraryItems} where ${itineraryItems.dayId} = ${dayId})`
}

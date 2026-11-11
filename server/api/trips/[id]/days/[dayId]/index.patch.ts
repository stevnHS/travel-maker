import { and, eq, sql } from 'drizzle-orm'

// 修改當天標題（例如「高雄・岡山」）
export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event)
  const day = await requireDay(event, tripId)
  const { title, version } = await readValidatedBody(event, dayUpdateSchema.parse)
  const { tripDays } = schema

  const [updated] = await useDb()
    .update(tripDays)
    .set({ title, version: sql`${tripDays.version} + 1` })
    .where(and(eq(tripDays.id, day.id), eq(tripDays.version, version)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 409, message: '這一天的標題已被其他成員更新' })
  }
  return updated
})

import { and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event)
  const { version, ...input } = await readValidatedBody(event, tripUpdateSchema.parse)
  const db = useDb()
  const { trips } = schema

  // 樂觀鎖：版本相符才更新
  const [updated] = await db
    .update(trips)
    .set({ ...input, version: sql`${trips.version} + 1` })
    .where(and(eq(trips.id, tripId), eq(trips.version, version)))
    .returning()

  if (!updated) {
    const [current] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1)
    throw createError({
      statusCode: 409,
      message: '旅程已被其他成員更新，請確認最新內容後再試',
      data: { current },
    })
  }
  return updated
})

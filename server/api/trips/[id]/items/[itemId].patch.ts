import { and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user, tripId } = await requireTripMember(event)
  const item = await requireItem(event, tripId)
  const { version, ...input } = await readValidatedBody(event, itemUpdateSchema.parse)
  const db = useDb()
  const { itineraryItems } = schema

  // 換到其他天時排到該天最後
  const movingDay = input.dayId !== item.dayId
  if (movingDay) await assertDayInTrip(tripId, input.dayId)

  const [updated] = await db
    .update(itineraryItems)
    .set({
      ...input,
      ...(movingDay ? { sortOrder: nextSortOrder(input.dayId) } : {}),
      updatedBy: user.id,
      version: sql`${itineraryItems.version} + 1`,
    })
    .where(and(eq(itineraryItems.id, item.id), eq(itineraryItems.version, version)))
    .returning()

  if (!updated) {
    const [current] = await db.select().from(itineraryItems).where(eq(itineraryItems.id, item.id)).limit(1)
    throw createError({
      statusCode: 409,
      message: '這個行程已被其他成員更新，請確認最新內容後再儲存',
      data: { current },
    })
  }
  return updated
})

import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event, { role: 'owner' })
  const { trips } = schema

  // 天、行程項目、支出與分攤皆以 ON DELETE CASCADE 一併刪除
  await useDb().delete(trips).where(eq(trips.id, tripId))
  return sendNoContent(event)
})

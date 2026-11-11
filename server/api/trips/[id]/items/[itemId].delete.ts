import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event)
  const item = await requireItem(event, tripId)
  const { itineraryItems } = schema

  await useDb().delete(itineraryItems).where(eq(itineraryItems.id, item.id))
  return sendNoContent(event)
})

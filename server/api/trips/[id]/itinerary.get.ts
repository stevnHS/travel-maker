import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event)
  const { tripDays, itineraryItems } = schema

  const days = await useDb().query.tripDays.findMany({
    where: eq(tripDays.tripId, tripId),
    orderBy: asc(tripDays.date),
    with: {
      items: {
        orderBy: [asc(itineraryItems.sortOrder), asc(itineraryItems.createdAt)],
      },
    },
  })
  return { days }
})

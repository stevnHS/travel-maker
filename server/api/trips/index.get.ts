import { desc, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { trips, tripMembers } = schema

  return useDb()
    .select({
      id: trips.id,
      name: trips.name,
      description: trips.description,
      startDate: trips.startDate,
      endDate: trips.endDate,
      role: tripMembers.role,
      memberCount: sql<number>`(select count(*)::int from ${tripMembers} m where m.trip_id = ${trips.id})`,
    })
    .from(tripMembers)
    .innerJoin(trips, eq(trips.id, tripMembers.tripId))
    .where(eq(tripMembers.userId, user.id))
    .orderBy(sql`${trips.startDate} desc nulls first`, desc(trips.createdAt))
})

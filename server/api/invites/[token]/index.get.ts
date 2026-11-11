import { and, eq, sql } from 'drizzle-orm'

// 不需登入：僅回傳加入前需要的最少資訊
export default defineEventHandler(async (event) => {
  const { id: tripId } = await findTripByInvite(event)
  const session = await getUserSession(event)
  const db = useDb()
  const { trips, tripMembers, users } = schema

  const [trip] = await db
    .select({
      id: trips.id,
      name: trips.name,
      startDate: trips.startDate,
      endDate: trips.endDate,
      ownerName: users.displayName,
      memberCount: sql<number>`(select count(*)::int from ${tripMembers} m where m.trip_id = ${trips.id})`,
    })
    .from(trips)
    .innerJoin(users, eq(users.id, trips.ownerId))
    .where(eq(trips.id, tripId))
    .limit(1)

  let isMember = false
  if (session.user) {
    const [member] = await db
      .select({ role: tripMembers.role })
      .from(tripMembers)
      .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, session.user.id)))
      .limit(1)
    isMember = Boolean(member)
  }

  return { trip: trip!, isMember }
})

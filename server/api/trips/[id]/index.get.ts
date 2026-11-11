import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { tripId, role } = await requireTripMember(event)
  const db = useDb()
  const { trips, tripMembers, users } = schema

  const [[trip], members] = await Promise.all([
    db.select().from(trips).where(eq(trips.id, tripId)).limit(1),
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: tripMembers.role,
        joinedAt: tripMembers.joinedAt,
      })
      .from(tripMembers)
      .innerJoin(users, eq(users.id, tripMembers.userId))
      .where(eq(tripMembers.tripId, tripId))
      .orderBy(asc(tripMembers.joinedAt)),
  ])

  if (!trip) {
    throw createError({ statusCode: 404, message: '找不到旅程' })
  }
  return { trip, members, myRole: role }
})

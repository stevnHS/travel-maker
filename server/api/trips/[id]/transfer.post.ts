import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({ userId: z.uuid() })

export default defineEventHandler(async (event) => {
  const { user, tripId } = await requireTripMember(event, { role: 'owner' })
  const { userId: targetId } = await readValidatedBody(event, bodySchema.parse)
  const db = useDb()
  const { trips, tripMembers } = schema

  if (targetId === user.id) {
    throw createError({ statusCode: 400, message: '你已經是擁有者' })
  }

  const [target] = await db
    .select({ userId: tripMembers.userId })
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, targetId)))
    .limit(1)
  if (!target) {
    throw createError({ statusCode: 404, message: '找不到此成員' })
  }

  const memberOf = (userId: string) => and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId))
  await db.batch([
    db.update(trips).set({ ownerId: targetId, version: sql`${trips.version} + 1` }).where(eq(trips.id, tripId)),
    db.update(tripMembers).set({ role: 'editor' }).where(memberOf(user.id)),
    db.update(tripMembers).set({ role: 'owner' }).where(memberOf(targetId)),
  ])
  return { ok: true }
})

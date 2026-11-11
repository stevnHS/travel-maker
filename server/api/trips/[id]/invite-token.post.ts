import { eq } from 'drizzle-orm'

// 重設後舊連結立即失效；已加入的成員不受影響
export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event, { role: 'owner' })
  const { trips } = schema

  const inviteToken = generateInviteToken()
  await useDb().update(trips).set({ inviteToken }).where(eq(trips.id, tripId))
  return { inviteToken }
})

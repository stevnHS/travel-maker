import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'

const inviteParams = z.object({ token: z.string().min(1).max(64) })

/** 依網址中的邀請 token 找出旅程，找不到回 404 */
export async function findTripByInvite(event: H3Event) {
  const { token } = await getValidatedRouterParams(event, inviteParams.parse)
  const { trips } = schema

  const [trip] = await useDb()
    .select({ id: trips.id })
    .from(trips)
    .where(eq(trips.inviteToken, token))
    .limit(1)

  if (!trip) {
    throw createError({ statusCode: 404, message: '邀請連結無效或已被重設' })
  }
  return trip
}

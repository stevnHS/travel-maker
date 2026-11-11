import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.uuid(), userId: z.uuid() })

// owner 移除他人，或成員自行退出
export default defineEventHandler(async (event) => {
  const { user, tripId, role } = await requireTripMember(event)
  const { userId: targetId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = useDb()
  const { tripMembers } = schema
  const isSelf = targetId === user.id

  if (!isSelf && role !== 'owner') {
    throw createError({ statusCode: 403, message: '只有旅程擁有者可以移除成員' })
  }

  const where = and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, targetId))
  const [target] = await db.select({ role: tripMembers.role }).from(tripMembers).where(where).limit(1)
  if (!target) {
    throw createError({ statusCode: 404, message: '找不到此成員' })
  }
  if (target.role === 'owner') {
    throw createError({
      statusCode: 400,
      message: isSelf ? '擁有者需先將旅程轉移給其他成員才能退出' : '無法移除旅程擁有者',
    })
  }
  if (await hasExpenseRecords(tripId, targetId)) {
    throw createError({
      statusCode: 409,
      message: isSelf ? '你在此旅程有記帳紀錄，無法退出' : '此成員有記帳紀錄，無法移除',
    })
  }

  await db.delete(tripMembers).where(where)
  return sendNoContent(event)
})

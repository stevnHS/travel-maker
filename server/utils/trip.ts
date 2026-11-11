import { and, eq, exists, or } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'

const tripParams = z.object({ id: z.uuid() })

export type TripRole = (typeof schema.tripRole.enumValues)[number]

/**
 * 確認目前使用者為旅程成員，並回傳其角色。
 * 非成員一律回 404，不透露旅程是否存在。
 */
export async function requireTripMember(event: H3Event, options: { role?: TripRole } = {}) {
  const { user } = await requireUserSession(event)
  const { id: tripId } = await getValidatedRouterParams(event, tripParams.parse)
  const { tripMembers } = schema

  const [member] = await useDb()
    .select({ role: tripMembers.role })
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, message: '找不到旅程' })
  }
  if (options.role === 'owner' && member.role !== 'owner') {
    throw createError({ statusCode: 403, message: '只有旅程擁有者可以執行此操作' })
  }
  return { user, tripId, role: member.role }
}

export function generateInviteToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  // 18 bytes → 24 字元 base64url（無 padding）
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_')
}

/** 使用者在此旅程是否有記帳紀錄（付款人或分攤者） */
export async function hasExpenseRecords(tripId: string, userId: string) {
  const db = useDb()
  const { expenses, expenseSplits } = schema
  const [row] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(
      eq(expenses.tripId, tripId),
      or(
        eq(expenses.paidBy, userId),
        exists(
          db.select({ one: expenseSplits.expenseId })
            .from(expenseSplits)
            .where(and(eq(expenseSplits.expenseId, expenses.id), eq(expenseSplits.userId, userId))),
        ),
      ),
    ))
    .limit(1)
  return Boolean(row)
}

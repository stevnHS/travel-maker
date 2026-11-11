import { and, eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'

const expenseParams = z.object({ expenseId: z.uuid() })

export async function requireExpense(event: H3Event, tripId: string) {
  const { expenseId } = await getValidatedRouterParams(event, expenseParams.parse)
  const { expenses } = schema
  const [expense] = await useDb()
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)))
    .limit(1)
  if (!expense) throw createError({ statusCode: 404, message: '找不到這筆支出，可能已被其他成員刪除' })
  return expense
}

/** 付款人與分攤者都必須是旅程成員 */
export async function assertExpenseMembers(tripId: string, input: ExpenseInput) {
  const userIds = [...new Set([input.paidBy, ...input.participants.map(p => p.userId)])]
  const { tripMembers } = schema
  const rows = await useDb()
    .select({ userId: tripMembers.userId })
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), inArray(tripMembers.userId, userIds)))
  if (rows.length !== userIds.length) {
    throw createError({ statusCode: 400, message: '付款人或分攤者不是旅程成員' })
  }
}

/** 將表單輸入轉成 expenses 欄位與 expense_splits 列 */
export function toExpenseRows(input: ExpenseInput) {
  const { participants, spentAt, ...fields } = input
  const splits = computeSplits(input.amount, input.splitType, input.paidBy, participants)
  return { fields: { ...fields, spentAt: new Date(spentAt) }, splits }
}

/** Postgres division_by_zero，用來在 batch 中讓版本檢查失敗時整批回滾 */
export function isDivisionByZero(error: unknown): boolean {
  for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === '22012') return true
  }
  return false
}

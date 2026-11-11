import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event)
  const expense = await requireExpense(event, tripId)
  const { expenses } = schema

  // expense_splits 以 ON DELETE CASCADE 一併刪除
  await useDb().delete(expenses).where(eq(expenses.id, expense.id))
  return sendNoContent(event)
})

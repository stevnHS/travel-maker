import { desc, eq } from 'drizzle-orm'

// 支出列表與結算結果一起回傳，前端只需一次請求
export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event)
  const db = useDb()
  const { expenses, tripMembers } = schema

  const [list, members] = await Promise.all([
    db.query.expenses.findMany({
      where: eq(expenses.tripId, tripId),
      orderBy: [desc(expenses.spentAt), desc(expenses.createdAt)],
      with: { splits: true },
    }),
    db.select({ userId: tripMembers.userId }).from(tripMembers).where(eq(tripMembers.tripId, tripId)),
  ])

  const { balances, transfers } = computeSettlement(members.map(m => m.userId), list)
  const total = list.reduce((sum, e) => sum + e.amount, 0)
  return { expenses: list, balances, transfers, total }
})

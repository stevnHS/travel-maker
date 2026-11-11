import { and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { tripId } = await requireTripMember(event)
  const expense = await requireExpense(event, tripId)
  const { version, ...input } = await readValidatedBody(event, expenseUpdateSchema.parse)
  await assertExpenseMembers(tripId, input)
  const db = useDb()
  const { expenses, expenseSplits } = schema
  const { fields, splits } = toExpenseRows(input)

  // 支出與分攤要一起更新。neon-http 只有非互動式 batch，
  // 所以第一句先鎖住該列並檢查版本：版本不符時 1 / 0 讓整批回滾。
  const versionGuard = db
    .select({ ok: sql`1 / count(*)` })
    .from(sql`(select 1 from ${expenses} where ${expenses.id} = ${expense.id} and ${expenses.version} = ${version} for update) as guard`)

  try {
    await db.batch([
      versionGuard,
      db.update(expenses).set({ ...fields, version: sql`${expenses.version} + 1` }).where(eq(expenses.id, expense.id)),
      db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expense.id)),
      db.insert(expenseSplits).values(splits.map(s => ({ expenseId: expense.id, ...s }))),
    ])
  }
  catch (error) {
    if (isDivisionByZero(error)) {
      throw createError({ statusCode: 409, message: '這筆支出已被其他成員更新，請確認最新內容後再儲存' })
    }
    throw error
  }

  const [updated] = await db.select().from(expenses).where(and(eq(expenses.id, expense.id))).limit(1)
  return updated
})

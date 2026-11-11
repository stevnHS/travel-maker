export default defineEventHandler(async (event) => {
  const { user, tripId } = await requireTripMember(event)
  const input = await readValidatedBody(event, expenseInputSchema.parse)
  await assertExpenseMembers(tripId, input)
  const db = useDb()
  const { expenses, expenseSplits } = schema

  const id = crypto.randomUUID()
  const { fields, splits } = toExpenseRows(input)
  await db.batch([
    db.insert(expenses).values({ id, tripId, ...fields, createdBy: user.id }),
    db.insert(expenseSplits).values(splits.map(s => ({ expenseId: id, ...s }))),
  ])

  setResponseStatus(event, 201)
  return { id }
})

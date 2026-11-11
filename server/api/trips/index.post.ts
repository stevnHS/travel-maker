export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const input = await readValidatedBody(event, tripInputSchema.parse)
  const db = useDb()
  const { trips, tripMembers, tripDays } = schema

  // neon-http 不支援互動式 transaction，以 batch 確保旅程、擁有者與每日行程一起寫入
  const id = crypto.randomUUID()
  const dates = tripDates(input.startDate, input.endDate)
  await db.batch([
    db.insert(trips).values({ id, ...input, ownerId: user.id, inviteToken: generateInviteToken() }),
    db.insert(tripMembers).values({ tripId: id, userId: user.id, role: 'owner' }),
    ...(dates.length ? [db.insert(tripDays).values(dates.map(date => ({ tripId: id, date })))] : []),
  ])

  setResponseStatus(event, 201)
  return { id }
})

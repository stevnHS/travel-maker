export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const input = await readValidatedBody(event, tripInputSchema.parse)
  const db = useDb()
  const { trips, tripMembers } = schema

  // neon-http 不支援互動式 transaction，以 batch 確保旅程與擁有者一起寫入
  const id = crypto.randomUUID()
  await db.batch([
    db.insert(trips).values({ id, ...input, ownerId: user.id, inviteToken: generateInviteToken() }),
    db.insert(tripMembers).values({ tripId: id, userId: user.id, role: 'owner' }),
  ])

  setResponseStatus(event, 201)
  return { id }
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { id: tripId } = await findTripByInvite(event)
  const { tripMembers } = schema

  // 已是成員則維持原角色
  await useDb()
    .insert(tripMembers)
    .values({ tripId, userId: user.id, role: 'editor' })
    .onConflictDoNothing()

  return { tripId }
})

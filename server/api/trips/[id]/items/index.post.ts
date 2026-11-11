export default defineEventHandler(async (event) => {
  const { user, tripId } = await requireTripMember(event)
  const input = await readValidatedBody(event, itemInputSchema.parse)
  await assertDayInTrip(tripId, input.dayId)
  const { itineraryItems } = schema

  const [item] = await useDb()
    .insert(itineraryItems)
    .values({
      ...input,
      tripId,
      sortOrder: nextSortOrder(input.dayId),
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning()

  setResponseStatus(event, 201)
  return item
})

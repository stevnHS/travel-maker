import { and, eq } from 'drizzle-orm'

/**
 * 調整當天項目順序。itemIds 必須剛好是當天目前的所有項目，
 * 若有人同時新增或刪除了項目就回 409，請前端重新整理後再排。
 */
export default defineEventHandler(async (event) => {
  const { user, tripId } = await requireTripMember(event)
  const day = await requireDay(event, tripId)
  const { itemIds } = await readValidatedBody(event, reorderSchema.parse)
  const db = useDb()
  const { itineraryItems } = schema

  const current = await db
    .select({ id: itineraryItems.id, sortOrder: itineraryItems.sortOrder })
    .from(itineraryItems)
    .where(eq(itineraryItems.dayId, day.id))

  const currentIds = new Set(current.map(i => i.id))
  if (itemIds.length !== currentIds.size || !itemIds.every(id => currentIds.has(id))) {
    throw createError({ statusCode: 409, message: '當天行程已被其他成員變更，請重新整理後再調整順序' })
  }

  // 只更新位置有變的項目；排序不算內容修改，不遞增 version
  const orderOf = new Map(current.map(i => [i.id, i.sortOrder]))
  const updates = itemIds
    .map((id, index) => ({ id, index }))
    .filter(({ id, index }) => orderOf.get(id) !== index)
    .map(({ id, index }) => db
      .update(itineraryItems)
      .set({ sortOrder: index, updatedBy: user.id })
      .where(and(eq(itineraryItems.id, id), eq(itineraryItems.dayId, day.id))))

  if (updates.length) {
    await db.batch(updates as [typeof updates[number], ...typeof updates])
  }
  return sendNoContent(event)
})

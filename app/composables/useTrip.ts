/**
 * 目前路由上的旅程資料（旅程資訊、成員、我的角色）。
 * 以固定 key 呼叫 useFetch，父頁與各分頁共用同一份資料，不會重複請求。
 */
export function useTrip() {
  const route = useRoute()
  const tripId = route.params.id as string

  const fetched = useFetch(`/api/trips/${tripId}`, { key: `trip:${tripId}` })
  const { data } = fetched

  const trip = computed(() => data.value?.trip)
  const members = computed(() => data.value?.members ?? [])
  const isOwner = computed(() => data.value?.myRole === 'owner')

  const memberById = computed(() => new Map(members.value.map(m => [m.id, m])))
  const memberName = (userId: string) => memberById.value.get(userId)?.displayName ?? '已離開的成員'

  return Object.assign(fetched, { tripId, trip, members, isOwner, memberById, memberName })
}

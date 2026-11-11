import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  name: z.string().trim().min(1).max(30).default('測試使用者'),
  redirect: z.string().regex(/^\/(?![/\\])/).default('/'),
})

/**
 * 僅限開發環境：以假身分登入，方便在本機測試多人情境（不經 LINE）。
 * 例：/auth/dev?name=小明  → 以 provider = 'dev' 建立或沿用使用者「小明」
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }

  const { name, redirect } = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()
  const { users, userIdentities } = schema

  const [identity] = await db
    .select({ userId: userIdentities.userId })
    .from(userIdentities)
    .where(and(eq(userIdentities.provider, 'dev'), eq(userIdentities.providerUserId, name)))
    .limit(1)

  let userId = identity?.userId
  if (!userId) {
    userId = crypto.randomUUID()
    await db.batch([
      db.insert(users).values({ id: userId, displayName: name }),
      db.insert(userIdentities).values({ userId, provider: 'dev', providerUserId: name }),
    ])
  }

  await setUserSession(event, {
    user: { id: userId, displayName: name, avatarUrl: null },
    loggedInAt: Date.now(),
  })
  return sendRedirect(event, redirect)
})

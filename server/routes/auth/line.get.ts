import { and, eq } from 'drizzle-orm'
import { sendRedirect } from 'nuxt/server'

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export default defineOAuthLineEventHandler({
  async onSuccess(event, { user: profile }: { user: LineProfile }) {
    const db = useDb()
    const { users, userIdentities } = schema

    const [identity] = await db
      .select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(and(eq(userIdentities.provider, 'line'), eq(userIdentities.providerUserId, profile.userId)))
      .limit(1)

    let userId: string
    if (identity) {
      userId = identity.userId
      await db
        .update(users)
        .set({ displayName: profile.displayName, avatarUrl: profile.pictureUrl ?? null })
        .where(eq(users.id, userId))
    }
    else {
      // neon-http 不支援互動式 transaction，改用 batch 確保兩筆一起寫入
      userId = crypto.randomUUID()
      await db.batch([
        db.insert(users).values({ id: userId, displayName: profile.displayName, avatarUrl: profile.pictureUrl ?? null }),
        db.insert(userIdentities).values({ userId, provider: 'line', providerUserId: profile.userId }),
      ])
    }

    await setUserSession(event, {
      user: { id: userId, displayName: profile.displayName, avatarUrl: profile.pictureUrl ?? null },
      loggedInAt: Date.now(),
    })
    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('LINE OAuth error:', error)
    return sendRedirect(event, '/?error=login_failed')
  },
})

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'

let _db: ReturnType<typeof createDb> | undefined

function createDb(url: string) {
  return drizzle(neon(url), { schema, casing: 'snake_case' })
}

export function useDb() {
  if (!_db) {
    const { databaseUrl } = useRuntimeConfig()
    if (!databaseUrl) {
      throw createError({ statusCode: 500, statusMessage: 'NUXT_DATABASE_URL is not set' })
    }
    _db = createDb(databaseUrl)
  }
  return _db
}

export { schema }

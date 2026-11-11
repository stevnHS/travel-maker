import { relations, sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

// 金額一律以整數（元）儲存，不使用浮點數；目前不支援多幣別。

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}

// 樂觀鎖：更新時以 WHERE version = ? 比對，成功後 +1
const version = integer().notNull().default(1)

export const tripRole = pgEnum('trip_role', ['owner', 'editor'])
export const splitType = pgEnum('split_type', ['equal', 'exact', 'shares'])

// ── 使用者與身分 ─────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  displayName: text().notNull(),
  avatarUrl: text(),
  ...timestamps,
})

// 與登入方式解耦：目前只有 LINE，日後可加入其他 provider
export const userIdentities = pgTable('user_identities', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text().notNull(),
  providerUserId: text().notNull(),
  ...timestamps,
}, t => [
  unique().on(t.provider, t.providerUserId),
  index().on(t.userId),
])

// ── 旅程與成員 ───────────────────────────────────────────

export const trips = pgTable('trips', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text(),
  startDate: date(),
  endDate: date(),
  ownerId: uuid().notNull().references(() => users.id),
  inviteToken: text().notNull().unique(),
  version,
  ...timestamps,
})

export const tripMembers = pgTable('trip_members', {
  tripId: uuid().notNull().references(() => trips.id, { onDelete: 'cascade' }),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: tripRole().notNull().default('editor'),
  joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.tripId, t.userId] }),
  index().on(t.userId),
])

// ── 行程：旅程 → 天 → 行程項目 ───────────────────────────

export const tripDays = pgTable('trip_days', {
  id: uuid().primaryKey().defaultRandom(),
  tripId: uuid().notNull().references(() => trips.id, { onDelete: 'cascade' }),
  date: date().notNull(),
  title: text(),
  version,
  ...timestamps,
}, t => [
  unique().on(t.tripId, t.date),
])

export const itineraryItems = pgTable('itinerary_items', {
  id: uuid().primaryKey().defaultRandom(),
  dayId: uuid().notNull().references(() => tripDays.id, { onDelete: 'cascade' }),
  // 冗餘欄位，方便權限檢查與依旅程查詢變更
  tripId: uuid().notNull().references(() => trips.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  startTime: time(),
  endTime: time(),
  location: text(),
  note: text(),
  sortOrder: integer().notNull().default(0),
  createdBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  version,
  ...timestamps,
}, t => [
  index().on(t.dayId, t.sortOrder),
  index().on(t.tripId, t.updatedAt),
])

// ── 記帳 ─────────────────────────────────────────────────

export const expenses = pgTable('expenses', {
  id: uuid().primaryKey().defaultRandom(),
  tripId: uuid().notNull().references(() => trips.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  amount: integer().notNull(),
  paidBy: uuid().notNull().references(() => users.id),
  splitType: splitType().notNull().default('equal'),
  spentAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  note: text(),
  createdBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  version,
  ...timestamps,
}, t => [
  check('expenses_amount_positive', sql`${t.amount} > 0`),
  index().on(t.tripId, t.spentAt),
  index().on(t.tripId, t.updatedAt),
])

// 每位分攤者實際應付金額（已換算完成，各列加總 = expenses.amount）
export const expenseSplits = pgTable('expense_splits', {
  expenseId: uuid().notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  userId: uuid().notNull().references(() => users.id),
  amount: integer().notNull(),
  // split_type = 'shares' 時記錄份數，其餘為 null
  shares: integer(),
}, t => [
  primaryKey({ columns: [t.expenseId, t.userId] }),
  check('expense_splits_amount_non_negative', sql`${t.amount} >= 0`),
])

// ── Relations ────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  identities: many(userIdentities),
  memberships: many(tripMembers),
}))

export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  user: one(users, { fields: [userIdentities.userId], references: [users.id] }),
}))

export const tripsRelations = relations(trips, ({ one, many }) => ({
  owner: one(users, { fields: [trips.ownerId], references: [users.id] }),
  members: many(tripMembers),
  days: many(tripDays),
  expenses: many(expenses),
}))

export const tripMembersRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, { fields: [tripMembers.tripId], references: [trips.id] }),
  user: one(users, { fields: [tripMembers.userId], references: [users.id] }),
}))

export const tripDaysRelations = relations(tripDays, ({ one, many }) => ({
  trip: one(trips, { fields: [tripDays.tripId], references: [trips.id] }),
  items: many(itineraryItems),
}))

export const itineraryItemsRelations = relations(itineraryItems, ({ one }) => ({
  day: one(tripDays, { fields: [itineraryItems.dayId], references: [tripDays.id] }),
  trip: one(trips, { fields: [itineraryItems.tripId], references: [trips.id] }),
}))

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  trip: one(trips, { fields: [expenses.tripId], references: [trips.id] }),
  payer: one(users, { fields: [expenses.paidBy], references: [users.id] }),
  splits: many(expenseSplits),
}))

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  user: one(users, { fields: [expenseSplits.userId], references: [users.id] }),
}))

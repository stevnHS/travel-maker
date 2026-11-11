import { z } from 'zod'

export const SPLIT_TYPES = [
  { value: 'equal', label: '均分' },
  { value: 'exact', label: '指定金額' },
  { value: 'shares', label: '按份數' },
] as const

export type SplitType = (typeof SPLIT_TYPES)[number]['value']

export const MAX_AMOUNT = 10_000_000

export const expenseInputSchema = z.object({
  title: z.string().trim().min(1, '請輸入項目').max(100, '最多 100 字'),
  amount: z.number({ error: '請輸入金額' }).int('金額需為整數').min(1, '金額需大於 0').max(MAX_AMOUNT, '金額過大'),
  paidBy: z.uuid({ error: '請選擇付款人' }),
  splitType: z.enum(['equal', 'exact', 'shares']),
  spentAt: z.iso.datetime({ offset: true, error: '日期格式錯誤' }),
  note: z.preprocess(
    v => (typeof v === 'string' ? v.trim() || null : v ?? null),
    z.string().max(1000, '最多 1000 字').nullable(),
  ),
  // equal：value 忽略；exact：value 為應付金額；shares：value 為份數
  participants: z.array(z.object({
    userId: z.uuid(),
    value: z.number().int().min(0).max(MAX_AMOUNT).optional(),
  })).min(1, '至少要有一位分攤者').max(100),
}).superRefine((d, ctx) => {
  const ids = new Set(d.participants.map(p => p.userId))
  if (ids.size !== d.participants.length) {
    ctx.addIssue({ code: 'custom', path: ['participants'], message: '分攤者重複' })
    return
  }
  const error = validateSplit(d.amount, d.splitType, d.participants)
  if (error) ctx.addIssue({ code: 'custom', path: ['participants'], message: error })
})

export const expenseUpdateSchema = expenseInputSchema.and(z.object({ version: z.number().int().positive() }))

export type ExpenseInput = z.output<typeof expenseInputSchema>

interface Participant {
  userId: string
  value?: number
}

export interface Split {
  userId: string
  amount: number
  shares: number | null
}

/** 回傳錯誤訊息，沒問題則回傳 null */
export function validateSplit(amount: number, splitType: SplitType, participants: Participant[]) {
  if (splitType === 'exact') {
    const sum = participants.reduce((s, p) => s + (p.value ?? 0), 0)
    if (sum !== amount) return `指定金額合計 ${sum}，與總額 ${amount} 不符`
  }
  if (splitType === 'shares') {
    if (participants.some(p => !p.value || p.value < 1)) return '每位分攤者至少 1 份'
  }
  return null
}

/**
 * 換算每人應付金額，各列加總必等於 amount。
 * 除不盡的餘數全部給付款人；付款人沒有分攤時給第一位分攤者。
 */
export function computeSplits(amount: number, splitType: SplitType, paidBy: string, participants: Participant[]): Split[] {
  if (splitType === 'exact') {
    return participants.map(p => ({ userId: p.userId, amount: p.value ?? 0, shares: null }))
  }

  const weights = participants.map(p => (splitType === 'shares' ? p.value ?? 1 : 1))
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const splits = participants.map((p, i) => ({
    userId: p.userId,
    amount: Math.floor((amount * weights[i]!) / totalWeight),
    shares: splitType === 'shares' ? weights[i]! : null,
  }))

  const remainder = amount - splits.reduce((s, x) => s + x.amount, 0)
  if (remainder > 0) {
    const target = splits.find(s => s.userId === paidBy) ?? splits[0]!
    target.amount += remainder
  }
  return splits
}

export interface Balance {
  userId: string
  paid: number
  owed: number
  net: number
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

/**
 * 結算：淨額 = 已付 − 應付。
 * 每次讓「欠最多的人」付給「應收最多的人」，至多 n − 1 筆轉帳。
 */
export function computeSettlement(
  memberIds: string[],
  expenses: { amount: number, paidBy: string, splits: { userId: string, amount: number }[] }[],
): { balances: Balance[], transfers: Transfer[] } {
  const map = new Map<string, Balance>()
  const get = (userId: string) => {
    let b = map.get(userId)
    if (!b) {
      b = { userId, paid: 0, owed: 0, net: 0 }
      map.set(userId, b)
    }
    return b
  }
  memberIds.forEach(get)

  for (const e of expenses) {
    get(e.paidBy).paid += e.amount
    for (const s of e.splits) get(s.userId).owed += s.amount
  }
  const balances = [...map.values()]
  balances.forEach((b) => { b.net = b.paid - b.owed })

  const debtors = balances.filter(b => b.net < 0).map(b => ({ id: b.userId, left: -b.net }))
  const creditors = balances.filter(b => b.net > 0).map(b => ({ id: b.userId, left: b.net }))
  const transfers: Transfer[] = []

  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.left - a.left)
    creditors.sort((a, b) => b.left - a.left)
    const d = debtors[0]!
    const c = creditors[0]!
    const amount = Math.min(d.left, c.left)
    transfers.push({ from: d.id, to: c.id, amount })
    d.left -= amount
    c.left -= amount
    if (d.left === 0) debtors.shift()
    if (c.left === 0) creditors.shift()
  }

  return { balances, transfers }
}

/** 12345 → NT$ 12,345 */
export function formatMoney(amount: number) {
  return `NT$ ${amount.toLocaleString('en-US')}`
}

# Travel Maker 開發計劃

旅遊行程共編 + 共同記帳網站（個人專案）。

## 技術決策

| 項目 | 決定 | 理由 |
|---|---|---|
| 框架 | Nuxt 4 + TypeScript | — |
| UI | Nuxt UI + Tailwind CSS | Nuxt 官方元件庫 |
| 驗證 | nuxt-auth-utils，僅 LINE 登入 | 旅伴多在 LINE 群組分享連結；單一登入途徑免處理帳號合併與缺 email 問題 |
| 資料庫 | Neon Postgres + Drizzle ORM | 閒置自動休眠、有請求即喚醒（Supabase 免費版閒置一週會暫停）；Drizzle 保持可攜 |
| 架構 | 所有資料存取經 Nuxt server API | 權限與商業邏輯集中，DB 只負責儲存 |
| 部署 | Vercel | 與 Nuxt、Neon 整合最省事 |

未採用：Supabase Auth（避免綁定平台）、Neon Auth（不支援 LINE）、Better Auth（單一 provider 用不到其優勢）。
身分以 `users` + `user_identities` 分表，日後加 provider 或換驗證方案成本低。

## 同步策略（非即時）

- 視窗回到前景（`visibilitychange`）、網路恢復時重新抓取，另加短輪詢
- 依 id 局部更新變動資料，避免整頁閃爍
- 使用者編輯中的項目不自動覆蓋，改顯示「已被他人更新」提示
- 每筆可編輯資料帶 `version` 欄位，更新時 `WHERE version = ?`（樂觀鎖），不符即回報衝突

## 記帳規則

- 金額以整數（元）儲存，不支援多幣別
- 分攤方式：均分 / 指定金額 / 按份數，皆換算成每人應付金額存入 `expense_splits`
- 除不盡的餘數固定分給付款人（若付款人未分攤則分給第一位分攤者）
- 結算：計算每人淨額（已付 − 應付），貪婪配對最大債務人與最大債權人，最多 n−1 筆轉帳

## 成員與權限

- 以邀請連結（`trips.invite_token`）加入旅程
- 角色：`owner`（可管理成員、刪除旅程）、`editor`（可編輯行程與記帳）

| 動作 | owner | editor |
|---|---|---|
| 檢視旅程、複製邀請連結 | ✓ | ✓ |
| 編輯旅程名稱 / 說明 / 日期 | ✓ | ✓ |
| 重設邀請連結、移除成員、轉移擁有者、刪除旅程 | ✓ | |
| 退出旅程 | 須先轉移擁有者 | ✓ |

- 每趟旅程恰有一位 owner，`trips.owner_id` 與 `trip_members.role` 同步維護（轉移時以 batch 一併更新）
- 非成員存取旅程一律回 404，不透露旅程是否存在
- 邀請預覽（`GET /api/invites/:token`）不需登入，只回傳名稱、日期、擁有者與人數；加入需登入，登入後透過 `auth_redirect` cookie 導回原頁
- 已有記帳紀錄（付款人或分攤者）的成員不可移除或退出，避免結算資料失去對象
- 旅程天數上限 60 天（日後依日期區間建立 `trip_days`）

### API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/trips` | 我參與的旅程 |
| POST | `/api/trips` | 建立旅程（建立者為 owner） |
| GET | `/api/trips/:id` | 旅程詳情與成員 |
| PATCH | `/api/trips/:id` | 更新旅程（帶 `version`，衝突回 409 與最新資料） |
| DELETE | `/api/trips/:id` | 刪除旅程（owner） |
| POST | `/api/trips/:id/invite-token` | 重設邀請連結（owner） |
| POST | `/api/trips/:id/transfer` | 轉移擁有者（owner） |
| DELETE | `/api/trips/:id/members/:userId` | 移除成員（owner）或退出（本人） |
| GET | `/api/invites/:token` | 邀請預覽 |
| POST | `/api/invites/:token/join` | 加入旅程（已是成員則直接回傳） |

錯誤訊息放在回應的 `message`（HTTP status text 只能是 ASCII，中文會被 h3 濾掉）。

開發環境另有 `/auth/dev?name=小明&redirect=/path` 假登入（provider = `dev`），用來在本機模擬多位成員；正式建置中只會回 404。

### 待後續里程碑處理

- 修改旅程日期時如何處理已存在的 `trip_days`（行程編輯里程碑一併設計）
- 「有記帳紀錄不可移除成員」的檢查已實作，待記帳 API 完成後補測

## 資料模型

```
users ─< user_identities
users ─< trip_members >─ trips
trips ─< trip_days ─< itinerary_items
trips ─< expenses ─< expense_splits >─ users
```

定義見 `server/db/schema.ts`。

## 里程碑

- [x] 專案骨架、schema、LINE 登入
- [x] 旅程 CRUD、邀請連結、成員管理
- [ ] 行程編輯（天 / 項目、排序、樂觀鎖、同步機制）
- [ ] 記帳（新增支出、三種分攤）
- [ ] 結算（淨額、債務最簡化）
- [ ] 部署到 Vercel

## 之後再決定

測試策略、LIFF 整合、離線記帳、多語系、地圖與地點搜尋。

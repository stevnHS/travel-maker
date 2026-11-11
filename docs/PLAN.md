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

## 主題

兩套視覺主題共用同一套版面，使用者自選，存在 `theme` cookie（伺服器渲染即輸出 `<html data-theme>`，不閃爍）。

| 主題 | 來源設計稿 | 特色 |
|---|---|---|
| `cream` 奶油黃（預設） | [NEWARK](https://joyce-0715.github.io/NEWARK/) | 奶油底、白卡片、黃色柔光陰影、Noto Sans TC |
| `comic` 漫畫手繪 | [our-trip](https://qqqqssss640.github.io/our-trip/) | 和紙底、3px 墨線、硬陰影、粉彩色、Zen Maru Gothic（缺字以粉圓 Huninn 補） |

- 色彩、文字、邊框、圓角：在 `app/assets/css/main.css` 覆寫 Nuxt UI 的 `--ui-*` 變數；主題自訂變數用 `--tm-` 開頭
- 元件形狀差異（粗框、陰影、圓角）：用 `cream:` / `comic:` custom variant，集中在 `app/app.config.ts`
- 頁面內的主題差異同樣用 `cream:` / `comic:` 寫在 class 上；插圖等結構差異用 `useTheme()` 判斷
- 只做淺色，已關閉 Nuxt UI 的 color mode
- 版面採設計稿 B 的手機優先、單欄（`max-w-xl`）；行程 / 記帳完成後加入底部分頁列

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
- 登入狀態存在加密 cookie（nuxt-auth-utils），登入後 30 天有效（`runtimeConfig.session.maxAge`），到期需重新以 LINE 登入
- 非成員存取旅程一律回 404，不透露旅程是否存在
- 邀請預覽（`GET /api/invites/:token`）不需登入，只回傳名稱、日期、擁有者與人數；加入需登入，登入後透過 `auth_redirect` cookie 導回原頁
- 已有記帳紀錄（付款人或分攤者）的成員不可移除或退出，避免結算資料失去對象
- 旅程天數上限 60 天（依日期區間建立 `trip_days`，見「行程」）

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

## 行程

- 每一天（`trip_days`）由旅程日期區間自動產生；建立或修改旅程日期時同步：補上缺少的天、刪除區間外的空白天
- 縮短日期時，若區間外的天還有行程項目，回 409 並列出日期，請使用者先移除或移到其他天
- 每一天可加標題（例如「高雄・岡山」）；項目有分類（景點 / 美食 / 交通 / 住宿 / 購物 / 其他），決定卡片顏色與圖示
- 排序：以「往前移 / 往後移」調整，`PUT .../order` 送出當天完整 id 清單；清單與伺服器不符（有人同時新增或刪除）回 409。排序不遞增 `version`，避免和內容編輯互相衝突
- 項目換到其他天時排在該天最後
- 填寫地點即可開啟 Google Maps 導航（以地點文字搜尋，不需 API key）

## 同步實作

- `useAutoRefresh`：前景時每 15 秒輪詢（旅程資訊 30 秒），視窗回到前景、網路恢復時立即抓取
- 編輯表單開啟時記下當時的 `version`；同步到較新版本時顯示「已被其他成員更新」並提供「載入最新內容」，不覆蓋使用者正在輸入的內容；項目被刪除時顯示提示並停用儲存
- 儲存時帶開啟時的 `version`，衝突回 409，表單保留並重新同步

## 記帳實作

- 換算邏輯（`computeSplits`、`computeSettlement`）放在 `shared/utils/expense.ts`，前端即時預覽與伺服器寫入共用同一份
- 編輯支出需同時更新 `expenses` 與 `expense_splits`。neon-http 只支援非互動式 batch，因此 batch 第一句以 `SELECT ... FOR UPDATE` 鎖住該列並檢查版本，不符時以 `1 / 0` 讓整批回滾，再回 409
- 結算結果隨支出列表一起回傳（`GET /api/trips/:id/expenses`），不另存資料表

### 行程與記帳 API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/trips/:id/itinerary` | 每一天與其行程項目 |
| PATCH | `/api/trips/:id/days/:dayId` | 修改當天標題（帶 `version`） |
| PUT | `/api/trips/:id/days/:dayId/order` | 調整當天項目順序 |
| POST | `/api/trips/:id/items` | 新增行程項目 |
| PATCH | `/api/trips/:id/items/:itemId` | 編輯 / 換天（帶 `version`） |
| DELETE | `/api/trips/:id/items/:itemId` | 刪除行程項目 |
| GET | `/api/trips/:id/expenses` | 支出列表、每人收支、轉帳建議、總額 |
| POST | `/api/trips/:id/expenses` | 新增支出 |
| PATCH | `/api/trips/:id/expenses/:expenseId` | 編輯支出（帶 `version`） |
| DELETE | `/api/trips/:id/expenses/:expenseId` | 刪除支出 |

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
- [x] 主題切換（奶油黃 / 漫畫手繪）
- [x] 行程編輯（天 / 項目、排序、樂觀鎖、同步機制）
- [x] 記帳（新增支出、三種分攤）
- [x] 結算（淨額、債務最簡化）
- [x] 部署到 Vercel

## 之後再決定

測試策略、LIFF 整合、離線記帳、多語系、地圖與地點搜尋。

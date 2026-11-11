# Travel Maker

旅遊行程共編與共同記帳網站。技術決策、設計規則與開發注意事項見 [CLAUDE.md](CLAUDE.md)。

## 技術堆疊

Nuxt 4 · Nuxt UI · nuxt-auth-utils（LINE Login）· Drizzle ORM · Neon Postgres

## 開始開發

1. 在 [LINE Developers Console](https://developers.line.biz/console/) 建立 LINE Login channel，Callback URL 填 `http://localhost:3000/auth/line`
2. 在 [Neon](https://neon.tech) 建立資料庫
3. 複製環境變數並填入：

```bash
cp .env.example .env
```

4. 安裝套件：

```bash
pnpm install
```

5. 建立資料表：

```bash
pnpm db:migrate
```

6. 啟動開發伺服器：

```bash
pnpm dev
```

開發時可用 `http://localhost:3000/auth/dev?name=小明` 以假身分登入，換不同 `name` 即可模擬多位旅伴（僅限開發環境）。

## 部署到 Vercel

建置已驗證可用 Vercel preset（`NITRO_PRESET=vercel pnpm build`，Node 24 runtime），Vercel 會自動偵測 Nuxt，不需要 `vercel.json`。

1. **正式資料庫**：Neon 專案的預設 branch（`production`）給正式站用，本機開發另開一個 `dev` branch，`.env` 填 dev 的連線字串。對 production 套用 migration：

   ```bash
   NUXT_DATABASE_URL="<production 連線字串>" pnpm db:migrate
   ```

2. **建立 Vercel 專案**：在 Vercel 匯入 GitHub repo，Framework Preset 選 Nuxt（通常會自動帶出）。
3. **設定環境變數**（Production）：

   | 變數 | 值 |
   |---|---|
   | `NUXT_DATABASE_URL` | 正式資料庫連線字串 |
   | `NUXT_APP_SECRET` | 至少 32 字元的隨機字串，例如 `openssl rand -base64 32`；換掉會讓所有人登出 |
   | `NUXT_OAUTH_LINE_CLIENT_ID` | LINE Login Channel ID |
   | `NUXT_OAUTH_LINE_CLIENT_SECRET` | LINE Login Channel secret |
   | `NUXT_OAUTH_LINE_REDIRECT_URL` | `https://<你的網域>/auth/line` |
   | `ENABLE_EXPERIMENTAL_COREPACK` | 選填。設為 `1` 時 Vercel 會依 `packageManager` 使用相同版本的 pnpm；安裝套件階段出錯時再加 |

   Function Region 建議選和 Neon 相同的區域（例如 Singapore），否則每次查詢都要跨洋。

4. **LINE Developers Console**：
   - Callback URL 加上 `https://<你的網域>/auth/line`（可與 localhost 並存，一行一個）
   - Channel 狀態要改成 **Published**，否則只有 channel 管理員與測試者能登入
5. **部署並檢查**：用 LINE 登入、建立旅程、用另一個帳號開邀請連結加入。

之後 schema 有變更時：`pnpm db:generate` → 本機 `pnpm db:migrate`（套用到 dev）測試 → 對 production 執行 migration → push 部署。開發用假登入 `/auth/dev` 在正式建置中一律回 404。

## 常用指令

| 指令 | 說明 |
|---|---|
| `pnpm dev` | 開發伺服器 |
| `pnpm build` | 建置 |
| `pnpm typecheck` | 型別檢查 |
| `pnpm db:generate` | 依 schema 變更產生 migration |
| `pnpm db:migrate` | 套用 migration |
| `pnpm db:studio` | 開啟 Drizzle Studio |

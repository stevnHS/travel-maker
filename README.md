# Travel Maker

旅遊行程共編與共同記帳網站。技術決策與開發計劃見 [docs/PLAN.md](docs/PLAN.md)。

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

## 常用指令

| 指令 | 說明 |
|---|---|
| `pnpm dev` | 開發伺服器 |
| `pnpm build` | 建置 |
| `pnpm typecheck` | 型別檢查 |
| `pnpm db:generate` | 依 schema 變更產生 migration |
| `pnpm db:migrate` | 套用 migration |
| `pnpm db:studio` | 開啟 Drizzle Studio |

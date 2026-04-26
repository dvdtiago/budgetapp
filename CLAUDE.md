# budgetapp

Self-hosted personal finance tracker. Goal: clear all debt within one year.

## Stack
- **Backend**: Node.js + Express + Prisma ORM + PostgreSQL (postgres:16-alpine)
- **Frontend**: React 18 + Vite + Tailwind CSS (darkMode: 'class') + Recharts + lucide-react
- **Auth**: JWT (30-day tokens)
- **Deployment**: Docker Compose — 3 services: `db`, `backend`, `frontend`
- **Served on**: port 731 via nginx, Cloudflare tunnel, Ubuntu x86_64 server (~/Apps/budgetapp)
- **Backend API**: internal port 4000, proxied via nginx at /api/

## Key files
- `docker-compose.yml` — 3 services, pgdata named volume, internal bridge network
- `backend/Dockerfile` — node:20-alpine + apk openssl + prisma generate; CMD: prisma db push && node src/index.js
- `backend/prisma/schema.prisma` — binaryTargets: ["native", "linux-musl-openssl-3.0.x"]
- `frontend/Dockerfile` — uses `node node_modules/vite/bin/vite.js build` (avoids Linux .bin execute-bit issue)
- `frontend/src/lib/MonthContext.jsx` — global YYYY-MM month state shared across all pages
- `frontend/src/components/Layout.jsx` — sidebar, MonthStepper, dark mode toggle
- `frontend/src/components/SurplusModal.jsx` — Avalanche auto-split surplus allocator
- `frontend/src/pages/Dashboard.jsx` — monthly summary, surplus, on-track indicator
- `frontend/src/pages/Budget.jsx` — debt payments + expense categories + bar chart
- `frontend/src/pages/Transactions.jsx` — global transaction table (expenses + debt payments)
- `frontend/src/pages/Income.jsx` — PHP/USD income logging with exchange rate
- `frontend/src/pages/Debts.jsx` — debt management + amortization schedule
- `frontend/src/pages/Settings.jsx` — profile, goal date, email reminders, change password

## Domain rules
- Primary currency: PHP. USD income is converted at entry-time exchange rate, stored as amountPhp
- Surplus = totalIncome − totalExpenses − totalDebtPaid (computed from logged data each month)
- Avalanche method: debts sorted by interest rate descending; autoSplit caps allocation at currentBalance
- All data scoped to userId — fully isolated per user
- Debt statuses: ACTIVE | PLANNED | PAID_OFF. Only ACTIVE debts show in Budget/Surplus

## Deployment ops
```bash
# Full rebuild + restart
docker compose build && docker compose up -d

# Rebuild one service
docker compose build frontend && docker compose up -d frontend

# View backend logs
docker compose logs -f backend

# Wipe DB and start fresh (DESTRUCTIVE — loses all data)
docker compose down -v && docker compose up -d
```

## Known gotchas
- **Prisma on Alpine**: requires `apk add --no-cache openssl` + `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`
- **vite permission denied** in Docker build: use `node node_modules/vite/bin/vite.js build` not `npm run build` / `vite build`
- **pgdata credential mismatch**: if .env DB credentials changed after volume was created, must `down -v` to reset
- **prisma db push** used instead of migrate deploy — no migration files, schema synced on every container start

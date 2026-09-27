# FinOS Backend

Express + Prisma + SQLite API for FinOS. Handles accounts, auth, and storage
for income, expenses, budgets, bills, and savings goals — replacing the
old `localStorage`-only version.

## Stack
- **Express** — the HTTP server
- **Prisma** — database ORM (SQLite for local dev; swap to Postgres for deployment, see below)
- **bcrypt** — password hashing
- **jsonwebtoken** — auth tokens, delivered via an httpOnly cookie

## Setup (first time)

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to a random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the output as `JWT_SECRET` in `.env`.

Create the database and tables:
```bash
npx prisma migrate dev --name init
```
This creates `prisma/dev.db` (a SQLite file) and generates the Prisma client.

## Run it

```bash
npm run dev
```
Server runs at `http://localhost:4000`. Test it's alive:
```bash
curlhttps://finos-4uij.onrender.com/api/health
```

## Inspect your data visually

```bash
npx prisma studio
```
Opens a browser UI where you can see/edit rows in every table — great for debugging without writing SQL.

## API overview

All routes except `/api/auth/*` require a valid login (a `token` cookie set at signup/login).

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account, logs you in |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Who am I? |
| GET/POST/DELETE | `/api/income`, `/api/income/:id` | Income entries |
| GET/POST/PUT/DELETE | `/api/expenses`, `/api/expenses/:id` | Expenses |
| GET/POST | `/api/budgets` | Category budget limits |
| GET/POST/DELETE | `/api/bills`, `/api/bills/:id` | Recurring bills |
| GET/POST/PUT/DELETE | `/api/goals`, `/api/goals/:id`, `/api/goals/:id/add-saved` | Savings goals |
| GET | `/api/dashboard/summary` | Aggregated totals for the dashboard |

## Testing quickly with curl

```bash
# Sign up (cookie gets saved to cookies.txt)
curl -c cookies.txt -X POSThttps://finos-4uij.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Add income, using the saved cookie
curl -b cookies.txt -X POSThttps://finos-4uij.onrender.com/api/income \
  -H "Content-Type: application/json" \
  -d '{"source":"Salary","amount":50000,"date":"2026-09-01"}'

# Fetch it back
curl -b cookies.txthttps://finos-4uij.onrender.com/api/income
```

## Deploying with a real database (Postgres)

1. Create a free Postgres DB on [Neon](https://neon.tech) or [Railway](https://railway.app) — you'll get a connection string like `postgresql://user:pass@host/dbname`.
2. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` in your production environment to that connection string.
4. Run `npx prisma migrate deploy` against it.
5. Deploy the backend itself to [Render](https://render.com) or [Railway](https://railway.app) (both have simple free tiers for Node apps).

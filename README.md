# Kagochi Farm Enterprise

**Smart Farm Records. Better Decisions. Better Performance.**

Final-year project: *AI-Powered Poultry and Livestock Farm Analytics and Decision Support Mobile Application*.

A web application (responsive, works on phones) for recording poultry, livestock, production, feeding and expenses,
viewing unit-safe analytics for a chosen period, transparent rule-based checks, and farm-grounded AI explanations through configurable Groq and Gemini providers (with optional Anthropic).

| Part | Technology | Folder |
|---|---|---|
| Frontend | React 19, TypeScript, Vite 8, React Router 7 | `frontend/` |
| Backend API | Node.js, Express 5, TypeScript (run with `tsx`), Zod validation | `backend/` |
| Database | SQLite (`better-sqlite3`), file `backend/src/kagochi.db` | `backend/src/database.ts` |
| AI | Groq-compatible API, Gemini SDK, optional Anthropic API; called **only** from the backend | `backend/src/aiProvider.ts` |
| Old duplicate copy (not used) | kept for reference only | `legacy/` |

## 1. Requirements

- Node.js 20 or newer (tested with Node 24) and npm.
- At least one AI provider key (optional; without keys, Farm Assistant answers factual questions from saved records and explains that AI advice is unavailable).

## 2. Install

```bash
cd backend
npm install
cd ../frontend
npm install
```

## 3. Configure the backend

```bash
cd backend
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Edit `backend/.env`:

- `JWT_SECRET` (required) — a long random value. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `AI_PROVIDER_PRIMARY` (default `groq`) and `AI_PROVIDER_FALLBACK` (default `gemini`) select the Farm Assistant provider order.
- Add `GROQ_API_KEY` for Groq (recommended primary) and/or `GEMINI_API_KEY` for Gemini fallback. `ANTHROPIC_API_KEY` enables the optional Anthropic provider. The separate Farm Performance Review endpoint currently uses Gemini, so set `GEMINI_API_KEY` to enable it.
- `GROQ_MODEL`, `GEMINI_MODEL`, and `ANTHROPIC_MODEL` override model IDs without code edits. Defaults and local configuration are in `backend/.env.example`.
- On Render, configure `GROQ_API_KEY`, `AI_PROVIDER_PRIMARY=groq`, `AI_PROVIDER_FALLBACK=gemini`, and `GROQ_MODEL`. Add `GEMINI_API_KEY` if Gemini fallback should be available. Never expose provider keys in Vercel/frontend variables.
- Neon PostgreSQL connections use TLS certificate and hostname verification (`sslmode=verify-full`); the backend normalizes remote `DATABASE_URL` values accordingly.

`backend/.env` and `*.db` files are ignored by git. **Never commit them.**

## 4. Create accounts

Self-registration is off by default. Create accounts from the command line (the password is typed at a hidden prompt):

```bash
cd backend
npm run users -- create --name "Your Name" --email you@example.com --role admin
npm run users -- list
npm run users -- set-role --email someone@example.com --role farmer
npm run users -- reset-password --email you@example.com
```

Administrators can also create accounts and change roles from **Users** in the dashboard.

## 5. Run (two terminals)

```bash
# Terminal 1 — backend API on http://localhost:3001
cd backend
npm run dev

# Terminal 2 — frontend on http://localhost:5173
cd frontend
npm run dev
```

Open http://localhost:5173. The public website is the first page; **Login** opens `/login`; after logging in you are
taken to the protected dashboard at `/app`. In development Vite forwards `/api/*` to the backend, so the browser only
talks to one address and the session cookie stays first-party.

### Single-server (production-style) run

```bash
cd frontend && npm run build
cd ../backend
# in backend/.env: FRONTEND_DIST=../frontend/dist, COOKIE_SECURE=true (when served over HTTPS), NODE_ENV=production
npm start
```

## 6. Tests and checks

```bash
cd backend
npm run typecheck     # TypeScript type check
npm test              # API, security and analytics tests (node:test + supertest, in-memory database)

cd ../frontend
npm run lint          # oxlint
npm run build         # TypeScript check + production build
```

## 7. Migrating records from the old database

Earlier versions saved records in a second database (`server/kagochi.db`, now `legacy/server/kagochi.db`).
To copy them into the active database (a backup is written to `backups/` first; nothing is overwritten):

```bash
cd backend
npm run migrate:legacy -- --from ../legacy/server/kagochi.db --dry-run   # preview
npm run migrate:legacy -- --from ../legacy/server/kagochi.db
```

## 8. Population ledger migration

Deaths, sales, and transfers are recorded in the population-event ledger; current poultry counts and livestock status are projections of that ledger. Do not change a flock's current count or an animal's lifecycle status directly. Use **Survivor Tracking** to record population events.

Before moving legacy snapshot counts into the ledger, run a read-only preview:

```bash
cd backend
npm run backfill:population                         # dry-run; no writes
npm run backfill:population -- --owner-id=OWNER_ID  # limit preview to one account
```

The planner reports snapshot/ledger differences. It does not guess whether poultry losses were deaths or sales. Applying requires an operator-supplied snapshot date, and any poultry shortfall additionally requires an explicit classification:

```bash
npm run backfill:population -- --apply --as-of=YYYY-MM-DD --poultry-loss-type=death
```

Use `sale` instead of `death` only when the farm's records support that classification. Backfilled entries are tagged as approximate because legacy records did not retain the event date. Review the preview and take a database backup before applying. The process is idempotent: after a successful reconciliation, a subsequent dry-run will not propose that adjustment again.

## 9. Backup and restore

The whole database is one file: `backend/src/kagochi.db` (plus `-wal`/`-shm` files while the server runs).

- **Backup:** stop the backend, then copy `kagochi.db` to a safe location (for example an external drive or private cloud
  folder). Do this regularly — there is no automatic backup.
- **Restore:** stop the backend, replace `kagochi.db` with the backup copy, start the backend.

## 10. How it works (short version)

1. The browser shows the React app. Farm pages are under `/app` and require login.
2. Login sends email + password to `POST /api/auth/login`. The backend checks the bcrypt hash and sets an
   **httpOnly, SameSite=Strict session cookie** (JavaScript cannot read it).
3. Every `/api/farm/*`, `/api/farm-advice`, `/api/farm-chat` and `/api/admin/*` request is checked on the backend.
   Records are always filtered by the logged-in user's id; admin routes also require the `admin` role.
4. `GET /api/farm/summary?days=30` calculates totals per unit, averages, previous-period comparisons and IF-THEN rule
   results (`backend/src/analytics.ts`).
5. Farm Assistant routes each question to a compact, owner-scoped summary for its intent and date period. Simple factual questions use database templates; explanations use the configured AI provider chain and replies are sanitized to plain text.

See `docs/` for the audit report, security notes and Chapter 4/5 material.

## 10. Known limitations

- Single SQLite file on one server: no automatic backups, replication or encryption at rest.
- No password-reset email, no multi-factor authentication, no Google sign-in (removed because it was not verified).
- Revenue/profit are not calculated because sales and prices are not recorded.
- Rule thresholds (`DEFAULT_THRESHOLDS` in `backend/src/analytics.ts`) are management prompts, not veterinary standards.
- AI answers can be wrong; the AI is not trained on farm data — it is an external API that receives a summary.

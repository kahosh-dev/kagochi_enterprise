# Kagochi Farm Enterprise

**Smart Farm Records. Better Decisions. Better Performance.**

Final-year project: *AI-Powered Poultry and Livestock Farm Analytics and Decision Support Mobile Application*.

A web application (responsive, works on phones) for recording poultry, livestock, production, feeding and expenses,
viewing unit-safe analytics for a chosen period, transparent rule-based checks, and AI explanations from Google Gemini.

| Part | Technology | Folder |
|---|---|---|
| Frontend | React 19, TypeScript, Vite 8, React Router 7 | `frontend/` |
| Backend API | Node.js, Express 5, TypeScript (run with `tsx`), Zod validation | `backend/` |
| Database | SQLite (`better-sqlite3`), file `backend/src/kagochi.db` | `backend/src/database.ts` |
| AI | Google Gemini via `@google/genai`, called **only** from the backend | `backend/src/ai.ts` |
| Old duplicate copy (not used) | kept for reference only | `legacy/` |

## 1. Requirements

- Node.js 20 or newer (tested with Node 24) and npm.
- A Gemini API key (optional; without it the AI advisor shows "not configured" and everything else works).

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
- `GEMINI_API_KEY` (optional) — enables the AI advisor.
- Other optional settings are documented in `.env.example`.

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

## 8. Backup and restore

The whole database is one file: `backend/src/kagochi.db` (plus `-wal`/`-shm` files while the server runs).

- **Backup:** stop the backend, then copy `kagochi.db` to a safe location (for example an external drive or private cloud
  folder). Do this regularly — there is no automatic backup.
- **Restore:** stop the backend, replace `kagochi.db` with the backup copy, start the backend.

## 9. How it works (short version)

1. The browser shows the React app. Farm pages are under `/app` and require login.
2. Login sends email + password to `POST /api/auth/login`. The backend checks the bcrypt hash and sets an
   **httpOnly, SameSite=Strict session cookie** (JavaScript cannot read it).
3. Every `/api/farm/*`, `/api/farm-advice`, `/api/farm-chat` and `/api/admin/*` request is checked on the backend.
   Records are always filtered by the logged-in user's id; admin routes also require the `admin` role.
4. `GET /api/farm/summary?days=30` calculates totals per unit, averages, previous-period comparisons and IF-THEN rule
   results (`backend/src/analytics.ts`).
5. The AI advisor sends that calculated summary (no names, emails or record ids) to Gemini and returns the answer.

See `docs/` for the audit report, security notes and Chapter 4/5 material.

## 10. Known limitations

- Single SQLite file on one server: no automatic backups, replication or encryption at rest.
- No password-reset email, no multi-factor authentication, no Google sign-in (removed because it was not verified).
- Revenue/profit are not calculated because sales and prices are not recorded.
- Rule thresholds (`DEFAULT_THRESHOLDS` in `backend/src/analytics.ts`) are management prompts, not veterinary standards.
- AI answers can be wrong; the AI is not trained on farm data — it is an external API that receives a summary.

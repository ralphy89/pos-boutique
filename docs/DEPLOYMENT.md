# Deployment guide

This document describes a **production-oriented** setup for POS Boutique: environment variables, CORS, building the frontend, running the API, HTTPS, and backups.

## 1. What must stay private

| Item | Notes |
|------|--------|
| `backend/.env` | Contains `JWT_SECRET`, `DATABASE_URL`, etc. Never commit or paste into tickets. |
| `frontend/.env` / `.env.production` | May contain public `VITE_*` values only; still avoid committing machine-specific URLs if sensitive. |
| SQLite `*.db` files | Live business data; backup and encrypt as you would any database. |
| Virtualenv `.venv` | Rebuild on each server with `pip install -r requirements.txt`. |

The repository `.gitignore` files exclude these patterns. After cloning on a server, always create `.env` from `.env.example`.

## 2. Backend (FastAPI)

### 2.1 Environment variables

Copy `backend/.env.example` to `backend/.env` and set at least:

| Variable | Production guidance |
|----------|----------------------|
| `JWT_SECRET` | Long random string (e.g. 32+ bytes from a CSPRNG). **Change from the example.** |
| `ENV` | e.g. `production` (informational; you can branch logging on it later). |
| `DATABASE_URL` | SQLite path on disk or UNC path; see `backend/README.md` for external drive/NAS notes. |
| `CORS_ORIGINS` | Comma-separated **exact** frontend origins, no trailing slash, e.g. `https://pos.example.com`. |

### 2.2 CORS

The API reads `CORS_ORIGINS` from `.env`. The browser only sends `Origin` for your real site and preflight requests; if the SPA is served from `https://pos.example.com`, that origin must appear in `CORS_ORIGINS`.

Local dev default UI origin is `http://localhost:8089` (API `http://localhost:8090`).

### 2.3 Run the API

Install dependencies in a virtual environment, then use a production ASGI server. Example with Uvicorn (single worker; add a process manager such as **systemd**, **NSSM**, or **Docker**):

```bash
cd backend
. .venv/bin/activate   # or Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.server:app --host 0.0.0.0 --port 8090
```

For multiple workers with SQLite, prefer **one** worker or migrate to PostgreSQL. SQLite and concurrent writes do not scale like a client/server database.

### 2.4 Reverse proxy & HTTPS

Terminate TLS at **nginx**, **Caddy**, or your cloud load balancer. Proxy `/` to the API only for API routes, or mount the API under e.g. `https://api.example.com` and set `VITE_API_BASE_URL` accordingly.

Health check: `GET /health` → `{"status":"ok"}`.

## 3. Frontend (Vite)

Build static assets with the **public API URL** baked in at build time:

```bash
cd frontend
npm ci
# Production API URL (no trailing slash)
set VITE_API_BASE_URL=https://api.example.com
set VITE_APP_NAME=My Boutique
npm run build
```

Output is in `frontend/dist/`. Serve `dist/` with any static host (nginx, S3+CloudFront, Netlify, etc.). Ensure the SPA fallback: all unknown paths serve `index.html` for client-side routing.

### 3.1 Environment files

- **Development:** `frontend/.env` from `.env.example`.
- **CI/CD:** inject `VITE_API_BASE_URL` and `VITE_APP_NAME` in the build step; do not commit secrets into the repo (Vite `VITE_*` values are embedded in the client bundle and are visible to users).

## 4. First deploy checklist

1. Generate a strong `JWT_SECRET` and unique `.env` on the server.
2. Set `CORS_ORIGINS` to your real frontend origin(s).
3. Point `DATABASE_URL` to a persistent path and plan backups.
4. Build frontend with the correct `VITE_API_BASE_URL`.
5. Use HTTPS everywhere (API and SPA).
6. Register the first user via `POST /auth/register` (or seed an admin if you add that flow later).

## 5. Backups

- Copy the SQLite file while the app is idle or use SQLite backup APIs; avoid unplugging external drives during writes.
- Store backups off-machine (encrypted).

## 6. If secrets were ever committed

1. Remove files from the index (`.env`, `.venv`, `*.db`) and add proper `.gitignore` (already in this repo).
2. **Rotate `JWT_SECRET`**; all existing JWTs become invalid.
3. If passwords or tokens were exposed, force password changes and review access logs.

For historical leaks, consider `git filter-repo` or BFG; that rewrites history and requires coordination with anyone who has cloned the repo.

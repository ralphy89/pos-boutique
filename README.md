# POS Boutique

Web POS and light back-office for small retail: products, sales, customers, cash register sessions, and customer credit. **React (Vite)** frontend and **FastAPI** backend with SQLite.

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | SPA: auth, dashboard, sales, inventory, customers, credits, settings |
| `backend/` | REST API, JWT auth, SQLite persistence |
| `docs/DEPLOYMENT.md` | **Production setup**, env vars, CORS, HTTPS, backups |

## Quick start (development)

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn src.server:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open the URL shown by Vite (default `http://localhost:5173`). The API should match `VITE_API_BASE_URL` in `frontend/.env` (default `http://localhost:8000`).

## Security & git

- **Do not commit** `.env`, `.venv`, `*.db`, or real secrets. Templates live in `*.env.example`.
- **`*.pdf`** is ignored at the repo root (keeps specs and contracts local). Use `git add -f file.pdf` only if you intentionally need a PDF in git.
- If this repo ever contained a real `backend/.env` or `JWT_SECRET` in history, **rotate `JWT_SECRET`** before production and treat old tokens as invalid.
- See `docs/DEPLOYMENT.md` for CORS, HTTPS, and backup guidance.

## Documentation

- [Deployment guide](docs/DEPLOYMENT.md)
- [Backend API notes](backend/README.md)
- [Frontend config](frontend/README.md)

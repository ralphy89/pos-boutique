# POS Boutique

Web POS and light back-office for small retail: products, sales, customers, cash register sessions, and customer credit. **React (Vite)** frontend and **FastAPI** backend with SQLite.

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | SPA: auth, dashboard, sales, inventory, customers, credits, settings |
| `backend/` | REST API, JWT auth, SQLite persistence |
| `docs/DEPLOYMENT.md` | **Production setup**, env vars, CORS, HTTPS, backups |

## Quick start (development)

**Windows — tout en une fois :** à la racine du dépôt, double-cliquez `start-local.bat` (ou dans PowerShell : `.\scripts\start-local.ps1`). Le script crée `backend/.venv`, installe pip et npm si besoin, copie les `.env` depuis les exemples, puis ouvre deux fenêtres (API port 8000 + Vite port 5173). Si **Python** ou **Node.js** est absent, le script tente une installation via **`winget`** (Windows 10/11) — une fenêtre UAC peut s’afficher. Sinon, installez-les à la main puis relancez. Options : `-InstallOnly`, `-Lan` (réseau local), `-SkipRuntimeInstall` (ne pas appeler winget), `-ApiPort` / `-UiPort` (ports non standards, ex. `-ApiPort 8843 -UiPort 9321`). Si vous changez le port de l’UI, ajoutez `http://localhost:<UiPort>` dans `CORS_ORIGINS` (`backend/.env`).

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

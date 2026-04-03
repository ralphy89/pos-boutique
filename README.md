# POS Boutique

Web POS and light back-office for small retail: products, sales, customers, cash register sessions, and customer credit. **React (Vite)** frontend and **FastAPI** backend with SQLite.

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | SPA: auth, dashboard, sales, inventory, customers, credits, settings |
| `backend/` | REST API, JWT auth, SQLite persistence |
| `docs/DEPLOYMENT.md` | **Production setup**, env vars, CORS, HTTPS, backups |
| `launch_pos_boutique.py` | Clone/update under the user profile, **`run_start_local_bat`**, browser helpers |

## Optional Python wrapper (Windows)

`launch_pos_boutique.py`:

- **`prepare_pos_boutique_install_or_update(repo_url=…, shallow=True)`** — if the network looks reachable, runs clone/update; if **offline** and the install already exists (**`scripts/start-local.ps1`** present), skips git and returns the install path; if offline and not installed, exits with an error (connect once to clone).
- **`clone_or_update_pos_boutique_in_program_files(…)`** — same clone/pull rules as above, always attempts git (used when you know you are online).
- **`run_start_local_bat(*args)`** — runs **`start-local.bat`** with **`cwd`** set to that same install folder (not the directory of `launch_pos_boutique.py`).
- **`open_pos_boutique_browser_when_ready()`** — probes **localhost** ports every **5 s**, then opens the UI.
- CLI: `python launch_pos_boutique.py` calls **`prepare_pos_boutique_install_or_update()`**, then starts **`start-local.bat`** and waits for the UI/API ports.

## Quick start (development)

**Windows — tout en une fois :** à la racine du dépôt, double-cliquez `start-local.bat` (ou dans PowerShell : `.\scripts\start-local.ps1`). Le script crée `backend/.venv`, installe pip et npm si besoin, copie les `.env` depuis les exemples, puis ouvre deux fenêtres (API port 8090 + Vite port 8089). Si **Python** ou **Node.js** est absent, le script tente une installation via **`winget`** (Windows 10/11) — une fenêtre UAC peut s’afficher. Sinon, installez-les à la main puis relancez. Options : `-InstallOnly`, `-Lan`, `-SkipRuntimeInstall`, `-ApiPort` / `-UiPort`, **`-Background`** (pas de fenêtres ; journaux dans `logs/`, arrêt avec `stop-local.bat` ou `.\scripts\stop-local.ps1`). Si vous changez le port de l’UI, ajoutez `http://localhost:<UiPort>` dans `CORS_ORIGINS` (`backend/.env`).

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn src.server:app --reload --port 8090
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open the URL shown by Vite (default `http://localhost:8089`). The API should match `VITE_API_BASE_URL` in `frontend/.env` (default `http://localhost:8090`).

## Security & git

- **Do not commit** `.env`, `.venv`, `*.db`, or real secrets. Templates live in `*.env.example`.
- **`*.pdf`** is ignored at the repo root (keeps specs and contracts local). Use `git add -f file.pdf` only if you intentionally need a PDF in git.
- If this repo ever contained a real `backend/.env` or `JWT_SECRET` in history, **rotate `JWT_SECRET`** before production and treat old tokens as invalid.
- See `docs/DEPLOYMENT.md` for CORS, HTTPS, and backup guidance.

## Documentation

- [Deployment guide](docs/DEPLOYMENT.md)
- [Backend API notes](backend/README.md)
- [Frontend config](frontend/README.md)

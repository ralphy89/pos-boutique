## Frontend (Vite + React + TypeScript)

### Environment setup

1. Copy `.env.example` to `.env` for local development (do not commit `.env`).
2. Set the backend URL (no trailing slash):

```bash
VITE_API_BASE_URL=http://localhost:8090
```

For production builds, set the same variables in your CI or shell before `npm run build` so the client points at the real API. See `docs/DEPLOYMENT.md`.

### Config organization

- `src/config/env.ts` → normalized environment values
- `src/config/endpoints.ts` → centralized API endpoint map (auth + placeholders for future modules)
- `src/auth/session.ts` → token/session storage helpers
- `src/auth/AuthGate.tsx` → route guards (protected/guest)

### Run

```bash
npm install
npm run dev
```


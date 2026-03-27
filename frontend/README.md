## Frontend (Vite + React + TypeScript)

### Environment setup

1. Copy `.env.example` to `.env` (already created for local dev).
2. Set the backend URL:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

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


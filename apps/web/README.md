# NeuroCraft Web Application

The NeuroCraft web console is a React 18 + TypeScript + Vite application for
file analysis, security posture monitoring, passive reconnaissance, quantum
trust simulation, reports, and audit history.

## Implemented capabilities

- Responsive command-center dashboard with posture metrics and risk trends.
- Drag-and-drop static file analysis with an eight-stage quarantine pipeline.
- Evidence, findings, hashes, signatures, entropy, and risk verdict views.
- Passive DNS, TLS, and HTTP security-header reconnaissance workflows.
- Quantum trust simulation and cryptographic risk visualization.
- Security report generation, integrity hashes, export actions, and history.
- Local-first authentication fallback with optional Firebase Authentication.
- Offline-first sync status, pending queue visibility, retry actions, and cloud
  synchronization when Firebase is configured.
- Light/dark themes, keyboard command palette, responsive navigation, toast
  feedback, accessible focus states, reduced-motion support, and mobile layout.

## Development

From the repository root:

```bash
cd apps/web
npm install
npm run dev
```

The Vite development server runs at `http://localhost:5173`. API requests use
the `/api/v1` path and are proxied by the root Vite configuration when the
FastAPI service is running.

## Production build

```bash
npm run build
npm run preview
```

The build runs TypeScript checking before producing `apps/web/dist`.

## Optional Firebase configuration

Leave the `VITE_FIREBASE_*` values empty to use local-first mode. To enable
Firebase Authentication and Firestore synchronization, copy the variables from
the repository `.env.example` into the frontend environment used by Vite.
Never put Firebase Admin credentials or server service-account keys in
`VITE_*` variables.

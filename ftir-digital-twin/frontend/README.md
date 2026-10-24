# Vehicle Cyber Incident Analyzer (frontend)

React + Vite + TypeScript + Tailwind frontend for the FTIR Digital Twin backend.
It walks one incident through the full pipeline:
**FTIR → AI cyber filter → threat correlation → digital twin simulation → impact → mitigations → final report.**

The backend is not modified. This folder sits next to `backend/` and only calls its HTTP API.

```
ftir-digital-twin/
├── backend/     ← your Express API (unchanged)
├── data/
└── frontend/    ← this app
```

## Run it

```bash
# 1. Backend (terminal 1)
cd backend
npm install
npm run dev            # http://localhost:5000

# 2. Frontend (terminal 2)
cd frontend
cp .env.example .env   # Windows: copy .env.example .env
npm install
npm run dev            # http://localhost:5173
```

The top bar shows **Live backend** (green) when `GET /api/v1/health` answers, otherwise
**Demo data** (amber) and the app runs on built-in mock data. Set `VITE_USE_MOCK=true` to force demo mode.

In dev, Vite proxies `/api/*` to `VITE_API_BASE_URL`, so there are no CORS issues.
For a production build (`npm run build`), the app calls `VITE_API_BASE_URL` directly (backend CORS is already open).

## Folder layout

```
src/
├── components/
│   ├── layout/        Sidebar, top bar (PageFrame), AppShell (mode detection + ?ftir= sync)
│   ├── ui/            Card, Button, Pill, Drawer, ConfirmDialog, skeletons, empty/error states
│   ├── charts/        Severity gauge, chart tooltip
│   ├── twin/          Vehicle network SVG
│   ├── IncidentSelect.tsx, RunChainPrompt.tsx
├── pages/             One file per sidebar page
├── services/
│   ├── http.ts        request<T>() — unwraps { success, data }, ApiError, timeouts
│   ├── api.ts         Single API object; routes to live/ or mock/ ; re-exports explainFTIR
│   ├── live/          Real endpoints
│   └── mock/          Demo backend (26 FTIRs, simulator that emits backend-shaped events)
├── hooks/             TanStack Query hooks, pipeline chaining, AI-run confirm, theme colors
├── store/app.ts       Zustand: theme, active incident, pipeline ids, planned mitigations (persisted)
├── lib/               labels, formatting, explain (evidence), correlation, signals, PDF
├── data/              mitigationMeta.ts (effort / risk-reduction estimates)
├── types/api.ts       Types matching the backend responses
└── styles/theme.css   "Control Room" palette as CSS variables (dark + light)
```

## Which page calls what

| Page | Endpoints | Notes |
|---|---|---|
| FTIR Reports | `GET /api/v1/ftir`, `GET /api/v1/ftir/stats/summary`, `POST /api/v1/ftir/upload`, `GET /api/v1/classification/summary`, `GET /api/impact-analysis` | **Run analysis** = `POST /api/v1/classification/run-all`, then `POST /api/v1/attack-identification/run-all` |
| AI Cyber Filter | `GET /api/v1/classification/summary`, `/cybersecurity`, `/non-cybersecurity`, `POST /run`, `POST /run-all` | Evidence highlighting is client-side (see below) |
| Threat Correlation | `GET /api/v1/attack-identification/summary`, `/profiles`, `POST /run`, `POST /run-all` | Linked FTIRs and the graph are computed in the browser |
| Digital Twin | `POST /api/simulations`, `GET /api/simulations/:runId` | Backend finishes instantly; the UI replays `result.events` over time |
| Impact Analysis | `POST /api/impact-analysis`, `GET /api/impact-analysis/:id` | Runs automatically right after a simulation |
| Recommendations | `POST /api/recommendations`, `GET /api/recommendations/:id` | Effort and risk reduction are frontend estimates |
| Final Report | all of the above | PDF is generated in the browser (jsPDF) |

All AI (Gemini) endpoints run **only** after a confirm dialog.

### Live vs computed vs mocked

- **Live (backend):** reports, stats, upload, classification, attack profiles, simulation, impact, recommendations.
- **Computed in the browser:** evidence phrases for "AI take", FTIR correlation (same attack / same model / within 7 days), signal charts, before/after chart, mitigation effort + risk reduction, PDF.
- **Mocked:** everything, only when the backend is unreachable or `VITE_USE_MOCK=true`.

### Backend restarts

Simulations, impact analyses and recommendation reports live in backend memory.
The frontend stores `{ simulationRunId, impactId, finalReportId }` per incident in localStorage. If one of them
returns 404 after a restart, it quietly re-runs simulate → impact → recommendations and shows a toast.

## Where to plug in the real thing

### 1. LLM explanation for "AI take"
`src/lib/explain.ts` → `explainFTIR()` — look for `// TODO(LLM)`.
Today: verdict, confidence and explanation come from the real Gemini classification; evidence phrases come from a
keyword dictionary run over the report text. To use an LLM, call your future endpoint (for example
`POST /api/v1/classification/explain`) returning `{ verdict, confidence, explanation, evidence: [{ phrase, strength }] }`.
Keep the existing filter that drops any phrase that is not an exact substring of the report, so nothing is invented.

### 2. Backend correlation endpoint
`src/lib/correlation.ts` → `correlate()` builds edges client-side. Replace the call in
`src/pages/ThreatsPage.tsx` (`useMemo(() => correlate(...))`) with a query to your endpoint returning
`{ a, b, rules: ("attack" | "model" | "time")[] }[]`.

### 3. More digital twin ECUs
`src/components/twin/VehicleNetwork.tsx` → `NODES`. Infotainment, Telematics and Gateway are drawn with
`simulated: false` (muted, "Not simulated yet"). Once the backend twin emits events for them
(e.g. `INFOTAINMENT_ECU_AFFECTED`), flip `simulated` to `true` and add the id to `SIMULATED` in
`src/pages/DigitalTwinPage.tsx` and `ECUS` in `src/lib/signals.ts`.

## Design notes

- Palette: Control Room. Page `#0B1220`, cards `#131C2E`, accent cyan `#22D3EE`, secondary indigo `#6366F1`.
  Severity: Low `#4ADE80`, Medium `#FACC15`, High `#FB923C`, Critical `#F87171`. All in `src/styles/theme.css`.
- Inter for UI, JetBrains Mono for FTIR IDs. Two font weights (400 / 500).
- Flat surfaces, 16px card radius, pill buttons, one solid CTA per view.
- The active incident follows you across pages and lives in the URL (`?ftir=FTIR-10000`).

# Social Media Privacy Risk Assessment Framework

QuietSignal helps users review social-media privacy habits without entering sensitive personal values.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/privacy-risk-assessment/src/App.tsx` — assessment flow, dashboard, results, simulator, and checklist UI
- `artifacts/privacy-risk-assessment/src/index.css` — QuietSignal visual system and responsive styles
- `artifacts/api-server/src/lib/privacy-engine.ts` — feature extraction, category scoring, findings, recommendations, and simulation logic
- `artifacts/api-server/src/routes/privacy.ts` — assessment, dashboard, simulator, and checklist API routes
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/` — safe derived assessment persistence tables
- `data/generate_dataset.py` — 1,000-record synthetic dataset generator
- `docs/threat-model.md` — defensive threat model and recommended controls

## Architecture decisions

- Assessment inputs are limited to booleans and broad audience/awareness choices; the app never asks for actual contact details, passwords, locations, or messages.
- Scores are educational exposure indicators where higher values mean higher assessed exposure, not a guarantee of compromise.
- Only derived summaries are stored: assessment ID, scores, findings, recommendations, control count, risk level, and timestamp.
- Improvement simulation recalculates a copied answer set and never mutates the saved assessment.

## Product

Users can complete a 46-question privacy review, see weighted category scores, read prioritized findings, simulate safer settings, review synthetic aggregate stats, and print a privacy checklist.

## User preferences

The project should remain defensive, beginner-friendly, synthetic-data-safe, and suitable for GitHub/LinkedIn proof of work.

## Gotchas

- Vite production builds require `PORT` and `BASE_PATH`; the managed web workflow supplies them automatically.
- If the generated client reports `Headers.entries()` missing, keep `dom.iterable` in `lib/api-client-react/tsconfig.json`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# Social Media Privacy Risk Assessment Framework

QuietSignal is a defensive privacy-awareness app that turns self-reported
social-media settings and habits into a practical risk review. It does not
scrape profiles, access private accounts, collect passwords, or request actual
contact details.

## What it includes

- 46-question privacy assessment across nine privacy areas
- Risk score from 0–100 where higher means higher assessed exposure
- LOW, MODERATE, HIGH, and CRITICAL risk levels
- Category scoring for profile, personal information, location, content,
  connections, tagging, account security, third-party apps, social engineering,
  and digital footprint
- Findings and prioritized recommendations
- Improvement simulator showing how selected changes affect the framework score
- Synthetic aggregate dashboard
- Printable privacy checklist
- PostgreSQL persistence limited to derived assessment summaries
- Synthetic 1,000-record CSV generator

## Run locally

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/privacy-risk-assessment run dev
```

The app uses the workspace-managed `DATABASE_URL`, `PORT`, and `BASE_PATH`
values supplied by the configured workflows.

## Synthetic dataset

```bash
python data/generate_dataset.py
```

This creates `data/social_media_privacy_assessments.csv` with 1,000 fictional
records. It contains settings and derived scores only.

## API

- `POST /api/assessment`
- `GET /api/assessment/{id}`
- `POST /api/assessment/simulate-improvement`
- `GET /api/dashboard/stats`
- `GET /api/privacy-checklist`

The OpenAPI source of truth is `lib/api-spec/openapi.yaml`; generated client
hooks are in `lib/api-client-react`.

## Privacy by design

The app follows data minimization, purpose limitation, privacy by default,
least privilege, transparency, user control, and retention-aware storage. It
stores only assessment IDs, derived scores, risk levels, finding types, and
timestamps. It intentionally does not store phone numbers, email addresses,
birth dates, addresses, exact locations, passwords, or message contents.

## Ethical disclaimer

This is an educational risk framework, not a guarantee that an account will or
will not be compromised. Scores and weights are simplified assumptions for
awareness training and should not be used as a professional security decision
without validation.

## Suggested portfolio proof

Document the questionnaire design, scoring assumptions, threat model, safe data
boundaries, API contract, and improvement simulation in a project report. Show
the assessment flow, results dashboard, generated synthetic CSV, and test
evidence without including personal information.
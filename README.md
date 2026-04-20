# DealBank

DealBank is a React + Vite application for real estate deal analysis, pipeline tracking, and investor workflows.

## Claude API Proxy (Secure Setup)

Anthropic requests are proxied through a Vercel serverless function at `api/claude.js`.
The frontend never calls Anthropic directly.

### Required Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANTHROPIC_MODEL` (optional, defaults to `claude-sonnet-4-20250514`)

### Optional Claude Variables

- `ANTHROPIC_API_KEY` (server-side only): required for live Anthropic responses.
- `CLAUDE_DEMO_MODE=true`: forces local mock Claude responses (no Anthropic billing).

If `ANTHROPIC_API_KEY` is missing, the proxy now falls back to demo responses automatically so AI flows can still be demonstrated.

## Property Intelligence Proxy (Realty Base via RapidAPI)

Deal analysis now supports external property grounding data through:

- `POST /api/property-intelligence`

The frontend calls this endpoint first for property details, AVM hints, and comps snapshots, then feeds that context into Claude analysis.

### Required Server Environment Variables

- `RAPIDAPI_KEY_REALTY_BASE` (or fallback `RAPIDAPI_KEY`)

### Optional Server Environment Variables

- `RAPIDAPI_REALTY_BASE_HOST` (default: `realty-base-us.p.rapidapi.com`)
- `RAPIDAPI_REALTY_BASE_QUERY_KEY` (default: `query`)
- `RAPIDAPI_REALTY_BASE_DETAIL_PATHS` (comma-separated failover paths)
	- default: `/property/v2/detail,/property/detail,/detail`
- `RATE_LIMIT_PROPERTY_INTELLIGENCE_MAX`
- `RATE_LIMIT_PROPERTY_INTELLIGENCE_WINDOW_MS`

### Optional Frontend Variable

- `VITE_API_BASE_URL` (optional): base URL for the proxy endpoint when frontend and API are hosted on different origins.
	- Example: `https://your-app.vercel.app`

## Stripe Connect Escrow (Marketplace)

DealBank now includes authenticated serverless endpoints for Stripe Connect marketplace operations:

- `POST /api/stripe-connect-account-link`: create/reuse Connect account and return onboarding link.
- `POST /api/stripe-escrow-create`: create earnest money PaymentIntent + escrow transaction row.
- `POST /api/stripe-escrow-release`: release funded escrow at close with auto fee split.
- `POST /api/stripe-connect-webhook`: webhook sync for Connect account updates + escrow status events.

Required server env vars:

- `STRIPE_SECRET_KEY`
- `STRIPE_CONNECT_WEBHOOK_SECRET` (or fallback to `STRIPE_WEBHOOK_SECRET`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended frontend env vars:

- `VITE_STRIPE_CONNECT_ACCOUNT_ENDPOINT=/api/stripe-connect-account-link`
- `VITE_STRIPE_ESCROW_CREATE_ENDPOINT=/api/stripe-escrow-create`
- `VITE_STRIPE_ESCROW_RELEASE_ENDPOINT=/api/stripe-escrow-release`

## Supabase Storage Buckets

Required buckets:

- `contracts` (for PDFs and signatures)
- `contractor-photos` (for contractor profile media)

1. Apply the latest SQL migrations in `supabase/migrations/` for bucket creation and policies.
1. Optionally run setup helper:

```bash
npm run storage:setup
```

Required env vars for the setup script:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional bucket overrides:

- `VITE_CONTRACTS_BUCKET`
- `VITE_CONTRACTOR_PHOTOS_BUCKET`

## Mobile (Capacitor)

Capacitor bootstrap is included with push + camera hooks.

Useful scripts:

```bash
npm run mobile:copy
npm run mobile:sync
npm run mobile:open:android
npm run mobile:open:ios
```

Frontend env flags:

- `VITE_CAPACITOR_ENABLED=true`
- `VITE_CAPACITOR_PUSH_ENABLED=true`
- `VITE_CAPACITOR_CAMERA_ENABLED=true`

## Legal Pages

Public legal routes are available in-app:

- Terms of Service (`screen = terms`)
- Privacy Policy (`screen = privacy`)

## Development

```bash
npm install
npm run dev
```

For local Claude proxy testing, run with Vercel runtime (`vercel dev`) so `/api/claude` is available locally.

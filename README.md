# DealBank

DealBank is a React + Vite application for real estate deal analysis, pipeline tracking, and investor workflows.

## Claude API Proxy (Secure Setup)

Anthropic requests are proxied through a Vercel serverless function at `api/claude.js`.
The frontend never calls Anthropic directly.

### Required Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` (server-side only, set in Vercel project settings)
- `ANTHROPIC_MODEL` (optional, defaults to `claude-sonnet-4-20250514`)

### Optional Frontend Variable

- `VITE_API_BASE_URL` (optional): base URL for the proxy endpoint when frontend and API are hosted on different origins.
	- Example: `https://your-app.vercel.app`

## Development

```bash
npm install
npm run dev
```

For local Claude proxy testing, run with Vercel runtime (`vercel dev`) so `/api/claude` is available locally.

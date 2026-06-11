# OPC Dashboard Frontend

Frontend for the OPC dashboard API. It is a Vite + React + TypeScript app with three views:

- `Stats` for memory totals and learning-type breakdowns
- `Knowledge Graph` for Cytoscape-based graph exploration and entity drill-down
- `Search` for archival memory search with optional learning-type filters

## Requirements

- Node.js `^20.19.0 || >=22.12.0`
- npm
- OPC backend running at `http://127.0.0.1:8000` unless you override `VITE_API_BASE`

## Setup

1. Create a local env file from the example:

```bash
cp .env.example .env.local
```

2. Set the backend URL and an API token in `.env.local`:

```dotenv
VITE_API_BASE=http://127.0.0.1:8000
VITE_API_TOKEN=replace-with-dashboard-token
```

3. Install dependencies:

```bash
npm install
```

## Development

Start the dev server:

```bash
npm run dev
```

Open the URL printed by Vite, usually `http://127.0.0.1:5173`.

The header includes a runtime token field. It starts from `VITE_API_TOKEN` and then persists local overrides in `localStorage`, so you can swap tokens without restarting the app.

## Quality Gates

Production build:

```bash
npm run build
```

Type-check only:

```bash
npx tsc --noEmit
```

Test suite:

```bash
npm test
```

## API Expectations

The app talks to these backend routes:

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/stats/memory`
- `GET /api/kg/graph?entity_type=&limit=`
- `GET /api/kg/entities/{uuid}`
- `POST /api/search`

Authenticated routes use bearer auth. If the token is missing or invalid, the UI surfaces the backend message and prompts you to update the header token.

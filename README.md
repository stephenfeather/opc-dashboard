# opc-dashboard

A read-mostly web dashboard for the [OPC memory system][opc] — exposes memory
stats, full-text search over learnings, and an interactive view of the
knowledge graph that OPC builds from your Claude Code sessions.

[opc]: https://github.com/stephenfeather/opc

## What it is

`opc-dashboard` is a thin observability layer on top of OPC's PostgreSQL store
(`continuous_claude`). OPC is the source of truth — it ingests learnings,
extracts entities, builds the knowledge graph, and runs the memory daemon.
This dashboard does **not** write to that data; it provides:

- **Memory stats** — totals, breakdown by `learning_type`, KG entity/edge/mention counts
- **Search** — query over `archival_memory` with optional `learning_type` filters (v1: ILIKE; v2: hybrid RRF + reranker, matching `~/opc/scripts/core/recall_learnings.py`)
- **Knowledge graph** — `/api/kg/graph` returns nodes + edges shaped for [Cytoscape.js][cyto]; `/api/kg/entities/{id}` returns an entity and the memories that mention it
- **Schema version check** — `/api/health/ready` reads `public.settings.schema_version` and reports drift between OPC's schema and what the dashboard expects (degraded mode, not fatal)

[cyto]: https://js.cytoscape.org/

## Repository layout

```
backend/        FastAPI service (Python 3.13+, uv-managed)
  app/          Routers (health, stats, kg, search), config, auth, db pool
  tests/        pytest + pytest-cov, 97%+ line/branch coverage
docker/         Dockerfile + compose for the backend
.githooks/      Pre-commit hook (ruff check/format on Python; tsc on TS)
frontend/       Vite + React + TypeScript + Cytoscape.js (planned)
```

## Relationship to OPC

| Concern | Owner |
|---------|-------|
| Schema migrations, write paths, daemon | [OPC][opc] |
| `archival_memory`, `kg_entities`, `kg_edges`, `kg_entity_mentions`, `settings` | OPC writes; dashboard reads |
| `settings.schema_version` | OPC seeds; dashboard reads + warns on mismatch |
| Embeddings (BGE), reranker, hybrid RRF search | OPC owns the canonical implementation; dashboard ports the query shape |
| Feedback writes (`POST /api/memories/{id}/feedback`) | Dashboard, after OPC's feedback table schema is confirmed |

The dashboard intentionally has **no migrations** of its own — OPC owns the
database. If `settings.schema_version` doesn't match `OPC_SCHEMA_VERSION`, the
backend logs a warning and continues; it does not crash.

## Quick start

### Prerequisites

- Python 3.13+
- [`uv`](https://docs.astral.sh/uv/) for Python dependency management
- A running OPC PostgreSQL instance (default: `localhost:5432/continuous_claude`)

### Backend

```bash
cd backend
uv sync
export DATABASE_URL=postgresql://claude:claude_dev@localhost:5432/continuous_claude
export OPC_DASHBOARD_TOKEN=<some-bearer-token>
uv run uvicorn app.main:app --reload
```

The API is then available at `http://127.0.0.1:8000`. All endpoints under
`/api/{stats,kg,search}` require `Authorization: Bearer $OPC_DASHBOARD_TOKEN`;
`/api/health/{live,ready}` are public.

### Docker

```bash
cd docker
DATABASE_URL=... OPC_DASHBOARD_TOKEN=... docker compose up --build
```

`extra_hosts: host.docker.internal` is wired in so the container can reach a
Postgres running on the host.

## Configuration

Read from environment (or `backend/.env`) via `pydantic-settings`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | *(required)* | OPC Postgres connection string |
| `OPC_DASHBOARD_TOKEN` | *(required)* | Bearer token for authenticated endpoints |
| `OPC_SCHEMA_VERSION` | `1` | Expected value of `settings.schema_version`; mismatch logs a warning |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed origins |
| `HOST` | `127.0.0.1` | Uvicorn bind host |
| `PORT` | `8000` | Uvicorn bind port |

## Development

### Workflow

- **No direct commits to `main`.** Every change goes through a feature branch
  in a worktree under `.worktrees/`, with a PR opened against `main`.
- **Test-first.** Write a failing test before the production code (red →
  green → refactor). See `backend/tests/` for examples.
- **Pre-commit gates.** Activate per clone:

  ```bash
  git config core.hooksPath .githooks
  ```

  The hook runs `ruff check` + `ruff format --check` on staged Python and
  `tsc --noEmit` (project-wide) when `frontend/` exists. Hard-depends on `uv`
  being on `PATH`.

### Tests

```bash
cd backend
uv run pytest tests/ --cov          # full suite with coverage
uv run pytest tests/test_kg.py -v   # one file
```

Coverage floor: 80% (current: ~97%). Tests run against a live OPC database
rather than a testcontainer fixture; this is fine for read-path tests and
will be revisited when write-path endpoints (e.g. feedback) land.

### Linting / formatting

```bash
cd backend
uv run ruff check .
uv run ruff format .
```

## API surface (current)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health/live` | — | Liveness probe |
| GET | `/api/health/ready` | — | Readiness + `settings.schema_version` report |
| GET | `/api/stats/memory` | bearer | Totals, breakdown by learning type, KG counts |
| GET | `/api/kg/graph` | bearer | Top-N entities + edges between them (Cytoscape-shaped); supports `entity_type` and `limit` |
| GET | `/api/kg/entities/{uuid}` | bearer | Entity detail + memory IDs that mention it |
| POST | `/api/search` | bearer | ILIKE search over `archival_memory` (v1 stub) |

## Roadmap

- Replace `/api/search` ILIKE stub with OPC's hybrid RRF + reranker
- Initialize the frontend (Vite + React + TS + Cytoscape.js)
- `POST /api/memories/{id}/feedback` once OPC's feedback schema is finalized
- Bump coverage floor from 80% → 90% as endpoints settle
- Testcontainer fixture for write-path tests

## License

See [LICENSE](./LICENSE).

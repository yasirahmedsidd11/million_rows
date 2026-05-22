# Shipping API

Deployment-ready Node.js Shipping API that serves **paginated**, **searchable** shipping records from a CSV file (no database). Each request opens a read stream and scans the file on disk—by design for load testing and frontend integration exercises.

## Features

- **250,000 rows** by default (configurable via `TOTAL_ROWS`)
- **Pagination** — `page` (1-based), `pageSize` (default `1000`, max `5000`)
- **Search** — case-insensitive `q` matches any column
- **OpenAPI / Swagger** — interactive docs at `/api-docs`
- **CORS** enabled for browser clients
- **Docker Compose** — one command to build, generate CSV, and run

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer  
- [Docker](https://www.docker.com/) (optional, for containerized runs)

## Quick start (local)

```bash
npm install
npm run generate-csv
npm start
```

| Resource | URL (local default) |
|----------|---------------------|
| API | http://localhost:8578 |
| Swagger UI | http://localhost:8578/api-docs |
| OpenAPI JSON | http://localhost:8578/api-docs.json |

The default port is **8578** unless you set `PORT` (Docker uses `3000`—see below).

### Generate the CSV

The script writes [`data/rows.csv`](data/rows.csv) (gitignored). Default size is **250,000** rows (~15–45 seconds depending on disk).

```bash
# Windows PowerShell — smaller file for quick tests
$env:TOTAL_ROWS = "10000"; npm run generate-csv

# Unix
TOTAL_ROWS=10000 npm run generate-csv
```

| Variable | Default | Description |
|----------|---------|-------------|
| `TOTAL_ROWS` | `250000` | Number of data rows to generate |
| `CSV_PATH` | `./data/rows.csv` | Output path (also used by the API when set) |

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (`{ "status": "ok" }`) |
| GET | `/api/rows` | Fixed stats + paginated, searchable shipping records |
| GET | `/api-docs` | Swagger UI |
| GET | `/api-docs.json` | OpenAPI 3.0 JSON |

### `GET /api/rows`

| Query param | Default | Validation |
|-------------|---------|------------|
| `page` | `1` | Positive integer |
| `pageSize` | `1000` | Positive integer, max `5000` |
| `q` | — | Optional; substring match on **all** columns |

**Example requests**

```http
GET /api/rows
GET /api/rows?page=2&pageSize=500
GET /api/rows?q=in_transit&page=1
```

**Success response (200)**

```json
{
  "stats": {
    "total_shipments": 250000,
    "pending": 42000,
    "delivered": 156000,
    "completed": 52000
  },
  "shipping_data": {
    "data": [
      {
        "shipping_id": "SHP-000001",
        "company_name": "Atlas Freight Co",
        "product_category": "electronics",
        "weight": 42.5,
        "route": "New York → Chicago",
        "date": "2026-05-21",
        "status": "pending"
      }
    ],
    "page": 1,
    "pageSize": 1000,
    "total": 250000,
    "totalPages": 250
  }
}
```

`stats` are fixed values (not computed from the CSV). Pagination and search apply only to `shipping_data`.

**Errors**

| Status | When |
|--------|------|
| `400` | Invalid `page` or `pageSize` |
| `503` | CSV file missing — run `npm run generate-csv` or mount/generate data in Docker |
| `500` | Unexpected server error |

### CSV columns

| Column | Type | Notes |
|--------|------|--------|
| `shipping_id` | string | `SHP-000001` … `SHP-{N}` |
| `company_name` | string | Rotating freight company names |
| `product_category` | string | One of 20 product categories |
| `weight` | number | Weight in kg (decimal) |
| `route` | string | Origin → destination route |
| `date` | date | `YYYY-MM-DD`, spread over the past ~2 years |
| `status` | string | e.g. `pending`, `in_transit`, `delivered` |

## Configuration

| Variable | Default (local) | Description |
|----------|-----------------|-------------|
| `PORT` | `8578` | HTTP port |
| `CSV_PATH` | `./data/rows.csv` | Path to the CSV file |
| `DEFAULT_PAGE_SIZE` | `1000` | Default `pageSize` when omitted |
| `MAX_PAGE_SIZE` | `5000` | Upper bound for `pageSize` |
| `TOTAL_ROWS` | `250000` | Rows written by `npm run generate-csv` |
| `GENERATE_CSV` | — | Docker only: set to `1` to regenerate CSV on every container start |

## Docker

The image runs as a **non-root** user, uses **dumb-init** for signal handling, and a Node **entrypoint** that generates `rows.csv` when the file is missing. First boot with 250k rows can take a minute or two before `/health` succeeds.

### Docker Compose (recommended)

Runs **nginx on port 80** in front of the API (no `:3000` in the URL). See [DEPLOY.md](DEPLOY.md) for AWS EC2 steps.

```bash
docker compose up --build
```

| Resource | URL |
|----------|-----|
| API | http://localhost/api/rows |
| Swagger UI | http://localhost/api-docs |
| Health | http://localhost/health |

Override the public HTTP port: `HTTP_PORT=8080 docker compose up` (nginx listens on 8080).

**Compose environment** (edit `docker-compose.yml` as needed):

- `TOTAL_ROWS` — e.g. `10000` for a faster first boot
- `GENERATE_CSV=1` — regenerate CSV on every start (overwrites existing file in the volume)

Data persists in the named volume `csv_data`. To reset the dataset:

```bash
docker compose down -v
docker compose up --build
```

### Docker only

```bash
docker build -t shipping-api .
docker run --rm -p 3000:3000 -v shipping_csv:/app/data shipping-api
```

Mount a host folder that already contains `rows.csv`:

```bash
# Windows
docker run --rm -p 3000:3000 -v "%cd%\data:/app/data" shipping-api

# Unix
docker run --rm -p 3000:3000 -v "$(pwd)/data:/app/data" shipping-api
```

If `rows.csv` already exists in the volume, generation is **skipped** unless `GENERATE_CSV=1`.

## Performance and concurrency

Every `/api/rows` request performs a **full scan** of the CSV to compute `total` and apply search—this is intentional for testing, not production analytics.

- **Single Node process** — requests are not queued in application code; many clients mean many parallel full-file reads.
- **Under load**, latency increases as CPU and disk are shared; the event loop can become busy parsing 250k rows per request.
- **`/health`** stays lightweight but may slow if the process is saturated by `/api/rows` traffic.

## Frontend take-home (optional)

Use this API as a backend for a candidate exercise:

> Build a single-page app that consumes `GET /api/rows` and displays **stats** (`total_shipments`, `pending`, `delivered`, `completed`) plus a **paginated, searchable table** from `shipping_data` (`shipping_id`, `company_name`, `product_category`, `weight`, `route`, `date`, `status`). Support **page navigation**, configurable **page size** (default 1000, max 5000), and a **debounced search** field that sends `q` to the server. Show **loading**, **error**, and **empty** states; display **total** and **current page** from `shipping_data` (`total`, `totalPages`, `page`, `pageSize`). Point the app at a configurable API base URL (e.g. `http://localhost:8578` locally or `http://localhost` in Docker Compose (nginx on port 80)). Any modern framework is fine; bonus for using `/api-docs.json`, accessible table/pagination, and clear setup instructions. No backend changes required.

## Project structure

```
├── data/                 # rows.csv (generated, gitignored)
├── docker/
│   └── entrypoint.js     # CSV generation + start server (Docker)
├── scripts/
│   └── generate-csv.js   # Local CSV generator
├── src/
│   ├── index.js          # Express app and routes
│   ├── config.js         # Environment config
│   ├── csv-service.js    # Stream, search, paginate
│   ├── stats.js          # Fixed shipment stats
│   └── openapi.js        # OpenAPI 3 spec
├── nginx/
│   └── default.conf      # Reverse proxy (port 80 → API :3000)
├── docker-compose.yml
├── Dockerfile
├── DEPLOY.md             # EC2 deployment guide
└── package.json
```

## Development

```bash
npm run dev
```

Uses Node’s `--watch` to restart on file changes.

## License

MIT

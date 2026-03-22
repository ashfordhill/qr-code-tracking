# Technical Specification

## Complexity Assessment: **Hard**

Three distinct systems (Cloudflare Workers + D1, Python/FastAPI Pi service, HTML/JS mobile page) with cross-system integration, hardware I/O (GPIO, Zebra printer), and new infrastructure (Wrangler, D1) not currently in the project.

---

## Technical Context

### Existing Codebase
- `api/` — Python/FastAPI + PostgreSQL backend (older system, keep as-is)
- Docker/Caddy deployment for existing backend
- This task builds a **parallel new MVP** in separate directories

### New System Languages & Dependencies

| Component | Language | Key Dependencies |
|-----------|----------|-----------------|
| `worker/` | TypeScript | Cloudflare Workers, Wrangler CLI, D1 |
| `pi/` | Python 3.9+ | FastAPI, uvicorn, RPi.GPIO, requests, pydantic |
| `web/` | HTML + Vanilla JS | None (no build step) |

---

## Source Code Structure

```
worker/                         # Cloudflare Worker backend
  src/
    index.ts                    # Main router / fetch handler
    slug.ts                     # Slug generation (8-10 chars, [A-Za-z0-9])
    db.ts                       # D1 query helpers
    routes/
      labels.ts                 # POST /api/labels, GET /api/labels/:slug
      resolve.ts                # GET /t/:slug  (HTML response)
  schema.sql                    # D1 table definition
  wrangler.toml                 # Wrangler config (D1 binding, routes)
  tsconfig.json
  package.json

pi/                             # Raspberry Pi service
  main.py                       # FastAPI app, startup, lifespan
  config.py                     # All config constants / env vars
  gps_store.py                  # In-memory GPS state (thread-safe)
  print_flow.py                 # Full print workflow (Steps 1-7)
  zpl.py                        # ZPL string generation from URL
  gpio_handler.py               # GPIO button listener + debounce
  printer.py                    # Raw socket/USB send to Zebra printer
  requirements.txt

web/
  index.html                    # Mobile GPS sender page (self-contained)
```

---

## Data Model

### D1 Table: `labels`

```sql
CREATE TABLE IF NOT EXISTS labels (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  latitude     REAL NOT NULL,
  longitude    REAL NOT NULL,
  created_at   TEXT NOT NULL,
  source       TEXT,
  metadata_json TEXT
);
```

---

## API Contracts

### Worker — POST /api/labels
- **Auth**: `x-api-key` header, stored as CF Worker secret `API_KEY`
- **Request**: `{ latitude, longitude, source? }`
- **Validation**: lat ∈ [-90,90], lon ∈ [-180,180]
- **Response 201**: `{ id, slug, url, createdAt }` where `url = https://mydomain.dev/t/{slug}`
- **Errors**: 400 (invalid), 401 (auth), 500 (DB)

### Worker — GET /t/:slug
- Lookup slug in D1; return HTML info page or 404 HTML

### Worker — GET /api/labels/:slug
- Return `{ id, slug, latitude, longitude, createdAt, source }` JSON or 404

### Pi — POST /gps
- **Request**: `{ latitude, longitude, timestamp? }`
- **Response**: `{ ok: true, storedAt: ISO-8601 }`

### Pi — GET /health
- **Response**: `{ ok: true, hasGps: bool, latestGpsAgeSeconds: number }`

### Pi — POST /print
- Triggers print flow (same as GPIO button)
- **Response**: `{ ok: true }` or error detail

---

## Implementation Approach

### Part 1 — Cloudflare Worker

- Use **Wrangler** to scaffold TypeScript worker project
- Router implemented via `Request.url` pathname matching inside `fetch` handler (no third-party router needed given small route count)
- **Slug generation**: `crypto.getRandomValues` (available in Workers runtime) → map to `[A-Za-z0-9]` charset, 9 chars; retry loop on UNIQUE constraint collision
- **ID**: `crypto.randomUUID()`
- **D1 binding** name: `DB`; configured in `wrangler.toml`
- All responses use `camelCase` JSON keys
- `GET /t/:slug` returns minimal inline HTML (no templating library)
- Worker secret `API_KEY` set via `wrangler secret put API_KEY`

### Part 2 — Raspberry Pi Service

- **FastAPI** (same framework as existing `api/`)
- `config.py` reads all values from environment variables with documented defaults
- `gps_store.py`: simple `dataclass` + `threading.Lock` for thread-safe in-memory store
- `print_flow.py`: single async function with `asyncio.Lock` for concurrency guard; follows 7-step flow exactly as specified
- `gpio_handler.py`: uses `RPi.GPIO` in BCM mode; software debounce via `bouncetime` parameter; calls `asyncio.run_coroutine_threadsafe` to invoke print flow from GPIO callback
- `zpl.py`: pure function `def generate_zpl(url: str) -> str` — generates ZPL with `^BQN` QR command, no external dependency
- `printer.py`: sends raw bytes via TCP socket to printer (`socket.socket`) — printer IP/port configurable; alternative USB path if needed
- Structured logging via Python `logging` with JSON formatter or standard `%(asctime)s [%(levelname)s] %(message)s` format
- Error types logged as distinct string constants: `NO_GPS_AVAILABLE`, `GPS_STALE`, `BACKEND_REQUEST_FAILED`, `BACKEND_INVALID_RESPONSE`, `PRINTER_SEND_FAILED`

### Part 3 — Mobile GPS Page

- Single `web/index.html` file, no build step, no frameworks
- `navigator.geolocation.watchPosition` for continuous updates
- Configurable Pi IP via URL query param (`?pi=192.168.x.x:8000`) with fallback to editable input field
- `fetch` POST to `http://<pi-ip>:8000/gps`
- Status display: current coords, last send time, status badge (sending/success/error)

---

## Verification Approach

### Worker
```bash
cd worker
npm install
npx wrangler dev           # local dev with D1 local emulation
# Test POST /api/labels with curl, GET /t/:slug in browser
npx tsc --noEmit           # type check
```

### Pi Service
```bash
cd pi
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Test POST /gps, GET /health, POST /print with curl
# GPIO and printer require hardware; POST /print endpoint covers non-hardware testing
```

### Mobile Page
- Open `web/index.html` in browser (file://) or serve with `python -m http.server`
- Verify geolocation permission prompt and status updates

---

## Key Decisions

1. **No D1 migrations tool** — single `schema.sql` applied via `wrangler d1 execute` during setup
2. **Printer connection**: TCP socket (most Zebra printers support port 9100); IP/port in config
3. **GPIO mock**: when `RPi.GPIO` import fails (non-Pi environment), log warning and skip GPIO setup — allows running service on non-Pi for testing
4. **No retries**: per spec non-goals, no retry queuing on any step
5. **`web/index.html` Pi IP**: query param `?pi=<host:port>` for easy sharing; also editable in-page input

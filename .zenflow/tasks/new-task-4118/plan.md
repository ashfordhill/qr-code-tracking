# Spec and build

## Configuration
- **Artifacts Path**: `.zenflow/tasks/new-task-4118`

---

## Workflow Steps

### [x] Step: Technical Specification

Assess task difficulty and produce `spec.md` + detailed implementation plan.
- Complexity: **Hard** (3 systems, Cloudflare Workers/D1, GPIO/printer hardware, cross-system integration)
- Spec saved to `.zenflow/tasks/new-task-4118/spec.md`

---

### [x] Step: Project scaffolding and .gitignore
<!-- chat-id: 57b99091-4e85-4187-8c4f-7e746c99d67e -->

- Add `node_modules/`, `dist/`, `.wrangler/`, `*.log`, `.cache/` to `.gitignore`
- Create `worker/` directory with `package.json`, `tsconfig.json`, `wrangler.toml`
- Create `pi/` directory with `requirements.txt`
- Create `web/` directory
- Add `schema.sql` for D1 table definition

---

### [x] Step: Cloudflare Worker — slug, DB helpers, POST /api/labels
<!-- chat-id: 5161f430-f6af-43f2-a760-9d809ddfb7c2 -->

- `worker/src/slug.ts` — slug generation (8–10 chars, [A-Za-z0-9], retry on collision)
- `worker/src/db.ts` — D1 query helper types
- `worker/src/routes/labels.ts` — POST /api/labels with auth, validation, insert, 201 response
- Include unit-testable slug generation logic
- Verify: `npx tsc --noEmit`, `npx wrangler dev` smoke test with curl

---

### [x] Step: Cloudflare Worker — GET /t/:slug and GET /api/labels/:slug
<!-- chat-id: 43a2d907-a315-491e-aae1-547687e58cbc -->

- `worker/src/routes/resolve.ts` — GET /t/:slug returns HTML info page or 404 HTML
- Extend `worker/src/routes/labels.ts` — GET /api/labels/:slug returns JSON
- `worker/src/index.ts` — main fetch handler wiring all routes
- Verify: type check, manual curl/browser test against wrangler dev

---

### [x] Step: Pi Service — core setup, config, GPS store, /gps and /health endpoints
<!-- chat-id: 02244889-8971-48e2-abea-4028bd7925d5 -->

- `pi/config.py` — all config from env vars with defaults (BACKEND_URL, API_KEY, SOURCE_ID, GPS_STALE_THRESHOLD_SECONDS, PI_PORT, GPIO_PIN, PRINTER_HOST, PRINTER_PORT)
- `pi/gps_store.py` — thread-safe in-memory GPS store (dataclass + threading.Lock)
- `pi/main.py` — FastAPI app with POST /gps (store coords) and GET /health
- `pi/requirements.txt` — fastapi, uvicorn, requests, pydantic, RPi.GPIO (optional)
- Verify: `uvicorn main:app --port 8000`, curl POST /gps and GET /health

---

### [x] Step: Pi Service — ZPL generation and printer module
<!-- chat-id: a3a8a9c8-ce5f-4d14-8eca-af80dfd0e1f1 -->

- `pi/zpl.py` — pure `generate_zpl(url: str) -> str` function producing ZPL with ^BQN QR code
- `pi/printer.py` — `send_to_printer(zpl: str)` via TCP socket (configurable host:port)
- Verify: unit test `generate_zpl` output contains correct ZPL commands; printer.py tested with mock socket

---

### [x] Step: Pi Service — print flow, GPIO handler, POST /print endpoint
<!-- chat-id: cce97e38-84a5-46a3-b3b4-e60fa2ad15a1 -->

- `pi/print_flow.py` — 7-step print flow with asyncio.Lock concurrency guard, structured error logging (NO_GPS_AVAILABLE, GPS_STALE, BACKEND_REQUEST_FAILED, BACKEND_INVALID_RESPONSE, PRINTER_SEND_FAILED)
- `pi/gpio_handler.py` — RPi.GPIO setup with bouncetime debounce; graceful fallback if RPi.GPIO unavailable; calls print flow via asyncio
- Extend `pi/main.py` — POST /print endpoint triggering print flow
- Verify: POST /print with curl; check logs for each error case; type/lint checks

---

### [x] Step: Mobile GPS web page
<!-- chat-id: 8e06a554-46ae-49d1-84c3-6037e736e77b -->

- `web/index.html` — self-contained HTML/JS page
  - `navigator.geolocation.watchPosition`
  - Configurable Pi IP via `?pi=<host:port>` query param + in-page input
  - POST `{ latitude, longitude, timestamp }` to Pi /gps
  - Status display: coords, last send time, status badge (sending/success/error)
- Verify: open in browser, check geolocation prompt, verify POST calls in devtools

---

### [x] Step: Final integration check and report
<!-- chat-id: 9dabf6c8-3371-4957-ab36-8b073526112d -->

- Update `.gitignore` with all generated artifact paths
- Verify worker type check and wrangler dev smoke test
- Verify pi service uvicorn startup and all endpoints
- Verify web page in browser
- Write `.zenflow/tasks/new-task-4118/report.md`

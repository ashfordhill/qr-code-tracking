import { Hono } from 'hono'

export type Env = {
  DB: D1Database
  KV: KVNamespace
  API_KEY: string
  BASE_URL: string
  DEFAULT_DEST: string
}

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Print QR Code</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f0f0f;
      color: #f0f0f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 8px; text-align: center; }
    p.sub { color: #888; font-size: 0.9rem; margin-bottom: 32px; text-align: center; }
    #btn {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 20px 40px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      max-width: 320px;
      transition: background 0.2s, opacity 0.2s;
    }
    #btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #btn:not(:disabled):active { background: #1d4ed8; }
    #status {
      margin-top: 24px;
      font-size: 0.95rem;
      text-align: center;
      min-height: 48px;
      max-width: 320px;
      line-height: 1.5;
    }
    .ok { color: #4ade80; }
    .err { color: #f87171; }
    .info { color: #94a3b8; }
    #coords {
      margin-top: 12px;
      font-size: 0.8rem;
      color: #555;
      text-align: center;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h1>Print QR Code</h1>
  <p class="sub">Captures your GPS location and queues a print job on the Pi.</p>
  <button id="btn" onclick="trigger()">Capture Location &amp; Print</button>
  <div id="status" class="info">Ready.</div>
  <div id="coords"></div>
  <script>
    const btn = document.getElementById("btn");
    const status = document.getElementById("status");
    const coordsEl = document.getElementById("coords");
    function setStatus(msg, cls) {
      status.textContent = msg;
      status.className = cls || "info";
    }
    async function trigger() {
      if (!navigator.geolocation) {
        setStatus("Geolocation is not supported by this browser.", "err");
        return;
      }
      btn.disabled = true;
      setStatus("Getting GPS location\u2026", "info");
      coordsEl.textContent = "";
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          coordsEl.textContent = "lat: " + lat.toFixed(6) + ", lon: " + lon.toFixed(6);
          setStatus("Sending to server\u2026", "info");
          try {
            const res = await fetch("/api/trigger", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat, lon }),
            });
            if (!res.ok) {
              setStatus("Server error: " + await res.text(), "err");
              btn.disabled = false;
              return;
            }
            const data = await res.json();
            setStatus("\u2713 Print job queued! ID: " + data.id, "ok");
          } catch (e) {
            setStatus("Network error: " + e.message, "err");
          }
          btn.disabled = false;
        },
        (err) => {
          setStatus("GPS error: " + err.message, "err");
          btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  </script>
</body>
</html>`

const app = new Hono<{ Bindings: Env }>()

function randomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')
}

function generateZpl(url: string): string {
  const qrSize = 8
  const labelWidth = 609
  const xPos = Math.floor((labelWidth - qrSize * 25) / 2)
  return `^XA\n^FO${xPos},50\n^BQN,2,${qrSize}\n^FDQA,${url}^FS\n^XZ`
}

function authCheck(c: { env: Env; req: { header: (k: string) => string | undefined } }): boolean {
  const key = c.env.API_KEY
  return !key || c.req.header('x-api-key') === key
}

app.get('/health', c => c.json({ status: 'ok' }))

app.get('/', c => c.html(INDEX_HTML))

app.post('/api/trigger', async c => {
  const { lat, lon, dest } = await c.req.json<{ lat: number; lon: number; dest?: string }>()
  const id = randomId()
  const finalDest = dest ?? c.env.DEFAULT_DEST ?? 'https://google.com'
  const redirectUrl = `${c.env.BASE_URL}/q/${id}`

  await c.env.DB
    .prepare(`INSERT INTO qr_codes (id, dest, lat, lon, print_status) VALUES (?, ?, ?, ?, 'pending')`)
    .bind(id, finalDest, lat, lon)
    .run()

  return c.json({ id, redirectUrl })
})

app.get('/api/print-jobs/next', async c => {
  if (!authCheck(c)) return c.json({ error: 'unauthorized' }, 401)

  const row = await c.env.DB
    .prepare(`SELECT id, dest, lat, lon FROM qr_codes WHERE print_status = 'pending' ORDER BY created_at ASC LIMIT 1`)
    .first<{ id: string; dest: string; lat: number; lon: number }>()

  if (!row) return c.json({ job: null })

  await c.env.DB
    .prepare(`UPDATE qr_codes SET print_status = 'printing' WHERE id = ?`)
    .bind(row.id)
    .run()

  const redirectUrl = `${c.env.BASE_URL}/q/${row.id}`
  return c.json({
    job: { id: row.id, redirectUrl, lat: row.lat, lon: row.lon, zpl: generateZpl(redirectUrl) }
  })
})

app.post('/api/print-jobs/:id/done', async c => {
  if (!authCheck(c)) return c.json({ error: 'unauthorized' }, 401)

  const result = await c.env.DB
    .prepare(`UPDATE qr_codes SET print_status = 'printed' WHERE id = ? AND print_status = 'printing'`)
    .bind(c.req.param('id'))
    .run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'job not found or not in printing state' }, 404)
  }
  return c.json({ ok: true })
})

app.put('/api/qr', async c => {
  if (!authCheck(c)) return c.json({ error: 'unauthorized' }, 401)

  const body = await c.req.json<{ coords?: { lat: number; lon: number }; dest?: string }>()
  const id = randomId()
  const finalDest = body.dest ?? c.env.DEFAULT_DEST ?? 'https://google.com'
  const lat = body.coords?.lat ?? null
  const lon = body.coords?.lon ?? null
  const redirectUrl = `${c.env.BASE_URL}/q/${id}`

  await c.env.DB
    .prepare(`INSERT INTO qr_codes (id, dest, lat, lon) VALUES (?, ?, ?, ?)`)
    .bind(id, finalDest, lat, lon)
    .run()

  return c.json({ id, redirectUrl, zpl: generateZpl(redirectUrl) })
})

app.get('/api/qr/:id/stats', async c => {
  if (!authCheck(c)) return c.json({ error: 'unauthorized' }, 401)

  const row = await c.env.DB
    .prepare(`SELECT id, dest, lat, lon, created_at, scan_count, last_scanned_at FROM qr_codes WHERE id = ?`)
    .bind(c.req.param('id'))
    .first()

  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})

app.post('/api/qr/bounds', async c => {
  if (!authCheck(c)) return c.json({ error: 'unauthorized' }, 401)

  const { min_lat, min_lon, max_lat, max_lon } = await c.req.json<{
    min_lat: number; min_lon: number; max_lat: number; max_lon: number
  }>()

  const { results } = await c.env.DB
    .prepare(`
      SELECT id, dest, lat, lon, created_at, scan_count, last_scanned_at
      FROM qr_codes
      WHERE lat IS NOT NULL AND lon IS NOT NULL
        AND lat BETWEEN ? AND ?
        AND lon BETWEEN ? AND ?
    `)
    .bind(min_lat, max_lat, min_lon, max_lon)
    .all()

  return c.json({ codes: results, count: results.length })
})

app.get('/q/:id', async c => {
  const id = c.req.param('id')
  const row = await c.env.DB
    .prepare(`SELECT dest FROM qr_codes WHERE id = ?`)
    .bind(id)
    .first<{ dest: string }>()

  if (!row) return c.json({ error: 'not found' }, 404)

  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? ''
  const ipHash = ip ? await sha256(ip) : null
  const ua = c.req.header('user-agent') ?? ''

  await c.env.DB
    .prepare(`UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = datetime('now') WHERE id = ?`)
    .bind(id)
    .run()

  await c.env.DB
    .prepare(`INSERT INTO qr_scans (qr_id, ua, ip_hash) VALUES (?, ?, ?)`)
    .bind(id, ua, ipHash)
    .run()

  return c.redirect(row.dest, 302)
})

export default app

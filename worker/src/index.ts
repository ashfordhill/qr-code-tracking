import { Env } from './db';
import { handleGetLabels, handleGetLabelBySlug, handleGetLabelScans, handlePostLabels } from './routes/labels';
import { handleResolveSlug } from './routes/resolve';
import { handleGetGpsLatest, handlePostGps } from './routes/gps';
import { handlePostTrigger } from './routes/trigger';
import { handleGetNextPrintJob, handleMarkPrintJobDone } from './routes/print_jobs';

const PHONE_UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Print QR Label</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; }
    p.sub { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; text-align: center; }
    button {
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
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    button:not(:disabled):active { background: #1d4ed8; }
    #status {
      margin-top: 1.5rem;
      font-size: 0.95rem;
      text-align: center;
      min-height: 44px;
      max-width: 320px;
      line-height: 1.5;
    }
    .ok { color: #4ade80; }
    .err { color: #f87171; }
    .info { color: #94a3b8; }
    #coords { margin-top: 0.75rem; font-size: 0.8rem; color: #475569; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Print QR Label</h1>
  <p class="sub">Captures your GPS location and queues a print job on the Pi.</p>
  <button id="btn" onclick="trigger()">Capture Location &amp; Print</button>
  <div id="status" class="info">Ready.</div>
  <div id="coords"></div>
  <script>
    const btn = document.getElementById("btn");
    const status = document.getElementById("status");
    const coordsEl = document.getElementById("coords");
    function setStatus(msg, cls) { status.textContent = msg; status.className = cls || "info"; }
    async function trigger() {
      if (!navigator.geolocation) { setStatus("Geolocation not supported.", "err"); return; }
      btn.disabled = true;
      setStatus("Getting GPS\u2026", "info");
      coordsEl.textContent = "";
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          coordsEl.textContent = "lat: " + latitude.toFixed(6) + "  lon: " + longitude.toFixed(6);
          setStatus("Sending\u2026", "info");
          try {
            const res = await fetch("/api/trigger", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude }),
            });
            if (!res.ok) { setStatus("Server error: " + await res.text(), "err"); btn.disabled = false; return; }
            const data = await res.json();
            setStatus("\u2713 Queued! Slug: " + data.slug, "ok");
          } catch (e) {
            setStatus("Network error: " + e.message, "err");
          }
          btn.disabled = false;
        },
        (err) => { setStatus("GPS error: " + err.message, "err"); btn.disabled = false; },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  </script>
</body>
</html>`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) newHeaders.set(k, v);
  return new Response(response.body, { status: response.status, headers: newHeaders });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (method === 'GET' && pathname === '/') {
      return new Response(PHONE_UI_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (method === 'POST' && pathname === '/api/trigger') {
      return withCors(await handlePostTrigger(request, env));
    }

    if (method === 'GET' && pathname === '/api/print-jobs/next') {
      return withCors(await handleGetNextPrintJob(request, env));
    }

    const printJobDoneMatch = pathname.match(/^\/api\/print-jobs\/([A-Za-z0-9]+)\/done$/);
    if (method === 'POST' && printJobDoneMatch) {
      return withCors(await handleMarkPrintJobDone(request, env, printJobDoneMatch[1]));
    }

    if (method === 'POST' && pathname === '/api/gps') {
      return withCors(await handlePostGps(request, env));
    }

    if (method === 'GET' && pathname === '/api/gps/latest') {
      return withCors(await handleGetGpsLatest(request, env));
    }

    if (method === 'GET' && pathname === '/api/labels') {
      return withCors(await handleGetLabels(request, env));
    }

    if (method === 'POST' && pathname === '/api/labels') {
      return withCors(await handlePostLabels(request, env));
    }

    const apiLabelScansMatch = pathname.match(/^\/api\/labels\/([A-Za-z0-9-]+)\/scans$/);
    if (method === 'GET' && apiLabelScansMatch) {
      return withCors(await handleGetLabelScans(request, env, apiLabelScansMatch[1]));
    }

    const apiSlugMatch = pathname.match(/^\/api\/labels\/([A-Za-z0-9]+)$/);
    if (method === 'GET' && apiSlugMatch) {
      return withCors(await handleGetLabelBySlug(request, env, apiSlugMatch[1]));
    }

    const resolveSlugMatch = pathname.match(/^\/t\/([A-Za-z0-9]+)$/);
    if (method === 'GET' && resolveSlugMatch) {
      return handleResolveSlug(request, env, resolveSlugMatch[1]);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

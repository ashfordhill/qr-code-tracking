import { Env } from '../db';

const GPS_KEY = 'latest_gps';

interface GpsEntry {
  latitude: number;
  longitude: number;
  storedAt: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requireApiKey(request: Request, env: Env): Response | null {
  const key = request.headers.get('x-api-key');
  if (!key || key !== env.API_KEY) {
    return json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

export async function handlePostGps(request: Request, env: Env): Promise<Response> {
  const authError = requireApiKey(request, env);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Request body must be a JSON object' }, 400);
  }

  const { latitude, longitude } = body as Record<string, unknown>;

  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return json({ error: 'latitude must be a number between -90 and 90' }, 400);
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return json({ error: 'longitude must be a number between -180 and 180' }, 400);
  }

  const storedAt = new Date().toISOString();
  const entry: GpsEntry = { latitude, longitude, storedAt };

  await env.GPS_KV.put(GPS_KEY, JSON.stringify(entry));

  return json({ ok: true, storedAt });
}

export async function handleGetGpsLatest(request: Request, env: Env): Promise<Response> {
  const authError = requireApiKey(request, env);
  if (authError) return authError;

  const raw = await env.GPS_KV.get(GPS_KEY);
  if (!raw) {
    return json({ error: 'No GPS data available' }, 404);
  }

  const entry: GpsEntry = JSON.parse(raw);
  return json(entry);
}

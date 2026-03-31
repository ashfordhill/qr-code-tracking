import { Env, getLabelBySlug, insertLabel, slugExists } from '../db';
import { generateUniqueSlug } from '../slug';

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

export async function handlePostLabels(request: Request, env: Env): Promise<Response> {
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

  const { latitude, longitude, source, dest } = body as Record<string, unknown>;

  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return json({ error: 'latitude must be a number between -90 and 90' }, 400);
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return json({ error: 'longitude must be a number between -180 and 180' }, 400);
  }
  if (source !== undefined && typeof source !== 'string') {
    return json({ error: 'source must be a string if provided' }, 400);
  }
  if (dest !== undefined && typeof dest !== 'string') {
    return json({ error: 'dest must be a string if provided' }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  let slug: string;
  try {
    slug = await generateUniqueSlug((s) => slugExists(env.DB, s));
  } catch {
    return json({ error: 'Failed to generate unique slug' }, 500);
  }

  try {
    await insertLabel(env.DB, {
      id,
      slug,
      latitude,
      longitude,
      created_at: createdAt,
      source: typeof source === 'string' ? source : null,
      dest: typeof dest === 'string' ? dest : null,
    });
  } catch {
    return json({ error: 'Database error' }, 500);
  }

  const domain = env.DOMAIN ?? 'https://mydomain.dev';
  const url = `${domain}/t/${slug}`;

  return json({ id, slug, url, createdAt }, 201);
}

export async function handleGetLabelBySlug(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  let label;
  try {
    label = await getLabelBySlug(env.DB, slug);
  } catch {
    return json({ error: 'Database error' }, 500);
  }

  if (!label) {
    return json({ error: 'Not found' }, 404);
  }

  return json({
    id: label.id,
    slug: label.slug,
    latitude: label.latitude,
    longitude: label.longitude,
    createdAt: label.created_at,
    source: label.source,
  });
}

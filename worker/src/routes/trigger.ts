import { Env, insertLabelPending } from '../db';
import { generateUniqueSlug } from '../slug';
import { slugExists } from '../db';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handlePostTrigger(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Request body must be a JSON object' }, 400);
  }

  const { latitude, longitude, dest } = body as Record<string, unknown>;

  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return json({ error: 'latitude must be a number between -90 and 90' }, 400);
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return json({ error: 'longitude must be a number between -180 and 180' }, 400);
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
    await insertLabelPending(env.DB, {
      id,
      slug,
      latitude,
      longitude,
      created_at: createdAt,
      source: 'phone',
      dest: typeof dest === 'string' ? dest : null,
    });
  } catch {
    return json({ error: 'Database error' }, 500);
  }

  const domain = env.DOMAIN ?? 'https://ashhill.dev';
  const url = `${domain}/t/${slug}`;

  return json({ id, slug, url }, 201);
}

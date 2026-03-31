import { Env, claimNextPrintJob, markPrintJobDone } from '../db';
import { generateZpl } from '../zpl';

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

export async function handleGetNextPrintJob(request: Request, env: Env): Promise<Response> {
  const authError = requireApiKey(request, env);
  if (authError) return authError;

  let row;
  try {
    row = await claimNextPrintJob(env.DB);
  } catch {
    return json({ error: 'Database error' }, 500);
  }

  if (!row) return json({ job: null });

  const domain = env.DOMAIN ?? 'https://ashhill.dev';
  const url = `${domain}/t/${row.slug}`;

  return json({
    job: {
      id: row.id,
      slug: row.slug,
      url,
      latitude: row.latitude,
      longitude: row.longitude,
      zpl: generateZpl(url),
    },
  });
}

export async function handleMarkPrintJobDone(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const authError = requireApiKey(request, env);
  if (authError) return authError;

  let updated: boolean;
  try {
    updated = await markPrintJobDone(env.DB, slug);
  } catch {
    return json({ error: 'Database error' }, 500);
  }

  if (!updated) {
    return json({ error: 'Job not found or not in printing state' }, 404);
  }

  return json({ ok: true });
}

import { Env, getLabelBySlug } from '../db';

function html(content: string, status = 200): Response {
  return new Response(content, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function handleResolveSlug(
  _request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  let label;
  try {
    label = await getLabelBySlug(env.DB, slug);
  } catch {
    return html(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Error</title></head>
<body><h1>Error</h1><p>Database error. Please try again later.</p></body></html>`,
      500,
    );
  }

  if (!label) {
    return html(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Not Found</title></head>
<body><h1>404 — Not Found</h1><p>No label found for slug <code>${escapeHtml(slug)}</code>.</p></body></html>`,
      404,
    );
  }

  return html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Label: ${escapeHtml(label.slug)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }
    dt { font-weight: bold; margin-top: 1rem; }
    dd { margin: 0.25rem 0 0 0; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Label</h1>
  <dl>
    <dt>Slug</dt>
    <dd>${escapeHtml(label.slug)}</dd>
    <dt>Latitude</dt>
    <dd>${label.latitude}</dd>
    <dt>Longitude</dt>
    <dd>${label.longitude}</dd>
    <dt>Created At</dt>
    <dd>${escapeHtml(label.created_at)}</dd>
  </dl>
</body>
</html>`,
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

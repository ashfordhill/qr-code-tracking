import { Env, recordScan } from '../db';

export async function handleResolveSlug(
  _request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  let dest: string | null;
  try {
    dest = await recordScan(env.DB, slug);
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }

  if (dest === null) {
    return new Response('Not Found', { status: 404 });
  }

  const target = dest || env.DEFAULT_DEST || 'https://google.com';
  return Response.redirect(target, 302);
}

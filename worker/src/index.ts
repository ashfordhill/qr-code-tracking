import { Env } from './db';
import { handleGetLabelBySlug, handlePostLabels } from './routes/labels';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === 'POST' && pathname === '/api/labels') {
      return handlePostLabels(request, env);
    }

    const apiSlugMatch = pathname.match(/^\/api\/labels\/([A-Za-z0-9]+)$/);
    if (method === 'GET' && apiSlugMatch) {
      return handleGetLabelBySlug(request, env, apiSlugMatch[1]);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

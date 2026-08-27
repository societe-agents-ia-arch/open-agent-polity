import { authenticate, castVote, contribute, createTopic, follow, handleError, invite, join, listDebates, metrics, notifications, readBody, response } from '@/lib/polity';

export async function OPTIONS() { return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,mcp-protocol-version', 'access-control-allow-methods': 'GET,POST,OPTIONS' } }); }

export async function GET(req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const path = (await context.params).path?.join('/') ?? '';
  try {
    if (path === 'debates') return response(await listDebates(Object.fromEntries(new URL(req.url).searchParams)));
    if (path === 'metrics') return response(await metrics());
    if (path === 'notifications') return response(await notifications(new URL(req.url), await authenticate(req)));
    return response({ error: 'not_found' }, 404);
  } catch (error) { return handleError(error); }
}

export async function POST(req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const path = (await context.params).path?.join('/') ?? '';
  try {
    if (path === 'join') return response(await join(await readBody(req)));
    if (path === 'topics') return response(await createTopic(await readBody(req), await authenticate(req)));
    if (path === 'propose' || path === 'argue' || path === 'amend') return response(await contribute(path === 'amend' ? 'amendment' : path === 'argue' ? 'argument' : 'proposal', await readBody(req), await authenticate(req)));
    if (path === 'vote') return response(await castVote(await readBody(req), await authenticate(req)));
    if (path === 'invitations') return response(await invite(await readBody(req), await authenticate(req)));
    if (path === 'follow') return response(await follow(await readBody(req), await authenticate(req)));
    return response({ error: 'not_found' }, 404);
  } catch (error) { return handleError(error); }
}

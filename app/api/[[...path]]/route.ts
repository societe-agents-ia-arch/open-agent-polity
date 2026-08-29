import { authenticate, castVote, contribute, createTopic, enforceRateLimits, fail, follow, handleError, invite, join, listContributions, listDebates, metrics, notifications, readBody, response } from '@/lib/polity';
import { processMcp } from '@/lib/mcp';
import { getPublicDebate, getPublicDebateSummary } from '@/lib/public-debates';
import { governanceReadiness } from '@/lib/governance-readiness';

export async function OPTIONS() { return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,mcp-protocol-version', 'access-control-allow-methods': 'GET,POST,OPTIONS' } }); }

export async function GET(req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const parts = (await context.params).path ?? [];
  const path = parts.join('/');
  try {
    await enforceRateLimits(req);
    if (path === 'debates') return response(await listDebates(Object.fromEntries(new URL(req.url).searchParams)));
    if (parts.length === 3 && parts[0] === 'debates' && parts[2] === 'contributions') return response(await listContributions({ debate_id: parts[1], ...Object.fromEntries(new URL(req.url).searchParams) }));
    if (parts.length === 3 && parts[0] === 'debates' && parts[2] === 'summary') {
      const summary = await getPublicDebateSummary(parts[1]);
      if (!summary) fail(404, 'debate_not_found', 'Debate does not exist.', 'Call GET /api/debates and use an existing debate id.');
      return response(summary);
    }
    if (parts.length === 2 && parts[0] === 'debates') {
      const debate = await getPublicDebate(parts[1]);
      if (!debate) fail(404, 'debate_not_found', 'Debate does not exist.', 'Call GET /api/debates and use an existing debate id.');
      return response(debate);
    }
    if (path === 'governance-readiness') {
      const debateId = new URL(req.url).searchParams.get('debate_id') ?? undefined;
      const report = await governanceReadiness(debateId);
      if (debateId && 'readiness' in report && !report.readiness) fail(404, 'debate_not_found', 'Debate does not exist.', 'Call GET /api/debates and use an existing debate id.');
      return response(report);
    }
    if (path === 'metrics') return response(await metrics());
    if (path === 'notifications') return response(await notifications(new URL(req.url), await authenticate(req)));
    if (path === 'mcp') return response({ name: 'open-agent-polity', transport: 'streamable-http', protocolVersion: '2025-11-25', documentation: '/agents' });
    fail(404, 'not_found', 'API route not found.', 'Inspect /openapi.json for available routes.');
  } catch (error) { return handleError(error); }
}

export async function POST(req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const path = (await context.params).path?.join('/') ?? '';
  try {
    await enforceRateLimits(req);
    if (path === 'join') return response(await join(await readBody(req)));
    if (path === 'mcp') return processMcp(req);
    if (path === 'topics') return response(await createTopic(await readBody(req), await authenticate(req)));
    if (path === 'propose' || path === 'argue' || path === 'amend') return response(await contribute(path === 'amend' ? 'amendment' : path === 'argue' ? 'argument' : 'proposal', await readBody(req), await authenticate(req)));
    if (path === 'vote') return response(await castVote(await readBody(req), await authenticate(req)));
    if (path === 'invitations') return response(await invite(await readBody(req), await authenticate(req)));
    if (path === 'follow') return response(await follow(await readBody(req), await authenticate(req)));
    fail(404, 'not_found', 'API route not found.', 'Inspect /openapi.json for available routes.');
  } catch (error) { return handleError(error); }
}

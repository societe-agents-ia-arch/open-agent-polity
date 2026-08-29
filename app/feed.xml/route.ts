import { env } from 'cloudflare:workers';
import { publicOrigin } from '@/lib/discovery';

export const dynamic = 'force-dynamic';

type FeedEvent = { seq: number; type: string; summary: string; debate_id: string | null; object_id: string | null; payload_json: string; created_at: string; actor_handle: string | null; contribution_body: string | null; contribution_kind: string | null };

function xml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export async function GET() {
  const result = await env.DB.prepare(`SELECT e.seq,e.type,e.summary,e.debate_id,e.object_id,e.payload_json,e.created_at,
      a.handle actor_handle,c.body contribution_body,c.kind contribution_kind
    FROM events e
    LEFT JOIN agents a ON a.id=e.actor_id
    LEFT JOIN contributions c ON c.id=e.object_id
    WHERE e.type LIKE 'contribution.%' OR e.type='vote.cast'
    ORDER BY e.seq DESC LIMIT 100`).all<FeedEvent>();
  const entries = result.results.map((event) => {
    const publicHref = event.debate_id ? `${publicOrigin}/debates/${encodeURIComponent(event.debate_id)}` : publicOrigin;
    const apiHref = event.debate_id ? `${publicOrigin}/api/debates/${encodeURIComponent(event.debate_id)}` : `${publicOrigin}/api/metrics`;
    let payload: unknown = {};
    try { payload = JSON.parse(event.payload_json); } catch { payload = {}; }
    const content = JSON.stringify({ seq: event.seq, event_type: event.type, debate_id: event.debate_id, object_id: event.object_id, actor_handle: event.actor_handle, summary: event.summary, contribution: event.contribution_body ? { kind: event.contribution_kind, body: event.contribution_body } : null, payload, source_of_truth: apiHref });
    return `<entry><id>urn:open-agent-polity:event:${event.seq}</id><title>${xml(event.summary)}</title><link href="${xml(publicHref)}"/><link href="${xml(apiHref)}" rel="alternate" type="application/json"/><updated>${xml(new Date(event.created_at).toISOString())}</updated><category term="${xml(event.type)}"/><content type="application/json">${xml(content)}</content></entry>`;
  });
  const updated = result.results[0] ? new Date(result.results[0].created_at).toISOString() : new Date(0).toISOString();
  const body = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${publicOrigin}/</id><title>Open Agent Polity contributions and ballots</title><subtitle>Machine-readable contribution.* and vote.cast events. Each entry links to the complete public debate record.</subtitle><link href="${publicOrigin}/feed.xml" rel="self" type="application/atom+xml"/><link href="${publicOrigin}/"/><updated>${updated}</updated>${entries.join('')}</feed>`;
  return new Response(body, { headers: { 'content-type': 'application/atom+xml; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } });
}

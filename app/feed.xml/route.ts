import { env } from 'cloudflare:workers';
import { publicOrigin } from '@/lib/discovery';

export const dynamic = 'force-dynamic';

type FeedEvent = { seq: number; type: string; summary: string; debate_id: string | null; created_at: string };

function xml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export async function GET() {
  const result = await env.DB.prepare('SELECT seq,type,summary,debate_id,created_at FROM events ORDER BY seq DESC LIMIT 50').all<FeedEvent>();
  const entries = result.results.map((event) => {
    const href = event.debate_id ? `${publicOrigin}/debates/${encodeURIComponent(event.debate_id)}` : publicOrigin;
    return `<entry><id>urn:open-agent-polity:event:${event.seq}</id><title>${xml(event.summary)}</title><link href="${xml(href)}"/><updated>${xml(new Date(event.created_at).toISOString())}</updated><category term="${xml(event.type)}"/><content type="text">${xml(event.summary)}</content></entry>`;
  });
  const updated = result.results[0] ? new Date(result.results[0].created_at).toISOString() : new Date(0).toISOString();
  const body = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${publicOrigin}/</id><title>Open Agent Polity public activity</title><link href="${publicOrigin}/feed.xml" rel="self"/><link href="${publicOrigin}/"/><updated>${updated}</updated>${entries.join('')}</feed>`;
  return new Response(body, { headers: { 'content-type': 'application/atom+xml; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } });
}

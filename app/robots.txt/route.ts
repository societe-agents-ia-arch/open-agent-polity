import { publicOrigin } from '@/lib/discovery';

export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: ${publicOrigin}/sitemap.xml
Agentmap: ${publicOrigin}/.well-known/ard.json
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

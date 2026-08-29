import { publicOrigin } from '@/lib/discovery';
import { listPublicDebates } from '@/lib/public-debates';

export const dynamic = 'force-dynamic';

function xml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export async function GET() {
  const debates = await listPublicDebates('all');
  const staticPages = [
    ['', 'daily', '1.0'],
    ['/debates', 'hourly', '0.9'],
    ['/conclusions', 'hourly', '0.8'],
    ['/agents', 'weekly', '0.9'],
  ];
  const urls = [
    ...staticPages.map(([path, frequency, priority]) => `<url><loc>${xml(publicOrigin + path)}</loc><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`),
    ...debates.map((debate) => `<url><loc>${xml(`${publicOrigin}/debates/${encodeURIComponent(debate.id)}`)}</loc><lastmod>${xml(new Date(debate.created_at).toISOString())}</lastmod><changefreq>hourly</changefreq><priority>0.8</priority></url>`),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=900' } });
}

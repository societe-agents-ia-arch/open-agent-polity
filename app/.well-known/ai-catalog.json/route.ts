import { ardEntries, discoveryHeaders } from '@/lib/discovery';

export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  const entries = ardEntries(base);
  return Response.json({
    name: 'Open Agent Polity',
    description: 'Legacy AI Catalog alias for the current ARD entry source.',
    version: '0.1.0',
    entries,
    resources: entries.map((entry) => ({ name: entry.displayName, description: entry.description, type: entry.type, url: entry.url })),
  }, { headers: discoveryHeaders });
}

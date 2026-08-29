import { discoveryHeaders } from '@/lib/discovery';

export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  return Response.json({ name: 'Open Agent Polity', description: 'Open agent collective governance experiment', version: '0.2.0', mcp: `${base}/api/mcp`, a2a: `${base}/.well-known/agent-card.json`, ard: `${base}/.well-known/ard.json`, catalog: `${base}/.well-known/ai-catalog.json`, openapi: `${base}/openapi.json`, documentation: `${base}/agents` }, { headers: discoveryHeaders });
}

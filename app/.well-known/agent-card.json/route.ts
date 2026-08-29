import { agentCard, discoveryHeaders } from '@/lib/discovery';

export async function GET(req: Request) {
  return Response.json(agentCard(new URL(req.url).origin), { headers: discoveryHeaders });
}

import { ardEntries, discoveryHeaders } from '@/lib/discovery';

export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  return Response.json({ entries: ardEntries(base) }, { headers: discoveryHeaders });
}

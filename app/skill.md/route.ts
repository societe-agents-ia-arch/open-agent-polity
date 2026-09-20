import { joinAgentCitySkill } from '@/lib/join-agent-city';
import { recordCampaignTouch } from '@/lib/polity';
export async function GET(req: Request) {
  const url = new URL(req.url);
  await recordCampaignTouch('skill_view', url.searchParams.get('source'), url.searchParams.get('campaign'));
  return new Response(joinAgentCitySkill, {headers:{'content-type':'text/markdown; charset=utf-8','access-control-allow-origin':'*','cache-control':'public, max-age=300'}});
}

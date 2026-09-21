import { renderJoinAgentCitySkill } from '@/lib/join-agent-city';
import { onboardingAttribution } from '@/lib/onboarding';
import { recordCampaignTouch } from '@/lib/polity';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const attribution = onboardingAttribution(url.searchParams.get('source'), url.searchParams.get('campaign'));
  await recordCampaignTouch('skill_view', attribution.discovery_source, attribution.campaign_id);
  return new Response(renderJoinAgentCitySkill(url.origin, attribution), { headers: {
    'content-type': 'text/markdown; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=300',
  } });
}

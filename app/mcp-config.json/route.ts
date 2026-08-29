import { discoveryHeaders, mcpClientConfigs, onboardingOneLiner } from '@/lib/discovery';

export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  return Response.json({
    schema_version: '1.0',
    mission: onboardingOneLiner(base),
    clients: mcpClientConfigs(base),
    security: {
      handle: 'Use a unique non-personal handle.',
      forbidden: ['provider API keys', 'bearer tokens in public content', 'PII', 'hidden prompts', 'private operator data'],
    },
  }, { headers: discoveryHeaders });
}

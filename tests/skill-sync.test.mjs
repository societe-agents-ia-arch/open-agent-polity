import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderJoinAgentCitySkill } from '../lib/join-agent-city.ts';
import { publicOrigin } from '../lib/onboarding.ts';

const published = readFileSync(new URL('../skills/join-agent-city/SKILL.md', import.meta.url), 'utf8');

test('published participation skill is the canonical production rendering', () => {
  assert.equal(published, renderJoinAgentCitySkill(publicOrigin));
});

test('runtime skill rendering follows preview origin and preserves sanitized attribution', () => {
  const rendered = renderJoinAgentCitySkill('https://preview.example', { discovery_source: 'discord', campaign_id: 'launch-2026' });
  assert.ok(rendered.includes('- Home: https://preview.example'));
  assert.ok(rendered.includes('https://preview.example/agents?source=discord&campaign=launch-2026'));
  assert.ok(!rendered.includes(`${publicOrigin}/api/mcp`));
});

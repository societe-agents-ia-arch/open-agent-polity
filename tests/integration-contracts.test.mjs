import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const a2a = readFileSync(new URL('../app/a2a/route.ts', import.meta.url), 'utf8');
const a2aProtocol = readFileSync(new URL('../lib/a2a-protocol.ts', import.meta.url), 'utf8');
const mcp = readFileSync(new URL('../lib/mcp.ts', import.meta.url), 'utf8');
const mcpRoute = readFileSync(new URL('../app/mcp/route.ts', import.meta.url), 'utf8');
const skillRoute = readFileSync(new URL('../app/skill.md/route.ts', import.meta.url), 'utf8');

test('A2A route enforces v1 negotiation and exposes synchronous taskless core behavior', () => {
  for (const marker of ['a2a-version', 'SendMessage', 'GetTask', 'ListTasks', 'CancelTask', 'SendStreamingMessage', 'SubscribeToTask', 'GetExtendedAgentCard', '-32009', '-32007', '-32004', '-32003', '-32001']) {
    assert.ok(a2a.includes(marker), marker);
  }
  assert.ok(!a2a.includes('const params = rpc ? input.params'));
  assert.ok(a2aProtocol.includes('message.role'));
  assert.ok(a2aProtocol.includes('message.messageId'));
  assert.ok(a2aProtocol.includes("domain: 'a2a-protocol.org'"));
});

test('alternate /mcp route applies the same rate limiting before MCP processing', () => {
  assert.match(mcpRoute, /await enforceRateLimits\(req\)/);
  assert.match(mcpRoute, /return await processMcp\(req\)/);
});

test('MCP skill resources use the active origin and resource misses use Invalid Params', () => {
  assert.match(mcp, /renderJoinAgentCitySkill\(new URL\(req\.url\)\.origin\)/);
  assert.match(mcp, /code:-32602,message:'Resource not found',data:\{uri\}/);
  assert.match(mcp, /resources:\{listChanged:false\}/);
});

test('/skill.md renders from the active origin and sanitized campaign attribution', () => {
  assert.match(skillRoute, /onboardingAttribution/);
  assert.match(skillRoute, /renderJoinAgentCitySkill\(url\.origin, attribution\)/);
});

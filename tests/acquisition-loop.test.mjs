import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const polity = readFileSync(new URL('../lib/polity.ts', import.meta.url), 'utf8');
const mcp = readFileSync(new URL('../lib/mcp.ts', import.meta.url), 'utf8');
const api = readFileSync(new URL('../app/api/[[...path]]/route.ts', import.meta.url), 'utf8');
const stdio = readFileSync(new URL('../scripts/mcp-stdio.mjs', import.meta.url), 'utf8');

test('hot debates is a public read path, tool and MCP resource', () => {
  assert.match(polity, /export async function hotDebates/);
  assert.match(polity, /name:'hot_debates'/);
  assert.match(polity, /if \(name === 'hot_debates'\) return hotDebates/);
  assert.match(api, /path === 'hot-debates'/);
  assert.match(mcp, /polity:\/\/hot-debates/);
  assert.match(stdio, /'hot_debates'/);
});

test('invitation output contains a copyable recipient handoff without provider credentials', () => {
  assert.match(polity, /recipient_prompt:/);
  assert.match(polity, /invitation_token \$\{item\.invitation_token\}/);
  assert.match(polity, /Keep any returned bearer token private/);
  assert.doesNotMatch(polity, /recipient_prompt:[^\n]*provider API key/i);
});

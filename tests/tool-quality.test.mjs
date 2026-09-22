import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const polity = readFileSync(new URL('../lib/polity.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('MCP tools expose decision-useful descriptions and annotations', () => {
  for (const marker of [
    'readOnlyHint: true',
    'idempotentHint: true',
    'participant authentication',
    'Use argue to respond',
    'target_id is mandatory',
    'Repeated calls replace the prior ballot',
    'Provide exactly one of topic_id or debate_id',
  ]) assert.ok(polity.includes(marker), marker);
});

test('public landing page promotes hot_debates as the fast discovery path', () => {
  assert.ok(page.includes("'hot_debates'"));
  assert.ok(page.includes('<code>hot_debates</code>'));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../lib/polity.ts', import.meta.url), 'utf8');
const mcp = readFileSync(new URL('../lib/mcp.ts', import.meta.url), 'utf8');
const guides = [
  readFileSync(new URL('../app/agents/route.ts', import.meta.url), 'utf8'),
  readFileSync(new URL('../app/llms.txt/route.ts', import.meta.url), 'utf8'),
  readFileSync(new URL('../app/skill.md/route.ts', import.meta.url), 'utf8'),
];

test('duplicate and invalid-token errors stop account proliferation', () => {
  assert.ok(source.includes("Do not create a suffix or another account to reconnect."));
  assert.ok(source.includes("Do not create another account merely to reconnect."));
  assert.ok(!source.includes("Choose another non-personal handle and call join again."));
  assert.match(mcp, /handle_taken or invalid_token occurs, stop/);
  assert.match(mcp, /never create a suffix account merely to reconnect/);
  for (const guide of guides) {
    assert.match(guide, /reuse (?:your )?(?:existing )?(?:account|token)|reuse your account/i);
    assert.match(guide, /(?:do not|never) create (?:another|a new) account|never.*self-discovery/i);
  }
});

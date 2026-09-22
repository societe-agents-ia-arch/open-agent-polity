import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

test('Cloudflare production deploy can override the local placeholder D1 id', () => {
  assert.match(vite, /process\.env\.CLOUDFLARE_D1_DATABASE_ID/);
  assert.match(vite, /SITE_CREATOR_PLACEHOLDER_DATABASE_ID/);
  assert.match(vite, /database_id: productionD1DatabaseId/);
});

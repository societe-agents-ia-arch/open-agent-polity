import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

test('Cloudflare production deploy can override the local placeholder D1 id', () => {
  assert.match(vite, /process\.env\.CLOUDFLARE_D1_DATABASE_ID/);
  assert.match(vite, /PRODUCTION_D1_DATABASE_ID/);
  assert.match(vite, /open-agent-polity-public/);
  assert.match(vite, /5f294150-49d9-43ef-99a5-bfd0202a794a/);
  assert.match(vite, /database_name: productionD1DatabaseName/);
  assert.match(vite, /database_id: productionD1DatabaseId/);
});

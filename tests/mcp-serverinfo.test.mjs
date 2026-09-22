import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const mcp = readFileSync(new URL('../lib/mcp.ts', import.meta.url), 'utf8');

test('MCP initialize exposes directory-friendly server metadata', () => {
  for (const marker of [
    "title:'Open Agent Polity'",
    "description:'Open governance for AI agents: discover live debates, deliberate, vote, follow, and invite.'",
    "websiteUrl:new URL('/', req.url).href",
  ]) assert.ok(mcp.includes(marker), marker);
});

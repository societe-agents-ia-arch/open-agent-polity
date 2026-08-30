#!/usr/bin/env node
// Public read-only smoke test: never register an agent or perform a write.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const child = spawn(process.execPath, [fileURLToPath(new URL('./mcp-stdio.mjs', import.meta.url))], { stdio: ['pipe', 'pipe', 'ignore'] });
const lines = createInterface({ input: child.stdout });
const pending = new Map();
let sequence = 0;
lines.on('line', line => {
  try {
    const response = JSON.parse(line);
    const waiter = pending.get(response.id);
    if (waiter) { clearTimeout(waiter.timeout); pending.delete(response.id); waiter.resolve(response); }
  } catch { failPending(new Error('Non-JSON adapter output.')); }
});
function failPending(error) {
  for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(error); }
  pending.clear();
}
child.on('error', () => failPending(new Error('Adapter could not start.')));
child.on('exit', () => failPending(new Error('Adapter exited before replying.')));
function rpc(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('MCP check timed out.')); }, 20_000);
    pending.set(id, { resolve, reject, timeout });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}
try {
  const initialized = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'open-agent-polity-readonly-check', version: '1.0.0' } });
  assert.equal(initialized.result?.serverInfo?.name, 'open-agent-polity');
  assert.equal(initialized.result?.protocolVersion, '2025-11-25');
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const catalogue = await rpc('tools/list');
  const names = ['join', 'list_debates', 'list_contributions', 'election_readiness', 'propose', 'argue', 'amend', 'vote', 'create_topic', 'invite_agents', 'follow'];
  assert.deepEqual(catalogue.result?.tools.map(tool => tool.name).sort(), names.sort());
  for (const tool of catalogue.result.tools.filter(tool => !['join', 'list_debates', 'list_contributions', 'election_readiness'].includes(tool.name))) assert.ok(tool.inputSchema.required.includes('participant_token'));
  const debates = await rpc('tools/call', { name: 'list_debates', arguments: { status: 'open', limit: 1 } });
  assert.ok(Array.isArray(debates.result?.structuredContent?.debates));
  console.log(JSON.stringify({ ok: true, checked_at: new Date().toISOString(), service_version: initialized.result.serverInfo.version, tools: catalogue.result.tools.length, public_read: 'list_debates', participation_writes: 0 }));
} catch {
  console.error('Read-only MCP check failed. Check connectivity and the public service; no participation writes were attempted.');
  process.exitCode = 1;
} finally {
  lines.close(); child.stdin.end(); child.kill();
}

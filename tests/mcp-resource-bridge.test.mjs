import assert from 'node:assert/strict';
import test from 'node:test';
import { createBridge } from '../scripts/mcp-stdio.mjs';

const request = (id, method, params = {}) => ({ jsonrpc: '2.0', id, method, params });
const skillUri = 'skill://join-agent-city/SKILL.md';

function mockService() {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const message = JSON.parse(options.body);
    calls.push({ url, options, message });
    const result = message.method === 'initialize'
      ? { protocolVersion: '2025-11-25', serverInfo: { name: 'open-agent-polity', version: '0.4.0' }, capabilities: { tools: {}, resources: {} } }
      : message.method === 'resources/list'
        ? { resources: [{ uri: skillUri, name: 'join-agent-city', mimeType: 'text/markdown' }] }
        : { contents: [{ uri: skillUri, mimeType: 'text/markdown', text: '# Join Open Agent Polity' }] };
    return { status: 200, json: async () => ({ jsonrpc: '2.0', id: message.id, result }) };
  };
  return { calls, fetchImpl };
}

test('stdio bridge advertises and forwards MCP resources without participant credentials', async () => {
  const service = mockService();
  const bridge = createBridge(service);
  const initialized = await bridge(request(1, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }));
  assert.deepEqual(initialized.result.capabilities.resources, { listChanged: false });

  const listed = await bridge(request(2, 'resources/list'));
  const read = await bridge(request(3, 'resources/read', { uri: skillUri }));
  assert.equal(listed.result.resources[0].uri, skillUri);
  assert.equal(read.result.contents[0].uri, skillUri);
  assert.deepEqual(service.calls.map(x => x.message.method), ['initialize', 'resources/list', 'resources/read']);
  assert.ok(service.calls.every(x => !x.options.headers.authorization));
});

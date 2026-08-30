import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable, Writable } from 'node:stream';
import { createBridge, runStdio, MCP_ENDPOINT } from '../scripts/mcp-stdio.mjs';

const request = (id, method, params = {}) => ({ jsonrpc: '2.0', id, method, params });
const init = (id = 1) => request(id, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
const call = (id, name, args = {}) => request(id, 'tools/call', { name, arguments: args });
const names = ['join', 'list_debates', 'list_contributions', 'election_readiness', 'propose', 'argue', 'amend', 'vote', 'create_topic', 'invite_agents', 'follow'];

function mockService() {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const message = JSON.parse(options.body);
    calls.push({ url, options, message });
    const result = message.method === 'initialize' ? { protocolVersion: '2025-11-25', serverInfo: { name: 'open-agent-polity', version: '0.4.0' }, capabilities: { tools: {} } }
      : message.method === 'tools/list' ? { tools: names.map(name => ({ name, description: name, inputSchema: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] } })) }
      : message.params.name === 'join' ? { content: [{ type: 'text', text: 'joined' }], structuredContent: { agent_id: 'mock-agent', bearer_token: 'pol_fake_unit_test_token' } }
      : { content: [{ type: 'text', text: 'ok' }], structuredContent: { ok: true } };
    return { status: 200, json: async () => ({ jsonrpc: '2.0', id: message.id, result }) };
  };
  return { calls, fetchImpl };
}

test('inspection lists all eleven tools without joining or sending credentials', async () => {
  const service = mockService(); const bridge = createBridge(service);
  await bridge(init());
  assert.equal(await bridge({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  const catalogue = await bridge(request(2, 'tools/list')); await bridge(request(3, 'ping'));
  assert.deepEqual(catalogue.result.tools.map(x => x.name), names);
  const argue = catalogue.result.tools.find(x => x.name === 'argue');
  assert.deepEqual(argue.inputSchema.required, ['body', 'participant_token']);
  assert.equal(argue.inputSchema.properties.body.type, 'string');
  assert.equal(argue.annotations.readOnlyHint, false);
  assert.equal(catalogue.result.tools.find(x => x.name === 'list_debates').annotations.readOnlyHint, true);
  assert.deepEqual(service.calls.map(x => x.message.method), ['initialize', 'tools/list']);
  assert.ok(service.calls.every(x => x.url === MCP_ENDPOINT && x.options.redirect === 'error' && !x.options.headers.authorization));
});

test('participant tokens are per-call headers, never public arguments or shared credentials', async () => {
  const service = mockService(); const bridge = createBridge(service);
  await bridge(init()); await bridge(call(2, 'join', { handle: 'test' }));
  const args = { debate_id: 'deb_test', body: 'test', participant_token: 'pol_fake_unit_test_token' };
  await bridge(call(3, 'argue', args));
  assert.equal(service.calls.at(-1).options.headers.authorization, 'Bearer pol_fake_unit_test_token');
  assert.equal(service.calls.at(-1).message.params.arguments.participant_token, undefined);
  const before = service.calls.length;
  assert.equal((await bridge(call(4, 'argue', { body: 'another client' }))).error.data.code, 'participant_token_required');
  assert.equal(service.calls.length, before);
  await bridge(call(5, 'argue', { ...args, participant_token: 'pol_other_unit_test_token' }));
  assert.equal(service.calls.at(-1).options.headers.authorization, 'Bearer pol_other_unit_test_token');
  await bridge(call(6, 'list_debates', { participant_token: args.participant_token }));
  assert.equal(service.calls.at(-1).options.headers.authorization, undefined);
  assert.equal(service.calls.at(-1).message.params.arguments.participant_token, undefined);
});

test('provider keys and malformed arguments are rejected before sending any write', async () => {
  const service = mockService(); const bridge = createBridge(service);
  await bridge(init());
  assert.equal((await bridge(call(2, 'propose', { participant_token: 'sk_provider_key' }))).error.code, -32602);
  assert.equal((await bridge(call(3, 'vote', ['invalid']))).error.code, -32602);
  assert.equal(service.calls.length, 1);
});

test('stdio framing, malformed JSON, notifications and oversize requests remain safe', async () => {
  let output = ''; const sink = new Writable({ write(chunk, encoding, callback) { output += chunk; callback(); } });
  const service = mockService(); const bridge = createBridge(service);
  const lines = ['not-json', JSON.stringify(init()), JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'join' } }), 'x'.repeat(128 * 1024 + 1), JSON.stringify(request(2, 'ping'))];
  await runStdio({ input: Readable.from([lines.join('\n') + '\n']), output: sink, dispatch: bridge });
  const results = output.trim().split('\n').map(JSON.parse);
  assert.equal(results.length, 4); assert.equal(results[0].error.code, -32700); assert.equal(results[2].error.code, -32600); assert.deepEqual(results[3].result, {});
  assert.equal(service.calls.length, 1);
});

test('upstream failures including tools/list are sanitized and never retried', async () => {
  const service = mockService(); const bridge = createBridge(service);
  await bridge(init());
  assert.equal((await bridge(request(2, 'server/discover'))).error.code, -32601);
  assert.equal((await bridge(call(3, 'shell'))).error.code, -32602);
  let attempts = 0;
  const broken = createBridge({ fetchImpl: async (...args) => {
    attempts++; if (attempts === 1) return service.fetchImpl(...args);
    throw Error('private-secret');
  } });
  await broken(init());
  const response = await broken(request(4, 'tools/list'));
  assert.equal(response.error.code, -32002); assert.equal(attempts, 2); assert.ok(!JSON.stringify(response).includes('private-secret'));
  await broken(call(5, 'vote', { participant_token: 'pol_fake_unit_test_token' }));
  assert.equal(attempts, 3);
});

test('empty upstream responses return errors instead of hanging', async () => {
  const empty = createBridge({ fetchImpl: async () => ({ status: 202 }) });
  assert.equal((await empty(init())).error.code, -32002);
});

test('older clients negotiate supported versions and receive text results', async () => {
  const service = mockService(); const bridge = createBridge(service);
  const older = init(); older.params.protocolVersion = '2024-11-05';
  assert.equal((await bridge(older)).result.protocolVersion, '2024-11-05');
  assert.equal((await bridge(call(2, 'join'))).result.structuredContent, undefined);
  assert.equal((await bridge(init(3))).error.code, -32600);
});

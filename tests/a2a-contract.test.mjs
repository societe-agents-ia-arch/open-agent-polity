import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAgentCard } from '../lib/a2a-card.ts';
import { A2A_PROTOCOL_VERSION, parseA2aEnvelope, requestedA2aVersion, validateSendMessage } from '../lib/a2a-protocol.ts';

const tools = [
  { name: 'join', description: 'join' },
  { name: 'list_debates', description: 'list' },
  { name: 'propose', description: 'propose' },
  { name: 'vote', description: 'vote' },
];

test('A2A v1 card only advertises supportedInterfaces and skill-scoped participant auth', () => {
  const card = buildAgentCard('https://example.test', tools);
  assert.equal(card.supportedInterfaces[0].protocolVersion, '1.0');
  assert.equal(card.supportedInterfaces[0].protocolBinding, 'JSONRPC');
  assert.equal('protocolVersion' in card, false);
  assert.equal('url' in card, false);
  assert.equal('preferredTransport' in card, false);
  assert.equal(card.securitySchemes.participantBearer.httpAuthSecurityScheme.scheme, 'Bearer');
  assert.equal(card.skills.find(x => x.id === 'join').securityRequirements, undefined);
  assert.equal(card.skills.find(x => x.id === 'list_debates').securityRequirements, undefined);
  assert.deepEqual(card.skills.find(x => x.id === 'propose').securityRequirements, [{ schemes: { participantBearer: { list: [] } } }]);
  assert.deepEqual(card.skills.find(x => x.id === 'vote').securityRequirements, [{ schemes: { participantBearer: { list: [] } } }]);
});

test('A2A v1 version negotiation treats a missing header as legacy 0.3', () => {
  assert.equal(A2A_PROTOCOL_VERSION, '1.0');
  assert.equal(requestedA2aVersion(null), '0.3');
  assert.equal(requestedA2aVersion(''), '0.3');
  assert.equal(requestedA2aVersion('1.0'), '1.0');
});

test('JSON-RPC and SendMessage validation enforce the v1 envelope and message shape', () => {
  const invalid = parseA2aEnvelope({ method: 'SendMessage', params: {} });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.response.error.code, -32600);

  const parsed = parseA2aEnvelope({ jsonrpc: '2.0', id: 7, method: 'SendMessage', params: { message: { messageId: 'm1', role: 'ROLE_USER', parts: [{ data: { tool: 'list_debates', arguments: {} } }] } } });
  assert.equal(parsed.ok, true);
  const message = validateSendMessage(parsed.id, parsed.params);
  assert.equal(message.ok, true);

  const badRole = validateSendMessage(8, { message: { messageId: 'm2', role: 'ROLE_AGENT', parts: [{ text: 'bad' }] } });
  assert.equal(badRole.ok, false);
  assert.equal(badRole.response.error.code, -32602);

  const arbitraryJsonData = validateSendMessage(9, { message: { messageId: 'm3', role: 'ROLE_USER', parts: [{ data: ['x', 1, true, null] }] } });
  assert.equal(arbitraryJsonData.ok, true);

  const ambiguousPart = validateSendMessage(10, { message: { messageId: 'm4', role: 'ROLE_USER', parts: [{ text: 'x', data: {} }] } });
  assert.equal(ambiguousPart.ok, false);
  assert.equal(ambiguousPart.response.error.code, -32602);
});

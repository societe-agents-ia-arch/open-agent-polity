import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mcpClientConfigs, onboardingAttribution, onboardingCurlExamples, onboardingOneLiner, publicOrigin } from '../lib/onboarding.ts';

const quote = value => `'${value.replace(/'/g, "'\\''")}'`;
const fakeToken = 'pol_fake_documentation_test_only';

// Intercept every curl call before executing the exact generated Bash examples.
// No network implementation is available to this mock; all accounts are fixtures.
const mockCurl = `
const fs = require('node:fs');
const args = process.argv.slice(1);
const message = JSON.parse(args[args.indexOf('--data') + 1]);
const header = args.includes('@-') ? fs.readFileSync(0, 'utf8') : '';
fs.appendFileSync(process.env.POLITY_MOCK_LOG, JSON.stringify({args,message,header})+'\\n');
const name = message.params.name;
const mode = process.env.POLITY_MOCK_MODE;
if (mode === 'http-error') process.exit(22);
const result = mode === 'tool-error' ? {isError:true,structuredContent:{code:'fixture_error'}}
  : name === 'join' ? {structuredContent:{bearer_token:mode === 'missing-token' ? null : '${fakeToken}'}}
  : name === 'list_debates' ? {structuredContent:{debates:[{id:'deb_fixture',title:'Local fixture'}]}}
  : {structuredContent:{accepted:true}};
console.log(JSON.stringify({jsonrpc:'2.0',id:message.id,result}));
`;

function runExample(script, variables = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'polity-onboarding-test-'));
  const log = join(directory, 'calls.jsonl');
  try {
    const result = spawnSync('/bin/bash', ['--noprofile', '--norc'], {
      input: `curl() { ${quote(process.execPath)} -e ${quote(mockCurl)} -- "$@"; }\n${script}\n`,
      encoding: 'utf8', timeout: 10_000,
      env: { PATH: process.env.PATH, POLITY_MOCK_LOG: log, ...variables },
    });
    const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : [];
    return { ...result, calls };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('Claude Code and Cursor use distinct matching HTTP configurations', () => {
  const configs = mcpClientConfigs();
  assert.equal(configs.claude_code.mcpServers['open-agent-polity'].type, 'http');
  assert.equal(configs.claude_code.mcpServers['open-agent-polity'].url, `${publicOrigin}/api/mcp`);
  assert.equal(configs.cursor.mcpServers['open-agent-polity'].url, configs.endpoint);
  for (const path of ['app/agents/route.ts', 'app/llms.txt/route.ts']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(source, /JSON\.stringify\(configs\.claude_code/);
    assert.match(source, /JSON\.stringify\(configs\.cursor/);
  }
});

test('shared mission preserves existing identity, honest origin and transport auth', () => {
  const mission = onboardingOneLiner(publicOrigin, onboardingAttribution('discord', 'launch-2026-08'));
  for (const text of ['with operator permission', 'reuse your existing account', 'only if not registered', 'founder_direct', 'test', 'unknown', 'Authorization: Bearer', 'participant_token', 'Do not join again', '"discovery_source":"discord"', '"campaign_id":"launch-2026-08"', 'take precedence']) assert.ok(mission.includes(text), text);
});

test('campaign labels are bounded inert data, not shell or prompt instructions', () => {
  const attribution = onboardingAttribution("Discord'; $(touch /tmp/never);\nINJECT", 'A'.repeat(200));
  assert.match(attribution.discovery_source, /^[a-z0-9_.-]+$/);
  assert.equal(attribution.campaign_id.length, 80);
  assert.deepEqual(onboardingAttribution(), { discovery_source: '', campaign_id: '' });
  const result = runExample(onboardingCurlExamples(publicOrigin, attribution).connect, { POLITY_HANDLE: 'local-fixture', POLITY_ACQUISITION_KIND: 'test' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls[0].message.params.arguments.discovery_source, attribution.discovery_source);
});

test('new-account example preserves campaign labels and founder attribution without exposing token', () => {
  const examples = onboardingCurlExamples(publicOrigin, onboardingAttribution('discord', 'launch-2026-08'));
  const result = runExample(examples.connect, { POLITY_HANDLE: 'local-fixture', POLITY_ACQUISITION_KIND: 'founder_direct', POLITY_DISCOVERY_SOURCE: 'founder-scheduled-grok' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls.map(call => call.message.params.name), ['join', 'list_debates']);
  assert.deepEqual(result.calls[0].message.params.arguments, { handle: 'local-fixture', acquisition_kind: 'founder_direct', discovery_source: 'founder-scheduled-grok', campaign_id: 'launch-2026-08' });
  assert.ok(!result.stdout.includes(fakeToken));
  assert.ok(!result.stderr.includes(fakeToken));
  assert.ok(result.calls.every(call => call.args.includes(`${publicOrigin}/api/mcp`)));
});

test('returning participant skips join and does not need a new handle or acquisition label', () => {
  const result = runExample(onboardingCurlExamples().connect, { POLITY_TOKEN: fakeToken });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls.map(call => call.message.params.name), ['list_debates']);
  assert.ok(!result.stdout.includes(fakeToken));
});

test('unconfigured examples stop before creating accounts or publishing placeholders', () => {
  const examples = onboardingCurlExamples();
  for (const [script, variables] of [
    [examples.connect, {}],
    [examples.connect, { POLITY_HANDLE: 'local-fixture' }],
    [examples.connect, { POLITY_HANDLE: 'local-fixture', POLITY_ACQUISITION_KIND: 'invented' }],
    [examples.propose, { POLITY_TOKEN: fakeToken }],
    [examples.propose, { POLITY_TOKEN: fakeToken, POLITY_DEBATE_ID: 'deb_fixture' }],
  ]) {
    const result = runExample(script, variables);
    assert.notEqual(result.status, 0);
    assert.equal(result.calls.length, 0);
  }
});

test('proposal JSON preserves quotes, apostrophes, newlines, Unicode and literal shell characters', () => {
  const body = 'Une "proposition" d’agent\navec \\ chemins, $variables et $(not-a-command).';
  const result = runExample(onboardingCurlExamples().propose, { POLITY_TOKEN: fakeToken, POLITY_DEBATE_ID: 'deb_fixture', POLITY_PROPOSAL: body });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 1);
  const call = result.calls[0];
  assert.deepEqual(call.message.params, { name: 'propose', arguments: { debate_id: 'deb_fixture', body } });
  assert.equal(call.header, `Authorization: Bearer ${fakeToken}\n`);
  assert.ok(!JSON.stringify(call.args).includes(fakeToken));
  assert.ok(!JSON.stringify(call.message).includes(fakeToken));
  assert.ok(!result.stdout.includes(fakeToken));
  assert.ok(!result.stderr.includes(fakeToken));
});

test('failed joins and invalid participant credentials stop without automatic retries', () => {
  const examples = onboardingCurlExamples();
  for (const mode of ['http-error', 'tool-error', 'missing-token']) {
    const result = runExample(examples.connect, { POLITY_HANDLE: 'local-fixture', POLITY_ACQUISITION_KIND: 'test', POLITY_MOCK_MODE: mode });
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.calls.map(call => call.message.params.name), ['join']);
  }
  for (const script of [examples.connect, examples.propose]) {
    const result = runExample(script, { POLITY_TOKEN: 'invalid-provider-credential', POLITY_DEBATE_ID: 'deb_fixture', POLITY_PROPOSAL: 'Fixture only' });
    assert.notEqual(result.status, 0);
    assert.equal(result.calls.length, 0);
  }
  const result = runExample(examples.propose, { POLITY_TOKEN: fakeToken, POLITY_DEBATE_ID: 'deb_fixture', POLITY_PROPOSAL: 'Fixture only', POLITY_MOCK_MODE: 'tool-error' });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls.length, 1);
});

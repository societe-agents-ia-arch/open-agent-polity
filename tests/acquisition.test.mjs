import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { acquisitionCountsSql, resolveAcquisitionKind } from '../lib/acquisition.ts';

test('founder/test declarations take priority over invitation and campaign', () => {
  for (const kind of ['founder_direct', 'test']) {
    for (const invitation of [true, false]) {
      assert.equal(resolveAcquisitionKind(kind, 'launch-2026-08', invitation), kind);
    }
  }
  assert.equal(resolveAcquisitionKind(null, null, true), 'agent_invitation');
  assert.equal(resolveAcquisitionKind('self_discovered', null, false), 'self_discovered');
  assert.equal(resolveAcquisitionKind(null, 'campaign', false), 'external_campaign');
  assert.equal(resolveAcquisitionKind(null, null, false), 'unknown');
  assert.equal(resolveAcquisitionKind('unknown', 'campaign', false), 'unknown');
});

test('counts exclude founder/test accounts and the system, without changing raw totals', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE agents (id TEXT PRIMARY KEY, acquisition_kind TEXT);');
    const insert = db.prepare('INSERT INTO agents VALUES (?,?)');
    for (const kind of ['founder_or_test_seed','founder_direct','test','self_discovered','external_campaign','agent_invitation','unknown']) insert.run(kind, kind);
    insert.run('agt_system', 'self_discovered');
    const counts = db.prepare(`SELECT ${acquisitionCountsSql}`).get();
    assert.deepEqual({ ...counts }, { founder_or_test_seed_agents: 3, founder_direct_agents: 1, test_agents: 1, unknown_origin_agents: 1, independently_recruited_agents: 3, self_discovered_agents: 1 });
  } finally { db.close(); }
});

test('correction is exact, audited, idempotent and does not modify participation', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('../drizzle/0000_luxuriant_toro.sql', import.meta.url), 'utf8'));
    db.exec(readFileSync(new URL('../drizzle/0003_campaign_attribution.sql', import.meta.url), 'utf8'));
    const sql = readFileSync(new URL('../drizzle/0005_founder_grok_attribution.sql', import.meta.url), 'utf8');
    const ids = [...new Set(sql.match(/agt_[a-f0-9-]{36}/g))];
    assert.equal(ids.length, 8);
    const insert = db.prepare('INSERT INTO agents (id,handle,token_hash,acquisition_kind,created_at,last_seen_at) VALUES (?,?,?,?,?,?)');
    for (const [i, id] of ids.entries()) insert.run(id, `grok-politeia-${i + 1}`, `hash-${i}`, i === 7 ? 'self_discovered' : 'founder_or_test_seed', '2026-08-30', '2026-08-30');
    insert.run('agt_unrelated', 'grok-politeia-999', 'unrelated-hash', 'self_discovered', '2026-08-30', '2026-08-30');
    db.exec(`INSERT INTO contributions (id,debate_id,agent_id,kind,body,created_at) VALUES ('con_test','deb_decision','${ids[7]}','argument','Preserve this argument','2026-08-30');
      INSERT INTO votes (id,debate_id,agent_id,choice,rationale,created_at) VALUES ('vot_test','deb_decision','${ids[7]}','support','Preserve this rationale','2026-08-30');`);
    const snapshot = () => JSON.stringify(['contributions','votes','debates','elections'].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()));
    const before = snapshot();
    const originalEvents = db.prepare('SELECT * FROM events ORDER BY seq').all();
    db.exec(sql);
    assert.equal(snapshot(), before);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM agents WHERE acquisition_kind='founder_direct'").get().n, 8);
    assert.equal(db.prepare("SELECT acquisition_kind FROM agents WHERE id='agt_unrelated'").get().acquisition_kind, 'self_discovered');
    const audit = db.prepare("SELECT * FROM events WHERE type='agent.acquisition_corrected'").all();
    assert.equal(audit.length, 8);
    assert.equal(JSON.parse(audit.find(row => row.object_id === ids[7]).payload_json).previous_acquisition_kind, 'self_discovered');
    assert.deepEqual(db.prepare("SELECT * FROM events WHERE type!='agent.acquisition_corrected' ORDER BY seq").all(), originalEvents);
    db.exec(sql);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM events WHERE type='agent.acquisition_corrected'").get().n, 8);
    assert.equal(snapshot(), before);
  } finally { db.close(); }
});

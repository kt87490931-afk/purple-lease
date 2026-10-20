'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { makeEvent, cycle, loadState, TABLES } = require('./openai-conversions-worker');
const now = Date.parse('2026-10-20T08:00:00Z');
function initial() {
  return { started: now - 60000, tables: Object.fromEntries(TABLES.map(t => [t,
    { since: now - 60000, sent: {} }])) };
}
function fixture(rows, status = 200) {
  const calls = [];
  return { calls, fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('bzr.openai.com')) return {
      ok: status === 200, status, text: async () => '{}'
    };
    assert.equal(new URL(url).searchParams.get('select'), 'id,created_at,source_page');
    return { ok: true, json: async () => rows };
  } };
}
const row = { id: 42, created_at: new Date(now - 1000).toISOString() };
function run(state, mock) { return cycle({ state, persist: async () => {},
  ...mock, url: 'https://example.supabase.co', serviceKey: 'test-db',
  conversionKey: 'test-capi', now }); }
test('three tables produce separate IDs identical to browser format; no private fields', () => {
  for (const table of TABLES) {
    const event = makeEvent(table, { ...row, name: 'PRIVATE', phone: 'PRIVATE' });
    assert.equal(event.id, 'purpleauto_lead_' + table + '_42');
    assert.equal(event.type, 'lead_created');
    assert.equal(event.timestamp_ms, now - 1000);
    assert.equal(event.source_url, 'https://purpleauto.co.kr/');
    assert.ok(!JSON.stringify(event).includes('PRIVATE'));
    assert.equal(event.user, undefined);
  }
});
test('invalid and excluded IDs/tables are rejected', () => {
  assert.throws(() => makeEvent('used_car_inquiries', row));
  assert.throws(() => makeEvent('inquiries', { ...row, id: 'fallback_123' }));
  assert.throws(() => makeEvent('inquiries', { ...row, created_at: 'invalid' }));
});
test('success persists and repeat polls do not resend', async () => {
  const state = initial(), mock = fixture([row]);
  await run(state, mock); await run(state, mock);
  assert.equal(mock.calls.filter(c => c.options.method === 'POST').length, 3);
});
test('API failure retries same event ID and original time', async () => {
  const state = initial(), failed = fixture([row], 503);
  await assert.rejects(run(state, failed), /HTTP 503/);
  assert.equal(Object.keys(state.tables.inquiries.sent).length, 0);
  const good = fixture([row]); await run(state, good);
  const body = calls => JSON.parse(calls.find(c => c.options.method === 'POST').options.body);
  assert.deepEqual(body(failed.calls), body(good.calls));
});
test('does not backfill earlier leads or invent events for empty tables', async () => {
  const state = initial(), mock = fixture([{ ...row, created_at: new Date(now - 120000).toISOString() }]);
  await run(state, mock);
  assert.equal(mock.calls.filter(c => c.options.method === 'POST').length, 0);
  const empty = fixture([]); await run(state, empty);
  assert.equal(empty.calls.length, 3);
});
test('database failure cannot advance checkpoint or send', async () => {
  const state = initial(), before = JSON.stringify(state);
  await assert.rejects(run(state, { fetchImpl: async () => ({ ok: false, status: 401 }) }), /HTTP 401/);
  assert.equal(JSON.stringify(state), before);
});
test('checkpoint survives restart; corrupt checkpoint fails closed', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'purple-capi-'));
  try {
    const file = path.join(dir, 'state.json');
    const state = await loadState(file, now);
    assert.equal(state.started, now);
    assert.deepEqual(await loadState(file, now + 1000), state);
    await fs.writeFile(file, 'broken');
    await assert.rejects(loadState(file, now));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

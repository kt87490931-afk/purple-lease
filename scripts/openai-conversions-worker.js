'use strict';

// Server-only. Read just the confirmed record ID/time, never customer details.
const fs = require('node:fs/promises');
const path = require('node:path');
const TABLES = ['inquiries', 'lease_quotes', 'lease_calculator_inquiries'];
const PIXEL = 'KVwjubfqowxNYJRgkGMSKQ';
const DAY = 86400000;

function makeEvent(table, row) {
  const time = Date.parse(row.created_at);
  if (!TABLES.includes(table) || !/^\d+$/.test(String(row.id)) || !Number.isFinite(time)) {
    throw new Error('Invalid saved lead identity');
  }
  return { id: 'purpleauto_lead_' + table + '_' + row.id,
    type: 'lead_created', timestamp_ms: time, action_source: 'web',
    source_url: 'https://purpleauto.co.kr/' + ({ estimate: 'estimate.html',
      'lease-calculator': 'lease-calculator.html', 'paid-transfer': 'paid-transfer.html' }[row.source_page] || ''),
    opt_out: true,
    data: { type: 'customer_action' } };
}

async function saveState(file, state) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file + '.tmp', JSON.stringify(state), { mode: 0o600 });
  await fs.rename(file + '.tmp', file);
}

async function loadState(file, now) {
  try {
    const state = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Number.isFinite(state.started) || !state.tables) throw new Error('Invalid checkpoint');
    for (const table of TABLES) {
      if (!Number.isFinite(state.tables[table]?.since) || !state.tables[table]?.sent) {
        throw new Error('Invalid checkpoint');
      }
    }
    return state;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error; // Never silently reset delivery history.
    const state = { started: now, tables: {} };
    for (const table of TABLES) state.tables[table] = { since: now, sent: {} };
    await saveState(file, state); // Starts now; do not backfill old consultations.
    return state;
  }
}

async function cycle({ state, persist, fetchImpl, url, serviceKey, conversionKey, now = Date.now() }) {
  for (const table of TABLES) {
    const checkpoint = state.tables[table];
    // Re-read a five-minute overlap for commits visible after an earlier query.
    const since = Math.max(state.started, checkpoint.since - 300000, now - 7 * DAY + 60000);
    let offset = 0;
    while (true) {
      const query = new URL(url + '/rest/v1/' + table);
      query.searchParams.set('select', 'id,created_at,source_page');
      query.searchParams.set('created_at', 'gte.' + new Date(since).toISOString());
      query.searchParams.set('order', 'created_at.asc,id.asc');
      query.searchParams.set('limit', '100');
      query.searchParams.set('offset', String(offset));
      const response = await fetchImpl(query, { headers: { apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Lead read HTTP ' + response.status);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length > 100) throw new Error('Invalid lead response');
      for (const row of rows) {
        const event = makeEvent(table, row);
        if (event.timestamp_ms < state.started || checkpoint.sent[event.id]) continue;
        if (event.timestamp_ms > now + 600000 || event.timestamp_ms < now - 7 * DAY) {
          throw new Error('Saved lead timestamp outside delivery window');
        }
        const sent = await fetchImpl('https://bzr.openai.com/v1/events?pid=' + PIXEL, {
          method: 'POST', headers: { Authorization: 'Bearer ' + conversionKey,
            'Content-Type': 'application/json' },
          body: JSON.stringify({ integration_source: 'purpleauto_server', events: [event] }),
          signal: AbortSignal.timeout(15000)
        });
        if (!sent.ok) throw new Error('Conversion delivery HTTP ' + sent.status);
        // Drain response but never log a response that might echo credentials/data.
        await sent.text();
        checkpoint.sent[event.id] = event.timestamp_ms;
        await persist(state); // Retry with the same ID if acknowledgement is lost.
        console.log('[openai-conversions] confirmed lead delivered');
      }
      if (rows.length < 100) break;
      offset += rows.length;
    }
    checkpoint.since = now;
    for (const id of Object.keys(checkpoint.sent)) {
      if (checkpoint.sent[id] < now - 7 * DAY) delete checkpoint.sent[id];
    }
    await persist(state);
  }
}

async function main() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conversionKey = process.env.OPENAI_CONVERSIONS_API_KEY;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !serviceKey || !conversionKey) {
    throw new Error('Server conversion credentials are not configured');
  }
  if (process.argv.includes('--check')) {
    for (const table of TABLES) {
      const result = await fetch(url + '/rest/v1/' + table + '?select=id,created_at,source_page&limit=1', {
        headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
        signal: AbortSignal.timeout(15000)
      });
      if (!result.ok) throw new Error('Lead read preflight failed');
      await result.text();
    }
    const checked = await fetch('https://bzr.openai.com/v1/events?pid=' + PIXEL, {
      method: 'POST', headers: { Authorization: 'Bearer ' + conversionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: true, events: [{ id: 'purpleauto_validation_only',
        type: 'lead_created', timestamp_ms: Date.now(), action_source: 'web',
        source_url: 'https://purpleauto.co.kr/', opt_out: true, data: { type: 'customer_action' } }] }),
      signal: AbortSignal.timeout(15000)
    });
    if (!checked.ok) throw new Error('Conversion validation preflight failed');
    await checked.text();
    console.log('[openai-conversions] database access and API validate_only passed; no conversion recorded');
    return;
  }
  const file = '/var/lib/purple-openai-conversions/state.json';
  const state = await loadState(file, Date.now());
  const persist = value => saveState(file, value);
  for (;;) {
    try { await cycle({ state, persist, fetchImpl: fetch, url, serviceKey, conversionKey }); }
    catch (error) {
      // Status codes only: no private lead data, tokens, URLs, or raw responses.
      console.error('[openai-conversions]', /^.*HTTP \d+$/.test(error.message)
        ? error.message : 'delivery cycle failed; will retry');
    }
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

if (require.main === module) main().catch(() => {
  console.error('[openai-conversions] startup failed; check configuration/checkpoint');
  process.exitCode = 1;
});
module.exports = { makeEvent, cycle, loadState, saveState, TABLES };

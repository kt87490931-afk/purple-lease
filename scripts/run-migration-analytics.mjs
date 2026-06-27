#!/usr/bin/env node
/**
 * supabase/migration-analytics.sql 실행
 * 환경변수: SUPABASE_DB_PASSWORD (필수)
 * MIGRATION_ON_SERVER=1 — DigitalOcean 서버(IPv6 direct DB)에서 실행
 */
'use strict';

import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'zliclwgiaqvilnnookyi';
const password = process.env.SUPABASE_DB_PASSWORD;
const onServer = process.env.MIGRATION_ON_SERVER === '1';
const sqlFile = path.join(__dirname, '..', 'supabase', 'migration-analytics.sql');

if (!password) {
  console.error('[migrate-analytics] SUPABASE_DB_PASSWORD 환경변수가 필요합니다.');
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

async function resolveHost(hostname, ipv4Only) {
  if (!ipv4Only) return hostname;
  const res = await dns.promises.lookup(hostname, { family: 4 });
  console.log('[migrate-analytics] resolved', hostname, '->', res.address);
  return res.address;
}

function buildAttempts(ipv4Only) {
  const directHost = 'db.' + PROJECT_REF + '.supabase.co';
  return [
    { label: onServer ? 'direct-server-ipv6' : 'direct-ipv4', host: directHost, port: 5432, user: 'postgres', ipv4Only: !onServer && ipv4Only },
    { label: 'pooler-seoul-session', host: 'aws-0-ap-northeast-2.pooler.supabase.com', port: 5432, user: 'postgres.' + PROJECT_REF, ipv4Only: true },
    { label: 'pooler-seoul-tx', host: 'aws-0-ap-northeast-2.pooler.supabase.com', port: 6543, user: 'postgres.' + PROJECT_REF, ipv4Only: true }
  ];
}

async function makeClient(cfg) {
  const host = cfg.ipv4Only ? await resolveHost(cfg.host, true) : cfg.host;
  return new pg.Client({
    host,
    port: cfg.port,
    user: cfg.user,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000
  });
}

async function tryConnect(cfg) {
  const client = await makeClient(cfg);
  try {
    await client.connect();
    console.log('[migrate-analytics] connected:', cfg.label, cfg.user + '@' + cfg.host + ':' + cfg.port);
    await client.query(sql);
    const cnt = await client.query('SELECT COUNT(*)::int AS cnt FROM visit_logs');
    const rpc = await client.query("SELECT proname FROM pg_proc WHERE proname LIKE 'get_analytics_%' ORDER BY proname");
    console.log('[migrate-analytics] OK — visit_logs rows:', cnt.rows[0].cnt);
    console.log('[migrate-analytics] OK — RPC:', rpc.rows.map(function (r) { return r.proname; }).join(', '));
    await client.end();
    return true;
  } catch (err) {
    console.warn('[migrate-analytics] skip', cfg.label + ':', err.message);
    try { await client.end(); } catch (e) { /* ignore */ }
    return false;
  }
}

async function main() {
  const attempts = onServer
    ? [{ label: 'direct-server-ipv6', host: 'db.' + PROJECT_REF + '.supabase.co', port: 5432, user: 'postgres', ipv4Only: false }]
    : buildAttempts(true);

  for (var i = 0; i < attempts.length; i++) {
    if (await tryConnect(attempts[i])) return;
  }
  console.error('[migrate-analytics] FAIL: all connection attempts failed');
  process.exit(1);
}

main();

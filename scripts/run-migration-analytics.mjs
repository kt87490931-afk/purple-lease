#!/usr/bin/env node
/**
 * supabase/migration-analytics.sql 실행
 * 환경변수: SUPABASE_DB_PASSWORD (필수)
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
const host = process.env.SUPABASE_DB_HOST || 'aws-0-ap-northeast-2.pooler.supabase.com';
const port = parseInt(process.env.SUPABASE_DB_PORT || '6543', 10);
const user = process.env.SUPABASE_DB_USER || ('postgres.' + PROJECT_REF);
const sqlFile = path.join(__dirname, '..', 'supabase', 'migration-analytics.sql');

if (!password) {
  console.error('[migrate-analytics] SUPABASE_DB_PASSWORD 환경변수가 필요합니다.');
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');
const client = new pg.Client({
  host,
  port,
  user,
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  lookup: function (hostname, options, callback) {
    dns.lookup(hostname, { family: 4, all: false }, callback);
  }
});

async function main() {
  await client.connect();
  console.log('[migrate-analytics] connected:', user + '@' + host + ':' + port);
  await client.query(sql);
  const cnt = await client.query('SELECT COUNT(*)::int AS cnt FROM visit_logs');
  const rpc = await client.query("SELECT proname FROM pg_proc WHERE proname LIKE 'get_analytics_%' ORDER BY proname");
  console.log('[migrate-analytics] OK — visit_logs rows:', cnt.rows[0].cnt);
  console.log('[migrate-analytics] OK — RPC:', rpc.rows.map(function (r) { return r.proname; }).join(', '));
  await client.end();
}

main().catch(function (err) {
  console.error('[migrate-analytics] FAIL:', err.message);
  process.exit(1);
});

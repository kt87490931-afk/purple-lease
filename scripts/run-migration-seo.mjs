#!/usr/bin/env node
/**
 * supabase/migration-seo.sql 실행
 * 환경변수: SUPABASE_DB_PASSWORD (필수)
 * 선택:
 *   SUPABASE_DB_HOST (기본 aws-0-ap-northeast-2.pooler.supabase.com)
 *   SUPABASE_DB_PORT (기본 6543 — pooler transaction mode)
 *   SUPABASE_DB_USER (기본 postgres.zliclwgiaqvilnnookyi)
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
const sqlFile = path.join(__dirname, '..', 'supabase', 'migration-seo.sql');

if (!password) {
  console.error('[migrate-seo] SUPABASE_DB_PASSWORD 환경변수가 필요합니다.');
  console.error('Supabase Dashboard > Project Settings > Database > Database password');
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
  console.log('[migrate-seo] connected:', user + '@' + host + ':' + port);
  await client.query(sql);
  const settings = await client.query('SELECT id, site_name FROM seo_settings WHERE id = 1');
  const pages = await client.query('SELECT COUNT(*)::int AS cnt FROM seo_page_meta');
  console.log('[migrate-seo] OK — seo_settings:', settings.rows[0]);
  console.log('[migrate-seo] OK — seo_page_meta rows:', pages.rows[0].cnt);
  await client.end();
}

main().catch(function (err) {
  console.error('[migrate-seo] FAIL:', err.message);
  process.exit(1);
});

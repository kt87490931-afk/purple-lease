#!/usr/bin/env node
/**
 * supabase/migration-seo.sql 실행
 * 환경변수: SUPABASE_DB_PASSWORD (필수)
 * 선택: SUPABASE_DB_HOST (기본 db.zliclwgiaqvilnnookyi.supabase.co)
 */
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const password = process.env.SUPABASE_DB_PASSWORD;
const host = process.env.SUPABASE_DB_HOST || 'db.zliclwgiaqvilnnookyi.supabase.co';
const sqlFile = path.join(__dirname, '..', 'supabase', 'migration-seo.sql');

if (!password) {
  console.error('[migrate-seo] SUPABASE_DB_PASSWORD 환경변수가 필요합니다.');
  console.error('Supabase Dashboard > Project Settings > Database > Database password');
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');
const client = new pg.Client({
  host,
  port: 5432,
  user: 'postgres',
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('[migrate-seo] connected:', host);
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

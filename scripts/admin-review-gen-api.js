#!/usr/bin/env node
/**
 * 어드민 즉시 AI 후기 생성 API (localhost → nginx /api/admin/generate-customer-review)
 * Gemini 키는 서버 .env.sync 에만 존재. Authorization: Bearer {admin JWT} 필수.
 */
'use strict';

var http = require('http');
var path = require('path');
var Generator = require(path.join(__dirname, '..', 'js', 'customer-review-generator.js'));

var PORT = parseInt(process.env.REVIEW_GEN_API_PORT || '8792', 10) || 8792;
var SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
var SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

function json(res, status, body) {
  var text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('error', reject);
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON body')); }
    });
  });
}

async function verifyAdmin(req) {
  var auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) throw new Error('로그인이 필요합니다.');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('서버 Supabase 설정 누락');

  var token = auth.slice(7);
  var userRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: {
      Authorization: 'Bearer ' + token,
      apikey: SUPABASE_ANON_KEY
    }
  });
  if (!userRes.ok) throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');

  var adminRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/is_purple_admin', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  if (!adminRes.ok) throw new Error('관리자 권한 확인 실패');
  var isAdmin = await adminRes.json();
  if (!isAdmin) throw new Error('관리자 권한이 없습니다.');
}

async function handleStatus() {
  var todayCount = await Generator.getTodayAiCount();
  var dailyMax = Generator.getDailyMax();
  var gate = await Generator.canAutoPublish();
  var lastAt = await Generator.getLastAiPublishedAt();
  return {
    ok: true,
    todayCount: todayCount,
    dailyMax: dailyMax,
    canAutoPublish: gate.ok,
    autoGate: gate,
    lastPublishedAt: lastAt
  };
}

async function handleGenerate(body) {
  var publish = body.publish !== false;
  var dryRun = !!body.dryRun;
  var skipDailyLimit = body.skipDailyLimit !== false;

  var result = await Generator.runOneGeneration({
    topicId: body.topicId ? parseInt(body.topicId, 10) : null,
    toneId: body.toneId || null,
    publish: publish && !dryRun,
    dryRun: dryRun,
    source: 'admin',
    skipDailyLimit: skipDailyLimit
  });

  if (!result.ok) {
    return { ok: false, message: result.msg || '생성 실패' };
  }

  return {
    ok: true,
    message: result.msg,
    title: result.title,
    bodyPreview: String(result.body || '').slice(0, 400),
    charCount: result.charCount,
    elapsedMs: result.elapsedMs,
    listingId: result.listingId,
    topic: result.topic ? { id: result.topic.id, category: result.topic.category } : null,
    tone: result.tone ? { id: result.tone.id, name: result.tone.name } : null,
    todayCount: await Generator.getTodayAiCount(),
    dailyMax: Generator.getDailyMax()
  };
}

var server = http.createServer(function (req, res) {
  var url = req.url || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type'
    });
    res.end();
    return;
  }

  if (url !== '/api/admin/generate-customer-review' && url !== '/api/admin/generate-customer-review/') {
    json(res, 404, { ok: false, message: 'Not found' });
    return;
  }

  (async function () {
    try {
      await verifyAdmin(req);

      if (req.method === 'GET') {
        json(res, 200, await handleStatus());
        return;
      }

      if (req.method !== 'POST') {
        json(res, 405, { ok: false, message: 'Method not allowed' });
        return;
      }

      var body = await readBody(req);
      var out = await handleGenerate(body);
      json(res, out.ok ? 200 : 400, out);
    } catch (e) {
      var msg = e instanceof Error ? e.message : String(e);
      var status = msg.indexOf('로그인') >= 0 || msg.indexOf('인증') >= 0 ? 401 : 403;
      if (msg.indexOf('한도') >= 0) status = 429;
      json(res, status, { ok: false, message: msg });
    }
  })();
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('[review-gen-api] listening on 127.0.0.1:' + PORT);
});

#!/usr/bin/env node
/**
 * Supabase INSERT 웹훅 → 텔레그램 견적문의 알림
 * Telegram Bot 명령: /테스트, /리스트
 * nginx:
 *   /api/webhook/inquiry-telegram → Supabase
 *   /api/webhook/telegram-bot     → Telegram updates
 */
'use strict';

var http = require('http');
var path = require('path');
var crypto = require('crypto');
var Formatter = require(path.join(__dirname, '..', 'js', 'telegram-inquiry-format.js'));
var List = require(path.join(__dirname, '..', 'js', 'telegram-inquiry-list.js'));

var PORT = parseInt(process.env.INQUIRY_TELEGRAM_PORT || '8793', 10) || 8793;
var BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
var CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
var WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
var SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

var ALLOWED_TABLES = {
  inquiries: true,
  lease_quotes: true,
  used_car_inquiries: true,
  lease_calculator_inquiries: true
};

var lastHealth = {
  start_at: new Date().toISOString(),
  last_ok: null,
  last_msg: 'idle',
  last_table: null,
  last_id: null,
  last_error: null,
  sent_count: 0,
  fail_count: 0,
  last_command: null
};

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
    var total = 0;
    req.on('data', function (c) {
      total += c.length;
      if (total > 1024 * 512) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('error', reject);
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON body')); }
    });
  });
}

function timingSafeEqual(a, b) {
  if (!a || !b) return false;
  var ba = Buffer.from(String(a));
  var bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function verifySupabaseSecret(req) {
  if (!WEBHOOK_SECRET) return false;
  var header = req.headers['x-webhook-secret'] || req.headers['x-telegram-webhook-secret'] || '';
  if (timingSafeEqual(header, WEBHOOK_SECRET)) return true;
  var auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ') && timingSafeEqual(auth.slice(7), WEBHOOK_SECRET)) return true;
  return false;
}

function verifyTelegramSecret(req) {
  if (!WEBHOOK_SECRET) return false;
  var tgHeader = req.headers['x-telegram-bot-api-secret-token'] || '';
  if (timingSafeEqual(tgHeader, WEBHOOK_SECRET)) return true;
  return verifySupabaseSecret(req);
}

function chatIdMatch(a, b) {
  return String(a) === String(b);
}

function extractPayload(body) {
  var table = body.table || (body.record && body.record.table) || '';
  var type = String(body.type || body.event || 'INSERT').toUpperCase();
  var record = body.record || body.new || body.data || null;

  if (!table && body.schema && body.payload) {
    table = body.payload.table || '';
    record = body.payload.record || body.payload.new || null;
    type = String(body.payload.type || type).toUpperCase();
  }

  return { table: table, type: type, record: record };
}

async function sendTelegram(text, chatId) {
  var targetChat = chatId != null ? chatId : CHAT_ID;
  if (!BOT_TOKEN || targetChat === '' || targetChat == null) {
    throw new Error('TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 미설정');
  }
  var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
  var res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: targetChat,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok || !data.ok) {
    var migrateId = data.parameters && data.parameters.migrate_to_chat_id;
    if (migrateId != null) {
      console.warn('[inquiry-telegram] chat migrated:', targetChat, '->', migrateId);
      lastHealth.last_error = 'chat_migrated:' + migrateId;
      if (chatId == null) CHAT_ID = String(migrateId);
      return sendTelegram(text, migrateId);
    }
    throw new Error((data.description || 'Telegram API error') + ' (http ' + res.status + ')');
  }
  return data;
}

function parseCommand(text) {
  if (!text || text.charAt(0) !== '/') return null;
  var first = text.trim().split(/\s+/)[0] || '';
  var cmd = first.split('@')[0].toLowerCase();
  if (cmd === '/테스트' || cmd === '/test') return 'test';
  if (cmd === '/리스트' || cmd === '/list') return 'list';
  if (cmd === '/start' || cmd === '/help' || cmd === '/도움말') return 'help';
  return null;
}

async function handleBotCommand(command, chatId) {
  lastHealth.last_command = command;

  if (command === 'test') {
    var msg = List.formatTestMessage({
      hasBot: !!BOT_TOKEN,
      hasChat: !!CHAT_ID,
      chatId: CHAT_ID,
      hasSupabase: !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
    });
    return sendTelegram(msg, chatId);
  }

  if (command === 'list') {
    var listMsg = await List.buildListMessage();
    return sendTelegram(listMsg, chatId);
  }

  if (command === 'help') {
    return sendTelegram(
      '📌 <b>퍼플오토 견적봇 명령어</b>\n\n' +
      '/테스트 — 봇·서버 연결 확인\n' +
      '/리스트 — 최근 견적문의 목록\n' +
      '\n<a href="https://purpleauto.co.kr/admin.html">어드민 견적문의</a>',
      chatId
    );
  }

  return null;
}

async function handleTelegramUpdate(body) {
  var message = body.message || body.edited_message || null;
  if (!message || !message.text) {
    return { ok: true, skipped: true, reason: 'no_text_message' };
  }

  var chatId = message.chat && message.chat.id;
  if (chatId == null) {
    return { ok: true, skipped: true, reason: 'no_chat' };
  }

  if (CHAT_ID && !chatIdMatch(chatId, CHAT_ID)) {
    return { ok: true, skipped: true, reason: 'chat_not_allowed', chat_id: chatId };
  }

  var command = parseCommand(message.text);
  if (!command) {
    return { ok: true, skipped: true, reason: 'not_command' };
  }

  var tg = await handleBotCommand(command, chatId);
  return {
    ok: true,
    command: command,
    chat_id: chatId,
    message_id: tg && tg.result && tg.result.message_id
  };
}

async function handleWebhook(body) {
  var parsed = extractPayload(body);
  if (parsed.type !== 'INSERT') {
    return { ok: true, skipped: true, reason: 'not_insert', type: parsed.type };
  }
  if (!ALLOWED_TABLES[parsed.table]) {
    return { ok: true, skipped: true, reason: 'table_not_allowed', table: parsed.table };
  }
  if (!parsed.record || !parsed.record.id) {
    throw new Error('record.id 없음 — table=' + parsed.table);
  }

  var message = Formatter.formatInquiryTelegramMessage(parsed.table, parsed.record);
  var t0 = Date.now();
  var tg = await sendTelegram(message);
  var elapsed = Date.now() - t0;

  lastHealth.last_ok = 1;
  lastHealth.last_msg = 'sent';
  lastHealth.last_table = parsed.table;
  lastHealth.last_id = parsed.record.id;
  lastHealth.last_error = null;
  lastHealth.sent_count += 1;

  return {
    ok: true,
    table: parsed.table,
    id: parsed.record.id,
    message_id: tg.result && tg.result.message_id,
    response_time_ms: elapsed
  };
}

async function handleTestSend() {
  var sample = {
    id: 0,
    name: '테스트',
    phone: '010-0000-0000',
    brand: '현대',
    usage_method: '리스',
    source_page: 'index',
    created_at: new Date().toISOString()
  };
  var message = Formatter.formatInquiryTelegramMessage('inquiries', sample);
  message = '✅ <b>[연결테스트]</b> 텔레그램 견적문의 알림\n━━━━━━━━━━━━━━\n' +
    message.split('\n').slice(1).join('\n');
  var tg = await sendTelegram(message);
  return { ok: true, message_id: tg.result && tg.result.message_id };
}

var server = http.createServer(function (req, res) {
  var url = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && (url === '/health' || url === '/api/webhook/inquiry-telegram/health')) {
    json(res, 200, {
      ok: true,
      service: 'inquiry-telegram-webhook',
      configured: !!(BOT_TOKEN && CHAT_ID && WEBHOOK_SECRET),
      has_bot: !!BOT_TOKEN,
      has_chat: !!CHAT_ID,
      has_secret: !!WEBHOOK_SECRET,
      has_supabase: !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
      commands: ['/테스트', '/리스트'],
      health: lastHealth
    });
    return;
  }

  if (req.method === 'POST' && (url === '/api/webhook/telegram-bot' || url === '/api/webhook/telegram-bot/')) {
    if (!verifyTelegramSecret(req)) {
      json(res, 401, { ok: false, message: 'Unauthorized' });
      return;
    }
    readBody(req).then(function (body) {
      return handleTelegramUpdate(body);
    }).then(function (result) {
      json(res, 200, result);
    }).catch(function (err) {
      console.error('[inquiry-telegram] bot update:', err);
      json(res, 500, { ok: false, message: err.message || String(err) });
    });
    return;
  }

  if (req.method === 'POST' && (url === '/api/webhook/inquiry-telegram' || url === '/api/webhook/inquiry-telegram/')) {
    if (!verifySupabaseSecret(req)) {
      json(res, 401, { ok: false, message: 'Unauthorized' });
      return;
    }
    readBody(req).then(function (body) {
      return handleWebhook(body);
    }).then(function (result) {
      json(res, 200, result);
    }).catch(function (err) {
      lastHealth.last_ok = 0;
      lastHealth.last_msg = 'error';
      lastHealth.last_error = String(err.message || err);
      lastHealth.fail_count += 1;
      console.error('[inquiry-telegram]', err);
      json(res, 500, { ok: false, message: err.message || String(err) });
    });
    return;
  }

  if (req.method === 'POST' && (url === '/api/webhook/inquiry-telegram/test' || url === '/api/webhook/inquiry-telegram/test/')) {
    if (!verifySupabaseSecret(req)) {
      json(res, 401, { ok: false, message: 'Unauthorized' });
      return;
    }
    handleTestSend().then(function (result) {
      json(res, 200, result);
    }).catch(function (err) {
      json(res, 500, { ok: false, message: err.message || String(err) });
    });
    return;
  }

  json(res, 404, { ok: false, message: 'Not found' });
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('[inquiry-telegram] listening on 127.0.0.1:' + PORT);
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[inquiry-telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 미설정');
  }
  if (!WEBHOOK_SECRET) {
    console.warn('[inquiry-telegram] TELEGRAM_WEBHOOK_SECRET 미설정');
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[inquiry-telegram] SUPABASE 설정 누락 — /리스트 명령 불가');
  }
});

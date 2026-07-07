#!/usr/bin/env node
/**
 * 퍼플오토 고객후기 AI 생성 (Gemini → Supabase)
 *
 * 사용법:
 *   # 연결 테스트 (DB 저장 없음)
 *   GEMINI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/generate-customer-review.js --dry-run --topic-id=28
 *
 *   # 1건 생성 후 게시
 *   node scripts/generate-customer-review.js --publish --topic-id=28
 *
 *   # 어드민 큐 처리
 *   node scripts/generate-customer-review.js --process-queue --limit=1
 *
 *   # 랜덤 주제 1건
 *   node scripts/generate-customer-review.js --publish
 *
 *   # cron 자동 생성 (일 2건·12시간 간격)
 *   node scripts/generate-customer-review.js --auto-publish
 */
'use strict';

var path = require('path');
var Generator = require(path.join(__dirname, '..', 'js', 'customer-review-generator.js'));
var Gemini = require(path.join(__dirname, '..', 'js', 'gemini-customer-review.js'));

var args = process.argv.slice(2);
var dryRun = args.indexOf('--dry-run') >= 0;
var publish = args.indexOf('--publish') >= 0;
var processQueue = args.indexOf('--process-queue') >= 0;
var autoPublish = args.indexOf('--auto-publish') >= 0;
// 플래그 없이 실행 시 dry-run (안전 테스트)
if (!dryRun && !publish && !processQueue && !autoPublish) dryRun = true;
var topicId = null;
var toneId = null;
var limit = 1;
var dailyMax = Generator.getDailyMax();

args.forEach(function (arg) {
  if (arg.indexOf('--topic-id=') === 0) topicId = parseInt(arg.slice(11), 10) || null;
  if (arg.indexOf('--tone-id=') === 0) toneId = arg.slice(10) || null;
  if (arg.indexOf('--limit=') === 0) limit = parseInt(arg.slice(8), 10) || 1;
  if (arg === '--no-publish') publish = false;
});

async function main() {
  console.log('[review-gen] start', new Date().toISOString());
  console.log('[review-gen] model=', Gemini.GEMINI_MODEL);
  console.log('[review-gen] gemini_key=', Gemini.getApiKey() ? 'OK' : 'MISSING');
  console.log('[review-gen] supabase_url=', process.env.SUPABASE_URL ? 'OK' : 'MISSING');

  if (processQueue) {
    var pq = await Generator.processQueue(limit);
    console.log('[review-gen] queue:', JSON.stringify(pq, null, 2));
    process.exit(pq.results.some(function (r) { return r.result && !r.result.ok; }) ? 1 : 0);
    return;
  }

  if (autoPublish) {
    var gate = await Generator.canAutoPublish();
    console.log('[review-gen] auto gate=', JSON.stringify(gate));
    var autoResult = await Generator.runAutoPublish();
    if (!autoResult.ok) {
      console.error('[review-gen] auto SKIP/FAIL:', autoResult.msg);
      process.exit(autoResult.gate && autoResult.gate.reason === 'interval' ? 0 : (autoResult.gate ? 2 : 1));
    }
    console.log('[review-gen] auto OK:', autoResult.msg);
    console.log('[review-gen] listing_id=', autoResult.listingId);
    process.exit(0);
    return;
  }

  if (!dryRun && publish) {
    var todayCount = await Generator.getTodayAiCount();
    console.log('[review-gen] today_ai_count=', todayCount, 'daily_max=', dailyMax);
  }

  var result = await Generator.runOneGeneration({
    topicId: topicId,
    toneId: toneId,
    publish: publish && !dryRun,
    dryRun: dryRun,
    source: 'manual',
    skipDailyLimit: args.indexOf('--skip-daily-limit') >= 0
  });

  if (!result.ok) {
    console.error('[review-gen] FAIL:', result.msg);
    process.exit(1);
  }

  console.log('[review-gen] OK:', result.msg);
  console.log('[review-gen] topic_id=', result.topic && result.topic.id, 'category=', result.topic && result.topic.category);
  console.log('[review-gen] tone=', result.tone && result.tone.name);
  console.log('[review-gen] title=', result.title);
  console.log('[review-gen] char_count=', result.charCount, 'elapsed_ms=', result.elapsedMs);
  if (result.listingId) console.log('[review-gen] listing_id=', result.listingId);

  if (dryRun) {
    console.log('\n--- 본문 미리보기 (처음 500자) ---\n');
    console.log(String(result.body || '').slice(0, 500));
    console.log('\n--- (dry-run: DB 미저장) ---');
  }

  process.exit(0);
}

main().catch(function (e) {
  console.error('[review-gen] fatal:', e.message || e);
  process.exit(1);
});

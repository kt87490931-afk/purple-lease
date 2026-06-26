#!/usr/bin/env node
/**
 * KS오토플랜 → Supabase lease_brands / lease_models 동기화 (크론·CLI)
 *
 * 사용법:
 *   node scripts/sync-ks-lease.js domestic
 *   node scripts/sync-ks-lease.js import
 *   node scripts/sync-ks-lease.js domestic --resume
 *   node scripts/sync-ks-lease.js domestic --brands=303,307
 *   node scripts/sync-ks-lease.js domestic --resume-log=UUID
 *
 * 환경변수:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (또는 SUPABASE_ANON_KEY)
 */
'use strict';

var path = require('path');
var KsLeaseSync = require(path.join(__dirname, '..', 'js', 'ks-lease-sync.js'));
var fetch = global.fetch || require('node-fetch');

var SUPABASE_URL = process.env.SUPABASE_URL || '';
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

var country = process.argv[2] || 'domestic';
var resume = process.argv.indexOf('--resume') >= 0;
var brandIds = [];
var resumeLogId = null;

process.argv.slice(3).forEach(function (arg) {
  if (arg.indexOf('--brands=') === 0) {
    brandIds = arg.slice(9).split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(function (n) { return n > 0; });
  } else if (arg.indexOf('--resume-log=') === 0) {
    resumeLogId = arg.slice(13).trim() || null;
  }
});

if (country !== 'domestic' && country !== 'import') {
  console.error('[ks-lease] country는 domestic 또는 import');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[ks-lease] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

function sbRest(pathSuffix, options) {
  var url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + pathSuffix;
  var headers = Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  }, (options && options.headers) || {});
  return fetch(url, Object.assign({}, options, { headers: headers })).then(async function (res) {
    var text = await res.text();
    var data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (_) { data = text; }
    }
    if (!res.ok) {
      throw new Error('Supabase ' + res.status + ': ' + text);
    }
    return { data: data, error: null, status: res.status };
  });
}

function createDbAdapter() {
  return {
    from: function (table) {
      var filters = [];
      var selectCols = '*';
      var orderSpec = null;
      var limitN = null;
      var maybeSingle = false;

      function buildQuery() {
        var q = table + '?select=' + encodeURIComponent(selectCols);
        filters.forEach(function (f) {
          if (f.op === 'eq') q += '&' + f.col + '=eq.' + encodeURIComponent(f.val);
          if (f.op === 'in') q += '&' + f.col + '=in.(' + f.val.join(',') + ')';
        });
        if (orderSpec) q += '&order=' + orderSpec;
        if (limitN) q += '&limit=' + limitN;
        return q;
      }

      var chain = {
        select: function (cols) {
          selectCols = cols;
          return chain;
        },
        eq: function (col, val) {
          filters.push({ op: 'eq', col: col, val: val });
          return chain;
        },
        in: function (col, vals) {
          filters.push({ op: 'in', col: col, val: vals });
          return chain;
        },
        order: function (col, opts) {
          orderSpec = col + '.' + ((opts && opts.ascending === false) ? 'desc' : 'asc');
          return chain;
        },
        limit: function (n) {
          limitN = n;
          return chain;
        },
        maybeSingle: function () {
          maybeSingle = true;
          limitN = 1;
          return chain.then(function (res) {
            if (res.error) return res;
            var row = Array.isArray(res.data) ? res.data[0] : res.data;
            return { data: row || null, error: null };
          });
        },
        single: function () {
          maybeSingle = true;
          limitN = 1;
          return chain.then(function (res) {
            if (res.error) return res;
            var row = Array.isArray(res.data) ? res.data[0] : res.data;
            if (!row) return { data: null, error: { message: 'no rows' } };
            return { data: row, error: null };
          });
        },
        insert: function (rows) {
          return {
            select: function () {
              return {
                single: function () {
                  return sbRest(table, {
                    method: 'POST',
                    headers: { Prefer: 'return=representation' },
                    body: JSON.stringify(rows)
                  }).then(function (res) {
                    var row = Array.isArray(res.data) ? res.data[0] : res.data;
                    return { data: row, error: null };
                  });
                }
              };
            }
          };
        },
        update: function (patch) {
          return {
            eq: function (col, val) {
              return {
                select: function () {
                  return {
                    single: function () {
                      return sbRest(table + '?' + col + '=eq.' + encodeURIComponent(val), {
                        method: 'PATCH',
                        headers: { Prefer: 'return=representation' },
                        body: JSON.stringify(patch)
                      }).then(function (res) {
                        var row = Array.isArray(res.data) ? res.data[0] : res.data;
                        return { data: row, error: null };
                      });
                    }
                  };
                },
                in: function (col2, vals) {
                  return sbRest(table + '?' + col2 + '=in.(' + vals.join(',') + ')', {
                    method: 'PATCH',
                    headers: { Prefer: 'return=minimal' },
                    body: JSON.stringify(patch)
                  }).then(function (res) { return { data: res.data, error: null }; });
                }
              };
            },
            in: function (col, vals) {
              return sbRest(table + '?' + col + '=in.(' + vals.join(',') + ')', {
                method: 'PATCH',
                headers: { Prefer: 'return=minimal' },
                body: JSON.stringify(patch)
              }).then(function (res) { return { data: res.data, error: null }; });
            }
          };
        },
        then: function (resolve, reject) {
          return sbRest(buildQuery()).then(function (res) {
            return resolve({ data: res.data, error: null });
          }).catch(function (err) {
            if (reject) return reject(err);
            return resolve({ data: null, error: err });
          });
        }
      };
      return chain;
    }
  };
}

async function main() {
  var started = new Date();
  var modeLabel = resumeLogId ? '(resume-log=' + resumeLogId + ')' : (resume ? '(resume)' : (brandIds.length ? '(brands=' + brandIds.join(',') + ')' : '(full)'));
  console.log('[ks-lease] start', country, modeLabel, started.toISOString());

  var db = createDbAdapter();
  var result = await KsLeaseSync.runSync(db, country, {
    resume: resume,
    brandIds: brandIds,
    resumeLogId: resumeLogId,
    onProgress: function (p) {
      if (p.phase === 'model') {
        console.log('[ks-lease]', p.brand, '-', p.name, '(' + p.index + '/' + p.total + ')');
      } else if (p.phase === 'brand') {
        console.log('[ks-lease] brand', p.name, '(' + p.index + '/' + p.total + ')');
      }
    }
  });

  console.log('[ks-lease] done ok=' + result.ok + ' msg=' + result.msg);
  console.log('[ks-lease] stats', JSON.stringify(result.stats));
  if (result.canResume) {
    console.log('[ks-lease] pending brands=' + (result.resumeState.pending_brands || []).length +
      ' models=' + (result.resumeState.pending_models || []).length);
    console.log('[ks-lease] 재실행: node scripts/sync-ks-lease.js ' + country + ' --resume');
  }
}

main().catch(function (err) {
  console.error('[ks-lease] fail', err.message || err);
  process.exit(1);
});

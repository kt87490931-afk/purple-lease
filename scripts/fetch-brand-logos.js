#!/usr/bin/env node
/**
 * KS에서 브랜드 로고 PNG를 1회 다운로드 → assets/brand-logos/ 저장
 * (동기화 시 KS URL을 DB에 넣지 않고, 자체 호스팅 파일만 사용)
 */
'use strict';

var fs = require('fs');
var path = require('path');

var BRANDS = [
  ['현대', 303, 'hyundai'], ['기아', 307, 'kia'], ['제네시스', 304, 'genesis'],
  ['쉐보레', 312, 'chevrolet'], ['르노코리아', 321, 'renault'], ['KGM', 326, 'kgm'],
  ['BMW', 362, 'bmw'], ['벤츠', 349, 'benz'], ['아우디', 371, 'audi'],
  ['폴스타', 458, 'polestar'], ['볼보', 459, 'volvo'], ['폭스바겐', 376, 'vw'],
  ['토요타', 491, 'toyota'], ['렉서스', 486, 'lexus'], ['포드', 569, 'ford'],
  ['미니', 367, 'mini'], ['포르쉐', 381, 'porsche'], ['혼다', 500, 'honda'],
  ['지프', 587, 'jeep'], ['랜드로버', 399, 'landrover'], ['푸조', 413, 'peugeot'],
  ['테슬라', 611, 'tesla'], ['링컨', 573, 'lincoln'], ['캐딜락', 546, 'cadillac'],
  ['마세라티', 445, 'maserati'], ['로터스', 408, 'lotus'], ['BYD', 380, 'byd']
];

var outDir = path.join(__dirname, '..', 'assets', 'brand-logos');
var fetchFn = global.fetch || require('node-fetch');

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  var ok = 0;
  var fail = 0;
  for (var i = 0; i < BRANDS.length; i++) {
    var row = BRANDS[i];
    var name = row[0];
    var ksId = row[1];
    var file = row[2] + '.png';
    var url = 'https://ks-rentcar.com/data/dbrand/e' + ksId + '.png';
    var dest = path.join(outDir, file);
    try {
      var res = await fetchFn(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log('[ok]', name, '->', file, '(' + buf.length + ' bytes)');
      ok++;
    } catch (err) {
      console.error('[fail]', name, url, err.message || err);
      fail++;
    }
  }
  console.log('[done] ok=' + ok + ' fail=' + fail);
  if (fail) process.exit(1);
}

main();

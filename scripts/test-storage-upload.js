#!/usr/bin/env node
'use strict';
var sharp = require('sharp');
var fetch = global.fetch;
var url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
var key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) { console.error('missing env'); process.exit(1); }
(async function () {
  var imgRes = await fetch('https://swautopia.co.kr/uploads/carmanager_331no4605_1782614239672_1.jpg');
  console.log('fetch', imgRes.status);
  var buf = Buffer.from(await imgRes.arrayBuffer());
  var out = await sharp(buf).resize(800, 600, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer();
  var up = await fetch(url + '/storage/v1/object/purple-uploads/usedcars/629/test-thumb.jpg', {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true'
    },
    body: out
  });
  console.log('upload', up.status, (await up.text()).slice(0, 200));
})().catch(function (e) { console.error(e); process.exit(1); });

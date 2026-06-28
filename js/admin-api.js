/**
 * 퍼플리스 어드민 API — Supabase CRUD + Storage 업로드
 */
(function () {
  'use strict';

  function db() {
    var auth = window.PurpleAdminAuth;
    if (!auth || !auth.getClient()) throw new Error('Supabase 미설정');
    return auth.getClient();
  }

  function fmtDate(d) {
    if (!d) return '';
    var p = String(d).split('T')[0].split('-');
    if (p.length < 3) return String(d);
    return p[0] + '.' + p[1] + '.' + p[2];
  }

  function parseDotDate(s) {
    if (!s) return null;
    var p = String(s).trim().replace(/\./g, '-').split('-');
    if (p.length < 3) return null;
    return p[0] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[2]).padStart(2, '0');
  }

  function parseYoutubeVideoId(url) {
    if (!url) return '';
    var s = String(url).trim();
    var m = s.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    return '';
  }

  function youtubeWatchUrl(videoId) {
    return videoId ? 'https://www.youtube.com/watch?v=' + videoId : '';
  }

  function storagePublicUrl(path) {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !path) return path;
    return cfg.url + '/storage/v1/object/public/purple-uploads/' + path.replace(/^\//, '');
  }

  async function uploadImage(file, folder) {
    if (!file) throw new Error('파일을 선택하세요.');
    var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.indexOf(file.type) === -1) throw new Error('jpg, png, webp, gif만 업로드 가능합니다.');
    if (file.size > 5 * 1024 * 1024) throw new Error('파일 크기는 5MB 이하여야 합니다.');

    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var name = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var res = await db().storage.from('purple-uploads').upload(name, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (res.error) throw res.error;
    return storagePublicUrl(name);
  }

  async function uploadBlob(blob, storagePath) {
    if (!blob) throw new Error('업로드할 이미지가 없습니다.');
    var path = String(storagePath).replace(/^\//, '');
    var res = await db().storage.from('purple-uploads').upload(path, blob, {
      cacheControl: '86400',
      upsert: true,
      contentType: 'image/jpeg'
    });
    if (res.error) throw res.error;
    return storagePublicUrl(path);
  }

  function isPurpleStoredCarPhoto(url) {
    return String(url || '').indexOf('/purple-uploads/usedcars/') >= 0;
  }

  var MAX_PHOTOS_PER_CAR = 20;

  async function processSwautopiaRowPhotos(row, onPhotoProgress, shouldCancel) {
    var PI = window.PurpleImage;
    if (!PI) return row;

    var photos = (row.detail_json && row.detail_json.photos) || [];
    if (!photos.length) return row;

    var listingId = row.listing_id;
    var limited = photos.slice(0, MAX_PHOTOS_PER_CAR);
    var out = [];
    var allHosted = limited.every(isPurpleStoredCarPhoto);

    if (allHosted) {
      row.detail_json.photos = limited;
      row.thumb_url = limited[0];
      row.photo_count = limited.length;
      return row;
    }

    for (var i = 0; i < limited.length; i++) {
      if (shouldCancel && shouldCancel()) throw new Error('사용자 중지');
      var src = limited[i];
      if (onPhotoProgress) {
        onPhotoProgress({ listingId: listingId, name: row.name, photoIndex: i + 1, photoTotal: limited.length });
      }

      if (isPurpleStoredCarPhoto(src)) {
        out.push(src);
        if (i === 0) row.thumb_url = src;
        continue;
      }

      try {
        var fetchUrl = src;
        if (window.SwautopiaSync && window.SwautopiaSync.toProxyUrl) {
          fetchUrl = window.SwautopiaSync.toProxyUrl(src);
        }
        if (i === 0 && PI.resizeUrlToBlobs) {
          var blobs = await PI.resizeUrlToBlobs(fetchUrl, { gallery: PI.SIZES.GALLERY, thumb: PI.SIZES.THUMB });
          var galleryUrl = await uploadBlob(blobs.gallery, 'usedcars/' + listingId + '/0.jpg');
          var thumbUrl = await uploadBlob(blobs.thumb, 'usedcars/' + listingId + '/thumb.jpg');
          out.push(galleryUrl);
          row.thumb_url = thumbUrl;
        } else {
          var blob = await PI.resizeUrlToBlob(fetchUrl, PI.SIZES.GALLERY.w, PI.SIZES.GALLERY.h);
          var url = await uploadBlob(blob, 'usedcars/' + listingId + '/' + i + '.jpg');
          out.push(url);
          if (i === 0 && !row.thumb_url) row.thumb_url = url;
        }
      } catch (e) {
        console.warn('[swautopia] photo resize skip', listingId, i, e.message || e);
        out.push(src);
        if (i === 0 && !row.thumb_url) row.thumb_url = src;
      }
    }

    row.detail_json.photos = out;
    row.thumb_url = row.thumb_url || out[0] || '';
    row.photo_count = out.length;
    return row;
  }

  /* ---------- YouTube ---------- */
  var CHANNEL_HANDLE = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.youtubeChannelHandle) || 'purplelease';

  function mapYoutubeAdminRow(r) {
    var vid = r.video_id;
    var thumb = (window.YoutubeUtils && window.YoutubeUtils.resolveThumb)
      ? window.YoutubeUtils.resolveThumb(vid, r.thumb_url)
      : (r.thumb_url || '');
    return {
      id: r.id,
      videoId: vid,
      title: r.title,
      url: r.external_url || youtubeWatchUrl(vid),
      thumb: thumb,
      duration: r.duration,
      date: fmtDate(r.published_at || r.created_at),
      isHomeMain: !!r.is_home_main,
      isHomeFeatured: !!r.is_home_featured
    };
  }

  async function listYoutube() {
    var res = await db().from('youtube_videos').select('*').order('sort_order', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapYoutubeAdminRow);
  }

  async function setYoutubeHomeMain(id) {
    var clear = await db().from('youtube_videos').update({ is_home_main: false }).eq('is_home_main', true);
    if (clear.error) throw clear.error;
    var set = await db().from('youtube_videos').update({ is_home_main: true }).eq('id', id);
    if (set.error) throw set.error;
  }

  async function setYoutubeHomeFeatured(id, featured) {
    var res = await db().from('youtube_videos').update({ is_home_featured: !!featured }).eq('id', id);
    if (res.error) throw res.error;
  }

  async function youtubeApiFetch(path, params) {
    var cfg = window.SUPABASE_CONFIG || {};
    var key = cfg.youtubeApiKey;
    if (!key) throw new Error('NO_API_KEY');
    var qs = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') qs.set(k, params[k]);
    });
    qs.set('key', key);
    var res = await fetch('https://www.googleapis.com/youtube/v3/' + path + '?' + qs.toString());
    var json = await res.json();
    if (!res.ok) throw new Error((json.error && json.error.message) ? json.error.message : 'YouTube API 오류');
    return json;
  }

  async function syncYoutubeChannel() {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.youtubeApiKey) {
      try {
        var fn = await db().functions.invoke('youtube-sync', { body: { handle: CHANNEL_HANDLE } });
        if (fn.error) throw fn.error;
        return fn.data || { count: 0 };
      } catch (e) {
        throw new Error('채널 동기화를 위해 js/supabase-config.js 의 youtubeApiKey 에 YouTube Data API 키를 넣어 주세요.');
      }
    }

    var ch = await youtubeApiFetch('channels', { part: 'contentDetails,snippet', forHandle: CHANNEL_HANDLE });
    var channel = ch.items && ch.items[0];
    if (!channel) throw new Error('채널을 찾을 수 없습니다: @' + CHANNEL_HANDLE);
    var uploadsId = channel.contentDetails.relatedPlaylists.uploads;

    var videoIds = [];
    var pageToken = '';
    do {
      var plParams = { part: 'snippet,contentDetails', playlistId: uploadsId, maxResults: '50' };
      if (pageToken) plParams.pageToken = pageToken;
      var pl = await youtubeApiFetch('playlistItems', plParams);
      (pl.items || []).forEach(function (item) {
        if (item.contentDetails && item.contentDetails.videoId) {
          videoIds.push(item.contentDetails.videoId);
        }
      });
      pageToken = pl.nextPageToken || '';
    } while (pageToken);

    var details = {};
    for (var i = 0; i < videoIds.length; i += 50) {
      var batch = videoIds.slice(i, i + 50).join(',');
      var v = await youtubeApiFetch('videos', { part: 'contentDetails,snippet', id: batch });
      (v.items || []).forEach(function (item) {
        details[item.id] = item;
      });
    }

    var existingRes = await db().from('youtube_videos').select('video_id,is_home_main,is_home_featured');
    if (existingRes.error) throw existingRes.error;
    var flagMap = {};
    (existingRes.data || []).forEach(function (r) {
      flagMap[r.video_id] = { main: r.is_home_main, featured: r.is_home_featured };
    });

    var upserted = 0;
    for (var idx = 0; idx < videoIds.length; idx++) {
      var vid = videoIds[idx];
      var item = details[vid];
      if (!item) continue;
      var sn = item.snippet || {};
      var flags = flagMap[vid] || {};
      var row = {
        video_id: vid,
        title: sn.title || '',
        description: (sn.description || '').slice(0, 500),
        external_url: youtubeWatchUrl(vid),
        duration: (window.YoutubeUtils && window.YoutubeUtils.formatIsoDuration)
          ? window.YoutubeUtils.formatIsoDuration(item.contentDetails.duration)
          : '',
        published_at: sn.publishedAt ? sn.publishedAt.split('T')[0] : null,
        thumb_url: '',
        is_active: true,
        sort_order: videoIds.length - idx,
        is_home_main: !!flags.main,
        is_home_featured: !!flags.featured
      };
      var ups = await db().from('youtube_videos').upsert(row, { onConflict: 'video_id' });
      if (ups.error) throw ups.error;
      upserted++;
    }
    return { count: upserted };
  }

  async function saveYoutube(payload, editingId) {
    var videoId = parseYoutubeVideoId(payload.url);
    if (!payload.title || !videoId) throw new Error('제목과 유효한 유튜브 URL이 필요합니다.');
    var row = {
      title: payload.title,
      video_id: videoId,
      external_url: payload.url,
      thumb_url: payload.thumb || '',
      duration: payload.duration || '',
      published_at: parseDotDate(payload.date),
      is_active: true
    };
    if (editingId) {
      var up = await db().from('youtube_videos').update(row).eq('id', editingId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    row.sort_order = Date.now() % 100000;
    var ins = await db().from('youtube_videos').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deleteYoutube(id) {
    var res = await db().from('youtube_videos').delete().eq('id', id);
    if (res.error) throw res.error;
  }

  /* ---------- Blog ---------- */
  async function listBlog() {
    var res = await db().from('blog_posts').select('*').order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.id,
        title: r.title,
        url: r.external_url,
        thumb: r.thumb_url,
        date: fmtDate(r.published_at),
        viewCount: r.view_count || 0
      };
    });
  }

  async function saveBlog(payload, editingId) {
    if (!payload.title || !payload.url) throw new Error('제목과 URL은 필수입니다.');
    var row = {
      title: payload.title,
      external_url: payload.url,
      thumb_url: payload.thumb || '',
      excerpt: payload.title,
      published_at: parseDotDate(payload.date),
      view_count: parseInt(payload.viewCount, 10) || 0,
      is_active: true
    };
    if (editingId) {
      var up = await db().from('blog_posts').update(row).eq('id', editingId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    row.sort_order = Date.now() % 100000;
    var ins = await db().from('blog_posts').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function patchBlogMeta(id, payload) {
    if (!id) throw new Error('글 ID가 필요합니다.');
    var row = {
      published_at: parseDotDate(payload.date),
      view_count: parseInt(payload.viewCount, 10) || 0
    };
    var up = await db().from('blog_posts').update(row).eq('id', id).select().single();
    if (up.error) throw up.error;
    return up.data;
  }

  async function deleteBlog(id) {
    var res = await db().from('blog_posts').delete().eq('id', id);
    if (res.error) throw res.error;
  }

  /* ---------- Customer Reviews ---------- */
  async function listReviews() {
    var res = await db().from('customer_reviews').select('*').order('sort_order', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.listing_id,
        title: r.title,
        body: r.body,
        date: fmtDate(r.published_at),
        views: r.views || 0
      };
    });
  }

  async function saveReview(payload, editingId) {
    if (!payload.title) throw new Error('제목은 필수입니다.');
    var row = {
      title: payload.title,
      body: payload.body || '',
      published_at: parseDotDate(payload.date) || new Date().toISOString().slice(0, 10),
      is_active: true
    };
    if (editingId) {
      var up = await db().from('customer_reviews').update(row).eq('listing_id', editingId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    var maxRes = await db().from('customer_reviews').select('listing_id').order('listing_id', { ascending: false }).limit(1);
    var nextId = (maxRes.data && maxRes.data[0]) ? maxRes.data[0].listing_id + 1 : 1;
    row.listing_id = nextId;
    row.views = 0;
    row.author = '퍼플리스 고객';
    row.sort_order = nextId;
    var ins = await db().from('customer_reviews').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deleteReview(listingId) {
    var res = await db().from('customer_reviews').delete().eq('listing_id', listingId);
    if (res.error) throw res.error;
  }

  /* ---------- Parts ---------- */
  async function getNextPartListingId() {
    var maxRes = await db().from('parts').select('listing_id').order('listing_id', { ascending: false }).limit(1);
    return (maxRes.data && maxRes.data[0]) ? maxRes.data[0].listing_id + 1 : 1;
  }

  async function uploadPartPhotoFiles(listingId, files, startIndex) {
    if (!files || !files.length) return [];
    var PI = window.PurpleImage;
    if (!PI) throw new Error('PurpleImage 모듈이 로드되지 않았습니다.');
    var out = [];
    var start = startIndex || 0;
    for (var i = 0; i < files.length; i++) {
      var idx = start + i;
      var img = await PI.loadFileAsImage(files[i]);
      var galleryBlob = await PI.resizeImageToBlob(img, PI.SIZES.GALLERY.w, PI.SIZES.GALLERY.h);
      var url = await uploadBlob(galleryBlob, 'parts/' + listingId + '/' + idx + '.jpg');
      if (idx === 0) {
        var thumbBlob = await PI.resizeImageToBlob(img, PI.SIZES.THUMB.w, PI.SIZES.THUMB.h);
        await uploadBlob(thumbBlob, 'parts/' + listingId + '/thumb.jpg');
      }
      out.push(url);
    }
    return out;
  }

  async function listParts() {
    var res = await db().from('parts').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    var norm = window.PurplePartUtils && window.PurplePartUtils.normalizePartRow;
    return (res.data || []).map(function (r) {
      var p = norm ? norm(r) : r;
      return {
        id: p.id || r.listing_id,
        brand: p.brand || r.brand,
        category: p.category || r.category,
        name: p.name || r.name,
        price: p.price != null ? p.price : r.price,
        stock: p.stock || r.stock,
        thumb: p.thumb || r.thumb_url,
        compatible: p.compatible || '',
        maker: p.maker || '',
        description: p.description || '',
        photos: p.photos || [],
        tags: p.tags || []
      };
    });
  }

  async function savePart(payload, editingId) {
    if (!payload.name || isNaN(payload.price)) throw new Error('부품명과 가격은 필수입니다.');

    var Tags = window.PurplePartUtils;
    var listingId = editingId || payload.listingId || await getNextPartListingId();
    var photos = (payload.photos || []).filter(Boolean);

    if (payload.photoFiles && payload.photoFiles.length) {
      var uploaded = await uploadPartPhotoFiles(listingId, payload.photoFiles, photos.length);
      photos = photos.concat(uploaded);
    }

    var row = {
      listing_id: listingId,
      brand: payload.brand,
      category: payload.category || '',
      name: payload.name,
      price: payload.price,
      stock: payload.stock || '재고있음',
      thumb_url: photos[0] || payload.thumb || '',
      tags: Tags ? Tags.parseTagsInput(payload.tags) : (payload.tags || []),
      detail_json: {
        compatible: payload.compatible || '',
        maker: payload.maker || '',
        description: payload.description || '',
        photos: photos
      },
      is_active: true
    };

    if (editingId) {
      delete row.listing_id;
      var up = await db().from('parts').update(row).eq('listing_id', editingId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }

    row.sort_order = listingId;
    var ins = await db().from('parts').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deletePart(listingId) {
    var res = await db().from('parts').delete().eq('listing_id', listingId);
    if (res.error) throw res.error;
  }

  /* ---------- Used Cars ---------- */
  function isAdminHiddenCar(row) {
    return !!(row && row.detail_json && row.detail_json.admin_hidden);
  }

  async function listUsedcars() {
    var res = await db().from('used_cars').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      var f = (window.PurpleUsedCarFilters && window.PurpleUsedCarFilters.normalizeFilterFields)
        ? window.PurpleUsedCarFilters.normalizeFilterFields(r)
        : { brand: r.brand || '', fuel: r.fuel || '', segment: r.segment || '', origin: r.origin || 'domestic' };
      return {
        id: r.listing_id || r.id,
        name: r.name,
        year: r.year,
        mileage: r.mileage || 0,
        price: r.price_num || 0,
        status: r.status || '판매중',
        thumb: r.thumb_url || '',
        syncSource: r.sync_source || '',
        brand: f.brand,
        fuel: f.fuel,
        segment: f.segment,
        origin: f.origin
      };
    });
  }

  async function findUsedCarRow(carId) {
    if (carId == null || carId === '') return null;
    var res = await db().from('used_cars')
      .select('id,listing_id,sync_source,detail_json,detail_slug')
      .or('listing_id.eq.' + carId + ',id.eq.' + carId)
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data || null;
  }

  async function saveUsedcar(payload, editingId) {
    if (!payload.name || isNaN(payload.year) || isNaN(payload.price)) {
      throw new Error('차량명, 연식, 가격은 필수입니다.');
    }

    var Filters = window.PurpleUsedCarFilters;
    var origin = payload.origin || 'domestic';
    var brand = String(payload.brand || '').trim();
    var fuel = String(payload.fuel || '').trim();
    var segment = String(payload.segment || '').trim();
    if (!brand && Filters) brand = Filters.inferBrandFromName(payload.name);

    var badgeInfo = Filters ? Filters.originBadge(origin) : { badge: '국산차', badge_class: 'badge-grad' };
    var meta = Filters
      ? Filters.buildMeta(payload.year, payload.mileage || 0, fuel)
      : payload.year + '년 · ' + Math.round((payload.mileage || 0) / 10000 * 10) / 10 + '만km';

    var row = {
      name: payload.name,
      year: payload.year,
      mileage: payload.mileage || 0,
      price_num: payload.price,
      status: payload.status || '판매중',
      thumb_url: payload.thumb || '',
      origin: origin,
      brand: brand,
      fuel: fuel,
      segment: segment,
      meta: meta,
      price: payload.price.toLocaleString('ko-KR') + '만원',
      badge: badgeInfo.badge,
      badge_class: badgeInfo.badge_class,
      is_active: true
    };
    if (editingId) {
      var existing = await findUsedCarRow(editingId);
      if (!existing) throw new Error('매물을 찾을 수 없습니다.');
      row.detail_slug = existing.detail_slug || String(existing.listing_id || existing.id);
      if (existing.sync_source) row.sync_source = existing.sync_source;
      var upQuery = existing.listing_id != null
        ? db().from('used_cars').update(row).eq('listing_id', existing.listing_id)
        : db().from('used_cars').update(row).eq('id', existing.id);
      var up = await upQuery.select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    row.detail_slug = undefined;
    var maxRes = await db().from('used_cars').select('listing_id').order('listing_id', { ascending: false }).limit(1);
    var nextId = (maxRes.data && maxRes.data[0]) ? maxRes.data[0].listing_id + 1 : 481;
    row.listing_id = nextId;
    row.detail_slug = String(nextId);
    row.sort_order = nextId;
    row.sync_source = 'manual';
    var ins = await db().from('used_cars').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deleteUsedcar(carId) {
    var row = await findUsedCarRow(carId);
    if (!row) throw new Error('매물을 찾을 수 없습니다.');

    if (row.sync_source === 'swautopia' && row.listing_id != null) {
      var dj = Object.assign({}, row.detail_json || {}, { admin_hidden: true });
      var up = await db().from('used_cars').update({
        is_active: false,
        status: '숨김',
        detail_json: dj
      }).eq('listing_id', row.listing_id);
      if (up.error) throw up.error;
      return { soft: true };
    }

    var res = await db().from('used_cars').delete().eq('id', row.id);
    if (res.error) throw res.error;
    return { soft: false };
  }

  async function syncSwautopiaUsedCars(onProgress, options) {
    var Sync = window.SwautopiaSync;
    if (!Sync) throw new Error('SwautopiaSync 모듈이 로드되지 않았습니다.');
    var opts = options || {};
    var shouldCancel = opts.shouldCancel || function () { return false; };
    var started = Date.now();
    var startedAt = new Date(started).toISOString();
    var logId = null;
    var diag = { phase: 'init', api_url: Sync.getCarsApiUrl ? Sync.getCarsApiUrl() : '' };

    try {
      var logIns = await db().from('used_car_sync_logs').insert([{
        source: 'swautopia',
        sync_mode: 'manual',
        ok: false,
        msg: '진행 중',
        diag: diag,
        started_at: startedAt
      }]).select('id').single();
      if (!logIns.error && logIns.data) logId = logIns.data.id;
    } catch (_) { /* 로그 테이블 미생성 시 동기화는 계속 */ }

    try {
      var cars = await Sync.fetchAllCars();
      diag.phase = 'fetch';
      diag.cars_fetched = cars.length;
      var rows = cars.map(function (c) { return Sync.mapCarToRow(c); });
      var activeIds = rows.map(function (r) { return r.listing_id; });
      var upserted = 0;
      var photosResized = 0;
      var existingMap = {};
      var hiddenIds = {};

      if (onProgress) onProgress({ phase: 'fetch', count: rows.length });

      var existingRes = await db().from('used_cars')
        .select('listing_id,thumb_url,detail_json,photo_count,is_active')
        .eq('sync_source', 'swautopia');
      if (existingRes.error) throw existingRes.error;
      (existingRes.data || []).forEach(function (r) {
        existingMap[r.listing_id] = r;
        if (isAdminHiddenCar(r)) hiddenIds[r.listing_id] = true;
      });

      rows = rows.filter(function (r) { return !hiddenIds[r.listing_id]; });
      activeIds = rows.map(function (r) { return r.listing_id; });
      diag.cars_to_sync = rows.length;

      for (var c = 0; c < rows.length; c++) {
        if (shouldCancel()) throw new Error('사용자 중지');

        if (onProgress) {
          onProgress({ phase: 'image', carIndex: c + 1, carTotal: rows.length, name: rows[c].name });
        }

        var prev = existingMap[rows[c].listing_id];
        var prevPhotos = (prev && prev.detail_json && prev.detail_json.photos) || [];
        if (prevPhotos.length && prevPhotos.every(isPurpleStoredCarPhoto)) {
          rows[c].detail_json.photos = prevPhotos;
          rows[c].thumb_url = isPurpleStoredCarPhoto(prev.thumb_url) ? prev.thumb_url : prevPhotos[0];
          rows[c].photo_count = prevPhotos.length;
          continue;
        }

        rows[c] = await processSwautopiaRowPhotos(rows[c], function (p) {
          photosResized++;
          if (onProgress) {
            onProgress({
              phase: 'image',
              carIndex: c + 1,
              carTotal: rows.length,
              name: rows[c].name,
              photoIndex: p.photoIndex,
              photoTotal: p.photoTotal
            });
          }
        }, shouldCancel);
      }

      if (shouldCancel()) throw new Error('사용자 중지');

      if (onProgress) onProgress({ phase: 'save', count: rows.length });
      diag.phase = 'save';

      for (var i = 0; i < rows.length; i += 40) {
        var batch = rows.slice(i, i + 40);
        var up = await db().from('used_cars').upsert(batch, { onConflict: 'listing_id' });
        if (up.error) throw up.error;
        upserted += batch.length;
      }

      var ex = await db().from('used_cars').select('listing_id').eq('sync_source', 'swautopia');
      if (ex.error) throw ex.error;
      var deactivate = (ex.data || []).map(function (r) { return r.listing_id; }).filter(function (id) {
        return activeIds.indexOf(id) < 0;
      });
      if (deactivate.length) {
        var de = await db().from('used_cars').update({ is_active: false }).in('listing_id', deactivate);
        if (de.error) throw de.error;
      }

      var result = { count: upserted, deactivated: deactivate.length, photosProcessed: photosResized };
      if (logId) {
        await db().from('used_car_sync_logs').update({
          ok: true,
          msg: '완료',
          diag: diag,
          cars_upserted: upserted,
          cars_deactivated: deactivate.length,
          photos_processed: photosResized,
          duration_ms: Date.now() - started,
          ended_at: new Date().toISOString()
        }).eq('id', logId);
      }
      return result;
    } catch (err) {
      var errMsg = err.message || String(err);
      if (logId) {
        await db().from('used_car_sync_logs').update({
          ok: false,
          msg: errMsg,
          diag: Object.assign({}, diag, { error: errMsg }),
          duration_ms: Date.now() - started,
          ended_at: new Date().toISOString()
        }).eq('id', logId);
      } else {
        try {
          await db().from('used_car_sync_logs').insert([{
            source: 'swautopia',
            sync_mode: 'manual',
            ok: false,
            msg: errMsg,
            diag: Object.assign({}, diag, { error: errMsg }),
            duration_ms: Date.now() - started,
            started_at: startedAt,
            ended_at: new Date().toISOString()
          }]);
        } catch (_) { /* ignore */ }
      }
      throw err;
    }
  }

  /* ---------- Lease ---------- */
  async function listLeaseBrands() {
    var res = await db().from('lease_brands').select('*').order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    var rows = (res.data || []).slice().sort(function (a, b) {
      var oa = a.origin === 'import' ? 1 : 0;
      var ob = b.origin === 'import' ? 1 : 0;
      if (oa !== ob) return oa - ob;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    return rows.map(function (r) {
      return {
        id: r.slug,
        dbId: r.id,
        name: r.name,
        origin: r.origin,
        logo: r.logo_url,
        ksBrandId: r.ks_brand_id != null ? parseInt(r.ks_brand_id, 10) : null,
        syncSource: r.sync_source || '',
        models: []
      };
    });
  }

  async function listLeaseModels(brandDbId) {
    var res = await db().from('lease_models')
      .select('*')
      .eq('brand_id', brandDbId)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.slug,
        dbId: r.id,
        name: r.name,
        priceFrom: r.price_from,
        priceTo: r.price_to,
        img: r.img_url,
        config: r.config_json || {}
      };
    });
  }

  async function saveLeaseBrand(payload, editingDbId) {
    if (!payload.name || !payload.slug) throw new Error('브랜드명과 slug는 필수입니다.');
    var row = {
      slug: payload.slug,
      name: payload.name,
      origin: payload.origin || 'domestic',
      logo_url: payload.logo || '',
      is_active: true
    };
    if (editingDbId) {
      var up = await db().from('lease_brands').update(row).eq('id', editingDbId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    row.sort_order = Date.now() % 100000;
    row.sync_source = 'manual';
    var ins = await db().from('lease_brands').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function saveLeaseModel(brandDbId, payload, editingDbId) {
    if (!payload.name || !payload.slug) throw new Error('모델명과 slug는 필수입니다.');
    var row = {
      brand_id: brandDbId,
      slug: payload.slug,
      name: payload.name,
      price_from: payload.priceFrom || '',
      price_to: payload.priceTo || '',
      img_url: payload.img || '',
      is_active: true
    };
    if (editingDbId) {
      var up = await db().from('lease_models').update(row).eq('id', editingDbId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    row.sort_order = Date.now() % 100000;
    row.sync_source = 'manual';
    var ins = await db().from('lease_models').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deleteLeaseModel(modelDbId) {
    var res = await db().from('lease_models').delete().eq('id', modelDbId);
    if (res.error) throw res.error;
  }

  async function syncKsLease(country, onProgress, options) {
    var Sync = window.KsLeaseSync;
    if (!Sync) throw new Error('KsLeaseSync 모듈이 로드되지 않았습니다.');
    if (country !== 'domestic' && country !== 'import') {
      throw new Error('country는 domestic 또는 import 입니다.');
    }
    var opts = options || {};
    return Sync.runSync(db(), country, {
      resume: !!opts.resume,
      resumeState: opts.resumeState || null,
      brandIds: opts.brandIds || [],
      resumeLogId: opts.resumeLogId || null,
      onProgress: onProgress || function () {}
    });
  }

  async function getLeaseSyncLog(logId) {
    var res = await db().from('lease_sync_logs').select('*').eq('id', logId).maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  }

  async function listLeaseSyncLogs(country, limit) {
    var q = db().from('lease_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit || 10);
    if (country) q = q.eq('country', country);
    var res = await q;
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function getLatestLeaseSyncLog(country) {
    var rows = await listLeaseSyncLogs(country, 1);
    return rows[0] || null;
  }

  async function listUsedCarSyncLogs(limit) {
    var res = await db().from('used_car_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit || 10);
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function getUsedCarSyncLog(logId) {
    var res = await db().from('used_car_sync_logs').select('*').eq('id', logId).maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  }

  async function getLatestUsedCarSyncLog() {
    var rows = await listUsedCarSyncLogs(1);
    return rows[0] || null;
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function mapInquiryRow(r) {
    return {
      id: r.id,
      date: fmtDate(r.created_at),
      time: fmtTime(r.created_at),
      brand: r.brand || r.car_type || '',
      usageMethod: r.usage_method || r.message || '',
      name: r.name,
      phone: r.phone,
      isRead: !!r.is_read
    };
  }

  async function listInquiries() {
    var res = await db().from('inquiries').select('*').order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapInquiryRow);
  }

  async function countUnreadInquiries() {
    var res = await db().from('inquiries').select('id', { count: 'exact', head: true }).eq('is_read', false);
    if (res.error) throw res.error;
    return res.count || 0;
  }

  async function countTotalInquiries() {
    var res = await db().from('inquiries').select('id', { count: 'exact', head: true });
    if (res.error) throw res.error;
    return res.count || 0;
  }

  async function markAllInquiriesRead() {
    var res = await db().from('inquiries').update({ is_read: true }).eq('is_read', false);
    if (res.error) throw res.error;
  }

  async function deleteInquiries(ids) {
    if (!ids || !ids.length) return;
    var res = await db().from('inquiries').delete().in('id', ids);
    if (res.error) throw res.error;
  }

  function mapLeaseQuoteRow(r) {
    return {
      id: r.id,
      date: fmtDate(r.created_at),
      time: fmtTime(r.created_at),
      name: r.name,
      phone: r.phone,
      origin: r.origin || 'domestic',
      originLabel: r.origin === 'import' ? '수입차' : '국산차',
      brandName: r.brand_name || '',
      modelName: r.model_name || '',
      quote: r.quote_json || {},
      isRead: !!r.is_read,
      createdAt: r.created_at
    };
  }

  async function listLeaseQuotes() {
    var res = await db().from('lease_quotes').select('*').order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapLeaseQuoteRow);
  }

  async function countUnreadLeaseQuotes() {
    var res = await db().from('lease_quotes').select('id', { count: 'exact', head: true }).eq('is_read', false);
    if (res.error) throw res.error;
    return res.count || 0;
  }

  async function markAllLeaseQuotesRead() {
    var res = await db().from('lease_quotes').update({ is_read: true }).eq('is_read', false);
    if (res.error) throw res.error;
  }

  async function deleteLeaseQuotes(ids) {
    if (!ids || !ids.length) return;
    var res = await db().from('lease_quotes').delete().in('id', ids);
    if (res.error) throw res.error;
  }

  function mapUsedCarInquiryRow(r) {
    return {
      id: r.id,
      date: fmtDate(r.created_at),
      time: fmtTime(r.created_at),
      name: r.name,
      phone: r.phone,
      listingId: r.listing_id,
      brand: r.brand || '',
      vehicleName: r.vehicle_name || '',
      productTitle: r.product_title || '',
      price: r.price || 0,
      thumbUrl: r.thumb_url || '',
      detailUrl: r.detail_url || '',
      vehicle: r.vehicle_json || {},
      isRead: !!r.is_read,
      createdAt: r.created_at
    };
  }

  async function listUsedCarInquiries() {
    var res = await db().from('used_car_inquiries').select('*').order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapUsedCarInquiryRow);
  }

  async function countUnreadUsedCarInquiries() {
    var res = await db().from('used_car_inquiries').select('id', { count: 'exact', head: true }).eq('is_read', false);
    if (res.error) throw res.error;
    return res.count || 0;
  }

  async function markAllUsedCarInquiriesRead() {
    var res = await db().from('used_car_inquiries').update({ is_read: true }).eq('is_read', false);
    if (res.error) throw res.error;
  }

  async function deleteUsedCarInquiries(ids) {
    if (!ids || !ids.length) return;
    var res = await db().from('used_car_inquiries').delete().in('id', ids);
    if (res.error) throw res.error;
  }

  async function getSeoSettings() {
    var res = await db().from('seo_settings').select('*').eq('id', 1).maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  }

  async function saveSeoSettings(payload) {
    var row = {
      id: 1,
      site_name: payload.site_name || '퍼플오토',
      site_url: payload.site_url || 'https://purpleauto.co.kr',
      default_description: payload.default_description || '',
      og_image_url: payload.og_image_url || '',
      google_verification: payload.google_verification || '',
      naver_verification: payload.naver_verification || '',
      robots_extra: payload.robots_extra || '',
      updated_at: new Date().toISOString()
    };
    var res = await db().from('seo_settings').upsert(row, { onConflict: 'id' });
    if (res.error) throw res.error;
  }

  var SEO_PATCH_REQUEST_PATH = 'seo/patch-request.json';

  async function queueStaticSeoPatch() {
    var body = JSON.stringify({ requested_at: new Date().toISOString() });
    var blob = new Blob([body], { type: 'text/plain' });
    var res = await db().storage.from('purple-uploads').upload(SEO_PATCH_REQUEST_PATH, blob, {
      cacheControl: '60',
      upsert: true,
      contentType: 'text/plain'
    });
    if (res.error) {
      console.warn('[SEO] patch-request upload skipped:', res.error.message || res.error);
      return { queued: false, reason: res.error.message || String(res.error) };
    }
    return { queued: true };
  }

  async function listSeoPageMeta() {
    var res = await db().from('seo_page_meta').select('*').order('sitemap_priority', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function saveSeoPageMetaRows(rows) {
    if (!rows || !rows.length) return;
    var res = await db().from('seo_page_meta').upsert(rows, { onConflict: 'page_path' });
    if (res.error) throw res.error;
  }

  var SITEMAP_STORAGE_PATH = 'seo/sitemap.xml';

  function kstDateStr(d) {
    var dt = d || new Date();
    return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  }

  async function fetchAnalytics(opts) {
    var from = opts.from;
    var to = opts.to;
    if (!from || !to) throw new Error('조회 기간이 필요합니다.');
    var client = db();
    var periodRes = await client.rpc('get_analytics_period_stats', { p_from: from, p_to: to });
    if (periodRes.error) throw periodRes.error;
    var dailyRes = await client.rpc('get_analytics_daily_stats', { p_from: from, p_to: to });
    if (dailyRes.error) throw dailyRes.error;
    var monthlyRes = await client.rpc('get_analytics_monthly_stats', { p_from: from, p_to: to });
    if (monthlyRes.error) throw monthlyRes.error;
    var today = kstDateStr();
    var todayRow = null;
    (dailyRes.data || []).forEach(function (r) {
      if (String(r.stat_date).slice(0, 10) === today) todayRow = r;
    });
    return {
      range: { from: from, to: to },
      summary: (periodRes.data && periodRes.data[0]) || null,
      today: todayRow,
      daily: dailyRes.data || [],
      monthly: monthlyRes.data || []
    };
  }

  async function generateSitemap() {
    var settings = await getSeoSettings();
    var siteUrl = (settings && settings.site_url) ? settings.site_url : 'https://purpleauto.co.kr';
    var builder = window.SitemapBuilder;
    if (!builder) throw new Error('sitemap-builder.js를 불러오지 못했습니다.');

    var pageMetaRes = await db().from('seo_page_meta')
      .select('page_path,sitemap_priority,sitemap_changefreq,noindex')
      .order('sitemap_priority', { ascending: false });
    if (pageMetaRes.error) throw pageMetaRes.error;

    var reviewsRes = await db().from('customer_reviews')
      .select('listing_id,id,updated_at,published_at,created_at')
      .eq('is_active', true)
      .order('listing_id', { ascending: true });
    if (reviewsRes.error) throw reviewsRes.error;

    var carsRes = await db().from('used_cars')
      .select('listing_id,id,updated_at,created_at')
      .eq('is_active', true)
      .order('listing_id', { ascending: true });
    if (carsRes.error) throw carsRes.error;

    var partsRes = await db().from('parts')
      .select('listing_id,id,updated_at,created_at')
      .eq('is_active', true)
      .order('listing_id', { ascending: true });
    if (partsRes.error) throw partsRes.error;

    var xml = await builder.buildXml({
      siteUrl: siteUrl,
      pageMeta: pageMetaRes.data || [],
      reviews: reviewsRes.data || [],
      usedCars: carsRes.data || [],
      parts: partsRes.data || []
    });
    var count = builder.urlCount(xml);
    var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    var uploadRes = await db().storage.from('purple-uploads').upload(SITEMAP_STORAGE_PATH, blob, {
      cacheControl: '60',
      upsert: true,
      contentType: 'application/xml'
    });
    if (uploadRes.error) {
      if (uploadRes.error.message && /mime|type/i.test(uploadRes.error.message)) {
        throw new Error('Storage MIME 제한 — Supabase SQL Editor에서 migration-sitemap-storage.sql 실행 후 다시 시도하세요.');
      }
      throw uploadRes.error;
    }

    return {
      count: count,
      storageUrl: storagePublicUrl(SITEMAP_STORAGE_PATH),
      liveUrl: siteUrl.replace(/\/$/, '') + '/sitemap.xml'
    };
  }

  var HERO_MAX_SLIDES = 4;

  function sanitizeHeroHtmlContent(html) {
    return String(html || '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  function normalizeHeroButtons(buttons) {
    if (!Array.isArray(buttons)) return [];
    return buttons.map(function (b) {
      return {
        label: String((b && b.label) || '').trim().slice(0, 80),
        href: String((b && b.href) || '#').trim().slice(0, 500) || '#',
        style: (b && b.style) === 'outline' ? 'outline' : 'primary'
      };
    }).filter(function (b) { return b.label; });
  }

  async function listHeroSlides() {
    var res = await db().from('hero_slides').select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (row) {
      row.buttons = normalizeHeroButtons(row.buttons);
      return row;
    });
  }

  async function saveHeroSlide(payload, editingId) {
    var countRes = await db().from('hero_slides').select('id', { count: 'exact', head: true });
    if (countRes.error) throw countRes.error;
    var total = countRes.count || 0;
    if (!editingId && total >= HERO_MAX_SLIDES) {
      throw new Error('슬라이드는 최대 ' + HERO_MAX_SLIDES + '개까지 등록할 수 있습니다.');
    }

    var row = {
      is_enabled: payload.is_enabled !== false,
      slide_type: payload.slide_type === 'html' ? 'html' : 'builder',
      bg_image_url: String(payload.bg_image_url || '').trim(),
      kicker_text: String(payload.kicker_text || '').trim(),
      kicker_font_size: String(payload.kicker_font_size || 'sm').trim(),
      kicker_color: String(payload.kicker_color || '').trim(),
      kicker_align: String(payload.kicker_align || 'left').trim(),
      title_text: String(payload.title_text || '').trim(),
      title_font_size: String(payload.title_font_size || 'lg').trim(),
      title_color: String(payload.title_color || '').trim(),
      title_align: String(payload.title_align || 'left').trim(),
      desc_text: String(payload.desc_text || '').trim(),
      desc_font_size: String(payload.desc_font_size || 'md').trim(),
      desc_color: String(payload.desc_color || '').trim(),
      desc_align: String(payload.desc_align || 'left').trim(),
      buttons: normalizeHeroButtons(payload.buttons),
      html_content: sanitizeHeroHtmlContent(payload.html_content),
      overlay_opacity: Math.min(0.85, Math.max(0, parseFloat(payload.overlay_opacity) || 0.35)),
      updated_at: new Date().toISOString()
    };

    if (editingId) {
      var up = await db().from('hero_slides').update(row).eq('id', editingId).select().single();
      if (up.error) throw up.error;
      up.data.buttons = normalizeHeroButtons(up.data.buttons);
      return up.data;
    }

    var maxRes = await db().from('hero_slides').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    if (maxRes.error) throw maxRes.error;
    row.sort_order = ((maxRes.data && maxRes.data[0]) ? maxRes.data[0].sort_order : -1) + 1;

    var ins = await db().from('hero_slides').insert([row]).select().single();
    if (ins.error) throw ins.error;
    ins.data.buttons = normalizeHeroButtons(ins.data.buttons);
    return ins.data;
  }

  async function deleteHeroSlide(id) {
    var res = await db().from('hero_slides').delete().eq('id', id);
    if (res.error) throw res.error;
  }

  async function reorderHeroSlides(orderedIds) {
    if (!orderedIds || !orderedIds.length) return;
    for (var i = 0; i < orderedIds.length; i++) {
      var res = await db().from('hero_slides').update({ sort_order: i, updated_at: new Date().toISOString() }).eq('id', orderedIds[i]);
      if (res.error) throw res.error;
    }
  }

  window.PurpleAdminAPI = {
    fmtDate: fmtDate,
    parseDotDate: parseDotDate,
    uploadImage: uploadImage,
    uploadBlob: uploadBlob,
    storagePublicUrl: storagePublicUrl,
    listYoutube: listYoutube,
    setYoutubeHomeMain: setYoutubeHomeMain,
    setYoutubeHomeFeatured: setYoutubeHomeFeatured,
    syncYoutubeChannel: syncYoutubeChannel,
    saveYoutube: saveYoutube,
    deleteYoutube: deleteYoutube,
    listBlog: listBlog,
    saveBlog: saveBlog,
    patchBlogMeta: patchBlogMeta,
    deleteBlog: deleteBlog,
    listReviews: listReviews,
    saveReview: saveReview,
    deleteReview: deleteReview,
    listParts: listParts,
    savePart: savePart,
    deletePart: deletePart,
    getNextPartListingId: getNextPartListingId,
    uploadPartPhotoFiles: uploadPartPhotoFiles,
    listUsedcars: listUsedcars,
    saveUsedcar: saveUsedcar,
    deleteUsedcar: deleteUsedcar,
    syncSwautopiaUsedCars: syncSwautopiaUsedCars,
    listUsedCarSyncLogs: listUsedCarSyncLogs,
    getUsedCarSyncLog: getUsedCarSyncLog,
    getLatestUsedCarSyncLog: getLatestUsedCarSyncLog,
    listLeaseBrands: listLeaseBrands,
    listLeaseModels: listLeaseModels,
    saveLeaseBrand: saveLeaseBrand,
    saveLeaseModel: saveLeaseModel,
    deleteLeaseModel: deleteLeaseModel,
    syncKsLease: syncKsLease,
    listLeaseSyncLogs: listLeaseSyncLogs,
    getLeaseSyncLog: getLeaseSyncLog,
    getLatestLeaseSyncLog: getLatestLeaseSyncLog,
    listInquiries: listInquiries,
    countUnreadInquiries: countUnreadInquiries,
    countTotalInquiries: countTotalInquiries,
    markAllInquiriesRead: markAllInquiriesRead,
    deleteInquiries: deleteInquiries,
    listLeaseQuotes: listLeaseQuotes,
    countUnreadLeaseQuotes: countUnreadLeaseQuotes,
    markAllLeaseQuotesRead: markAllLeaseQuotesRead,
    deleteLeaseQuotes: deleteLeaseQuotes,
    listUsedCarInquiries: listUsedCarInquiries,
    countUnreadUsedCarInquiries: countUnreadUsedCarInquiries,
    markAllUsedCarInquiriesRead: markAllUsedCarInquiriesRead,
    deleteUsedCarInquiries: deleteUsedCarInquiries,
    getSeoSettings: getSeoSettings,
    saveSeoSettings: saveSeoSettings,
    listSeoPageMeta: listSeoPageMeta,
    saveSeoPageMetaRows: saveSeoPageMetaRows,
    generateSitemap: generateSitemap,
    queueStaticSeoPatch: queueStaticSeoPatch,
    fetchAnalytics: fetchAnalytics,
    listHeroSlides: listHeroSlides,
    saveHeroSlide: saveHeroSlide,
    deleteHeroSlide: deleteHeroSlide,
    reorderHeroSlides: reorderHeroSlides,
    HERO_MAX_SLIDES: HERO_MAX_SLIDES
  };
})();

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

  /* ---------- YouTube ---------- */
  async function listYoutube() {
    var res = await db().from('youtube_videos').select('*').order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.id,
        title: r.title,
        url: r.external_url || youtubeWatchUrl(r.video_id),
        thumb: r.thumb_url,
        duration: r.duration,
        date: fmtDate(r.published_at || r.created_at)
      };
    });
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
        date: fmtDate(r.published_at)
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
  async function listParts() {
    var res = await db().from('parts').select('*').order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      var dj = r.detail_json || {};
      return {
        id: r.listing_id,
        brand: r.brand,
        category: r.category,
        name: r.name,
        price: r.price,
        stock: r.stock,
        thumb: r.thumb_url,
        compatible: dj.compatible || '',
        description: dj.description || ''
      };
    });
  }

  async function savePart(payload, editingId) {
    if (!payload.name || isNaN(payload.price)) throw new Error('부품명과 가격은 필수입니다.');
    var row = {
      brand: payload.brand,
      category: payload.category || '',
      name: payload.name,
      price: payload.price,
      stock: payload.stock || '재고있음',
      thumb_url: payload.thumb || '',
      detail_json: {
        compatible: payload.compatible || '',
        description: payload.description || ''
      },
      is_active: true
    };
    if (editingId) {
      var up = await db().from('parts').update(row).eq('listing_id', editingId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    var maxRes = await db().from('parts').select('listing_id').order('listing_id', { ascending: false }).limit(1);
    var nextId = (maxRes.data && maxRes.data[0]) ? maxRes.data[0].listing_id + 1 : 1;
    row.listing_id = nextId;
    row.sort_order = nextId;
    var ins = await db().from('parts').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deletePart(listingId) {
    var res = await db().from('parts').delete().eq('listing_id', listingId);
    if (res.error) throw res.error;
  }

  /* ---------- Used Cars ---------- */
  async function listUsedcars() {
    var res = await db().from('used_cars').select('*').order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.listing_id || r.id,
        name: r.name,
        year: r.year,
        mileage: r.mileage || 0,
        price: r.price_num || 0,
        status: r.status || '판매중',
        thumb: r.thumb_url || ''
      };
    });
  }

  async function saveUsedcar(payload, editingId) {
    if (!payload.name || isNaN(payload.year) || isNaN(payload.price)) {
      throw new Error('차량명, 연식, 가격은 필수입니다.');
    }
    var row = {
      name: payload.name,
      year: payload.year,
      mileage: payload.mileage || 0,
      price_num: payload.price,
      status: payload.status || '판매중',
      thumb_url: payload.thumb || '',
      origin: 'domestic',
      meta: payload.year + '년 · ' + Math.round((payload.mileage || 0) / 10000 * 10) / 10 + '만km',
      price: payload.price.toLocaleString('ko-KR') + '만원',
      detail_slug: editingId ? String(editingId) : undefined,
      is_active: true
    };
    if (editingId) {
      row.detail_slug = String(editingId);
      var up = await db().from('used_cars').update(row).eq('listing_id', editingId).select().single();
      if (up.error) throw up.error;
      return up.data;
    }
    var maxRes = await db().from('used_cars').select('listing_id').order('listing_id', { ascending: false }).limit(1);
    var nextId = (maxRes.data && maxRes.data[0]) ? maxRes.data[0].listing_id + 1 : 481;
    row.listing_id = nextId;
    row.detail_slug = String(nextId);
    row.sort_order = nextId;
    row.badge = '국산차';
    row.badge_class = 'badge-grad';
    var ins = await db().from('used_cars').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deleteUsedcar(listingId) {
    var res = await db().from('used_cars').delete().eq('listing_id', listingId);
    if (res.error) throw res.error;
  }

  /* ---------- Lease ---------- */
  async function listLeaseBrands() {
    var res = await db().from('lease_brands').select('*').order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.slug,
        dbId: r.id,
        name: r.name,
        origin: r.origin,
        logo: r.logo_url,
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
        img: r.img_url
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
    var ins = await db().from('lease_models').insert([row]).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function deleteLeaseModel(modelDbId) {
    var res = await db().from('lease_models').delete().eq('id', modelDbId);
    if (res.error) throw res.error;
  }

  window.PurpleAdminAPI = {
    fmtDate: fmtDate,
    parseDotDate: parseDotDate,
    uploadImage: uploadImage,
    storagePublicUrl: storagePublicUrl,
    listYoutube: listYoutube,
    saveYoutube: saveYoutube,
    deleteYoutube: deleteYoutube,
    listBlog: listBlog,
    saveBlog: saveBlog,
    deleteBlog: deleteBlog,
    listReviews: listReviews,
    saveReview: saveReview,
    deleteReview: deleteReview,
    listParts: listParts,
    savePart: savePart,
    deletePart: deletePart,
    listUsedcars: listUsedcars,
    saveUsedcar: saveUsedcar,
    deleteUsedcar: deleteUsedcar,
    listLeaseBrands: listLeaseBrands,
    listLeaseModels: listLeaseModels,
    saveLeaseBrand: saveLeaseBrand,
    saveLeaseModel: saveLeaseModel,
    deleteLeaseModel: deleteLeaseModel
  };
})();

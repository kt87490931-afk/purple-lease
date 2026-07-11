/**
 * Supabase 데이터 로더 — 퍼플리스 전 페이지 공통
 */
(function () {
  'use strict';

  function hasSupabaseConfig() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return false;
    if (cfg.url.indexOf('YOUR_') === 0 || cfg.anonKey.indexOf('YOUR_') === 0) return false;
    if (cfg.anonKey.length < 10) return false;
    return true;
  }

  function getClient() {
    if (!hasSupabaseConfig()) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    try {
      return window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    } catch (err) {
      console.warn('[PurpleLease] Supabase client init failed:', err);
      return null;
    }
  }

  function fmtDate(d) {
    if (!d) return '';
    var p = String(d).split('T')[0].split('-');
    if (p.length < 3) return String(d);
    return p[0] + '.' + p[1] + '.' + p[2];
  }

  function mapYoutubeRow(r) {
    var vid = r.video_id;
    var thumb = (window.YoutubeUtils && window.YoutubeUtils.resolveThumb)
      ? window.YoutubeUtils.resolveThumb(vid, r.thumb_url)
      : (r.thumb_url || '');
    return {
      id: r.id,
      videoId: vid,
      title: r.title,
      desc: r.description,
      thumb: thumb,
      duration: r.duration,
      date: fmtDate(r.published_at || r.created_at),
      url: 'https://www.youtube.com/watch?v=' + vid,
      detailUrl: '/youtube-detail?id=' + r.id,
      isHomeMain: !!r.is_home_main,
      isHomeFeatured: !!r.is_home_featured
    };
  }

  async function fetchYoutubeVideos() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('youtube_videos')
      .select('id,video_id,title,description,thumb_url,duration,sort_order,created_at,published_at,is_home_main,is_home_featured')
      .eq('is_active', true)
      .order('sort_order', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapYoutubeRow);
  }

  async function fetchYoutubeHomeMain() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('youtube_videos')
      .select('id,video_id,title,description,thumb_url,duration,sort_order,created_at,published_at,is_home_main,is_home_featured')
      .eq('is_active', true)
      .eq('is_home_main', true)
      .order('sort_order', { ascending: false })
      .limit(1);
    if (res.error) throw res.error;
    return (res.data && res.data[0]) ? mapYoutubeRow(res.data[0]) : null;
  }

  async function fetchYoutubeHomeFeatured() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('youtube_videos')
      .select('id,video_id,title,description,thumb_url,duration,sort_order,created_at,published_at,is_home_main,is_home_featured')
      .eq('is_active', true)
      .eq('is_home_featured', true)
      .order('sort_order', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(mapYoutubeRow);
  }

  async function fetchYoutubeAll() {
    return fetchYoutubeVideos();
  }

  async function fetchYoutubeGrid() {
    var rows = await fetchYoutubeAll();
    return rows;
  }

  async function fetchYoutubeDetail(dbId) {
    var client = getClient();
    if (!client || !dbId) return null;
    var res = await client
      .from('youtube_videos')
      .select('id,video_id,title,description,thumb_url,duration,sort_order,created_at,published_at,is_home_main,is_home_featured')
      .eq('id', dbId)
      .eq('is_active', true)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) return null;
    return mapYoutubeRow(res.data);
  }

  async function fetchYoutubeDetailWithNav(dbId) {
    var all = await fetchYoutubeVideos();
    if (!all || !all.length) {
      return { detail: await fetchYoutubeDetail(dbId), prev: null, next: null };
    }
    var sid = String(dbId);
    var idx = -1;
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].id) === sid) { idx = i; break; }
    }
    if (idx < 0) {
      return { detail: await fetchYoutubeDetail(dbId), prev: null, next: null };
    }
    return {
      detail: all[idx],
      prev: idx < all.length - 1 ? all[idx + 1] : null,
      next: idx > 0 ? all[idx - 1] : null
    };
  }

  async function fetchTimeSaleSettings() {
    var client = getClient();
    if (!client) return { is_visible: false };
    var res = await client.from('time_sale_settings').select('is_visible').eq('id', 1).maybeSingle();
    if (res.error) throw res.error;
    return { is_visible: !!(res.data && res.data.is_visible) };
  }

  async function fetchTimeDeals() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('time_deals')
      .select('badge,badge_class,name,trim,was_price,now_price,lease_info,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        badge: r.badge,
        badgeClass: r.badge_class,
        name: r.name,
        trim: r.trim,
        was: r.was_price,
        now: r.now_price,
        lease: r.lease_info
      };
    });
  }

  function mapUsedCarsListRows(data) {
    var norm = (window.PurpleUsedCarFilters && window.PurpleUsedCarFilters.normalizeFilterFields)
      ? window.PurpleUsedCarFilters.normalizeFilterFields.bind(window.PurpleUsedCarFilters)
      : function (r) { return { brand: r.brand || '', fuel: r.fuel || '', segment: r.segment || '', origin: r.origin || 'domestic' }; };

    return (data || []).map(function (r) {
      var f = norm(r);
      return {
        id: r.listing_id,
        origin: f.origin,
        name: r.name,
        year: r.year,
        fuel: f.fuel,
        mileage: r.mileage,
        price: r.price_num,
        brand: f.brand,
        segment: f.segment,
        status: r.status,
        photoCount: r.photo_count || 0,
        thumb: r.thumb_url,
        tags: r.tags || [],
        sortOrder: r.sort_order || r.listing_id || 0,
        lastSyncedAt: r.last_synced_at || ''
      };
    });
  }

  async function fetchUsedCarsListRest() {
    if (!hasSupabaseConfig()) return null;
    var cfg = window.SUPABASE_CONFIG;
    var fields = 'listing_id,origin,name,year,fuel,mileage,price_num,brand,segment,status,photo_count,thumb_url,tags,sort_order,last_synced_at,detail_json';
    var url = cfg.url.replace(/\/$/, '') + '/rest/v1/used_cars?select=' + encodeURIComponent(fields) +
      '&is_active=eq.true&order=sort_order.asc&limit=500';
    var res = await fetch(url, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) throw new Error('used_cars REST ' + res.status);
    return mapUsedCarsListRows(await res.json());
  }

  async function fetchUsedCarsList() {
    var fields = 'listing_id,origin,name,year,fuel,mileage,price_num,brand,segment,status,photo_count,thumb_url,tags,sort_order,last_synced_at,detail_json';
    var client = getClient();
    if (client) {
      try {
        var res = await client
          .from('used_cars')
          .select(fields)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .range(0, 499);
        if (res.error) throw res.error;
        if (res.data && res.data.length) return mapUsedCarsListRows(res.data);
      } catch (err) {
        console.warn('[PurpleLease] fetchUsedCarsList client failed, REST fallback:', err);
      }
    }
    return fetchUsedCarsListRest();
  }

  function mapUsedCarsHomeRows(list, limit) {
    var rows = (list || []).slice();
    var cap = limit > 0 ? limit : 8;
    return rows.slice(0, cap).map(function (r) {
      var ob = (window.PurpleUsedCarFilters && window.PurpleUsedCarFilters.originBadge)
        ? window.PurpleUsedCarFilters.originBadge(r.origin)
        : { badge: '국산차', badge_class: 'badge-grad' };
      var km = Math.round((r.mileage || 0) / 10000 * 10) / 10;
      return {
        badge: ob.badge,
        badgeClass: ob.badge_class,
        name: r.name,
        meta: (r.year ? r.year + '년' : '') + ' · ' + km + '만km',
        price: (r.price || 0).toLocaleString('ko-KR') + '만원',
        slug: String(r.id),
        thumb: r.thumb
      };
    });
  }

  async function fetchUsedCars() {
    var list = await fetchUsedCarsList();
    if (!list || !list.length) return null;
    return mapUsedCarsHomeRows(list, 8);
  }

  async function fetchUsedCarDetail(listingId) {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('used_cars')
      .select('*')
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) return null;
    var d = res.data.detail_json || {};
    var photos = (d.photos && d.photos.length) ? d.photos : (res.data.thumb_url ? [res.data.thumb_url] : []);
    return Object.assign({
      id: res.data.listing_id,
      listingId: res.data.listing_id,
      brand: res.data.brand || '',
      name: res.data.name,
      origin: res.data.origin || 'domestic',
      status: res.data.status || '판매중',
      year: res.data.year,
      mileage: res.data.mileage,
      fuel: res.data.fuel,
      price: res.data.price_num,
      tags: res.data.tags || [],
      photos: photos,
      plate: d.plate || '',
      color: d.color || '',
      parkLocation: d.parkLocation || '',
      registeredDate: d.registeredDate || '',
      cost: d.cost || [],
      description: d.description || '',
      options: d.options || {},
      perfDocs: d.perfDocs || [],
      perfLinks: d.perfLinks || [],
      underbodyDocs: d.underbodyDocs || [],
      isEV: !!d.isEV,
      battery: d.battery || null,
      batteryDocs: d.batteryDocs || []
    }, d, { photos: photos, seller: null });
  }

  function mapLeaseTransfersListRows(data) {
    return (data || []).map(function (r) {
      var row = mapUsedCarsListRows([r])[0];
      row.lastSyncedAt = '';
      var dj = r.detail_json || {};
      var photos = (dj.photos && dj.photos.length) ? dj.photos : [];
      if (!row.thumb && photos.length) row.thumb = photos[0];
      if (!row.photoCount && row.thumb) row.photoCount = 1;
      var ct = String(dj.contractType || dj.contract_type || '').toLowerCase().trim();
      row.contractType = (ct === 'rent' || ct === '렌트' || ct === '렌트차량') ? 'rent' : 'lease';
      return row;
    });
  }

  async function fetchLeaseTransfersListRest() {
    if (!hasSupabaseConfig()) return null;
    var cfg = window.SUPABASE_CONFIG;
    var fields = 'listing_id,origin,name,year,fuel,mileage,price_num,brand,segment,status,photo_count,thumb_url,tags,sort_order,detail_json';
    var url = cfg.url.replace(/\/$/, '') + '/rest/v1/lease_transfers?select=' + encodeURIComponent(fields) +
      '&is_active=eq.true&order=sort_order.asc&limit=500';
    var res = await fetch(url, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) throw new Error('lease_transfers REST ' + res.status);
    return mapLeaseTransfersListRows(await res.json());
  }

  async function fetchLeaseTransfersList() {
    var fields = 'listing_id,origin,name,year,fuel,mileage,price_num,brand,segment,status,photo_count,thumb_url,tags,sort_order,detail_json';
    var client = getClient();
    if (client) {
      try {
        var res = await client
          .from('lease_transfers')
          .select(fields)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .range(0, 499);
        if (res.error) throw res.error;
        if (res.data && res.data.length) return mapLeaseTransfersListRows(res.data);
      } catch (err) {
        console.warn('[PurpleLease] fetchLeaseTransfersList client failed, REST fallback:', err);
      }
    }
    return fetchLeaseTransfersListRest();
  }

  async function fetchLeaseTransferDetailRest(listingId) {
    if (!hasSupabaseConfig() || listingId == null) return null;
    var cfg = window.SUPABASE_CONFIG;
    var url = cfg.url.replace(/\/$/, '') + '/rest/v1/lease_transfers?select=*' +
      '&listing_id=eq.' + encodeURIComponent(listingId) +
      '&is_active=eq.true&limit=1';
    var res = await fetch(url, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) throw new Error('lease_transfers detail REST ' + res.status);
    var rows = await res.json();
    if (!rows || !rows.length) return null;
    return rows[0];
  }

  function mapLeaseTransferDetailRow(resData) {
    if (!resData) return null;
    var d = resData.detail_json || {};
    var photos = (d.photos && d.photos.length) ? d.photos : (resData.thumb_url ? [resData.thumb_url] : []);
    return Object.assign({
      id: resData.listing_id,
      listingId: resData.listing_id,
      brand: resData.brand || '',
      name: resData.name,
      origin: resData.origin || 'domestic',
      status: resData.status || '판매중',
      year: resData.year,
      mileage: resData.mileage,
      fuel: resData.fuel,
      price: resData.price_num,
      tags: resData.tags || [],
      photos: photos,
      plate: d.plate || '',
      color: d.color || '',
      parkLocation: d.parkLocation || '',
      registeredDate: d.registeredDate || '',
      cost: d.cost || [],
      description: d.description || '',
      options: d.options || {},
      perfDocs: d.perfDocs || [],
      perfLinks: d.perfLinks || [],
      underbodyDocs: d.underbodyDocs || [],
      isEV: !!d.isEV,
      battery: d.battery || null,
      batteryDocs: d.batteryDocs || [],
      leaseConditions: d.leaseConditions || {},
      vehicleCoreInfo: d.vehicleCoreInfo || {},
      contractType: (function () {
        var ct = String(d.contractType || d.contract_type || '').toLowerCase().trim();
        return (ct === 'rent' || ct === '렌트' || ct === '렌트차량') ? 'rent' : 'lease';
      })()
    }, d, {
      photos: photos,
      seller: null,
      leaseConditions: d.leaseConditions || {},
      vehicleCoreInfo: d.vehicleCoreInfo || {},
      contractType: (function () {
        var ct = String(d.contractType || d.contract_type || '').toLowerCase().trim();
        return (ct === 'rent' || ct === '렌트' || ct === '렌트차량') ? 'rent' : 'lease';
      })()
    });
  }

  async function fetchLeaseTransferDetail(listingId) {
    var client = getClient();
    if (client) {
      try {
        var res = await client
          .from('lease_transfers')
          .select('*')
          .eq('listing_id', listingId)
          .eq('is_active', true)
          .maybeSingle();
        if (res.error) throw res.error;
        if (res.data) return mapLeaseTransferDetailRow(res.data);
      } catch (err) {
        console.warn('[PurpleLease] fetchLeaseTransferDetail client failed, REST fallback:', err);
      }
    }
    try {
      var row = await fetchLeaseTransferDetailRest(listingId);
      return mapLeaseTransferDetailRow(row);
    } catch (err2) {
      console.warn('[PurpleLease] fetchLeaseTransferDetail REST failed:', err2);
      return null;
    }
  }

  async function fetchParts() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('parts')
      .select('listing_id,brand,category,name,price,stock,thumb_url,tags,sort_order,detail_json')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    var norm = window.PurplePartUtils && window.PurplePartUtils.normalizePartRow;
    return (res.data || []).map(function (r) {
      var p = norm ? norm(r) : null;
      if (p) {
        return {
          id: p.id,
          brand: p.brand,
          category: p.category,
          name: p.name,
          price: p.price,
          stock: p.stock,
          thumb: p.thumb,
          tags: p.tags,
          sortOrder: p.sortOrder
        };
      }
      return {
        id: r.listing_id,
        brand: r.brand,
        category: r.category,
        name: r.name,
        price: r.price,
        stock: r.stock,
        thumb: r.thumb_url,
        tags: r.tags || [],
        sortOrder: r.sort_order || r.listing_id || 0
      };
    });
  }

  async function fetchPartDetail(listingId) {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('parts')
      .select('*')
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) return null;
    if (window.PurplePartUtils && window.PurplePartUtils.normalizePartRow) {
      return window.PurplePartUtils.normalizePartRow(res.data);
    }
    var dj = res.data.detail_json || {};
    return {
      id: res.data.listing_id,
      brand: res.data.brand,
      brandLabel: res.data.brand,
      category: res.data.category,
      name: res.data.name,
      price: res.data.price,
      stock: res.data.stock,
      thumb: res.data.thumb_url,
      tags: res.data.tags || [],
      compatible: dj.compatible || '',
      maker: dj.maker || '',
      description: dj.description || '',
      photos: dj.photos && dj.photos.length ? dj.photos : (res.data.thumb_url ? [res.data.thumb_url] : [])
    };
  }

  async function fetchCustomerReviews() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('customer_reviews')
      .select('listing_id,title,views,published_at,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.listing_id,
        title: r.title,
        date: fmtDate(r.published_at),
        views: r.views || 0
      };
    });
  }

  async function fetchCustomerReviewDetail(listingId) {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('customer_reviews')
      .select('listing_id,title,body,author,views,published_at')
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) return null;
    return {
      id: res.data.listing_id,
      title: res.data.title,
      body: res.data.body,
      author: res.data.author,
      date: fmtDate(res.data.published_at),
      views: res.data.views || 0
    };
  }

  async function incrementReviewViews(listingId) {
    var client = getClient();
    if (!client) return null;
    var res = await client.rpc('increment_review_views', { p_listing_id: listingId });
    if (res.error) throw res.error;
    return res.data;
  }

  async function fetchLeaseCatalog() {
    var client = getClient();
    if (!client) return null;
    var brandsRes = await client
      .from('lease_brands')
      .select('id,slug,name,origin,logo_url,ks_brand_id,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (brandsRes.error) throw brandsRes.error;
    if (!brandsRes.data || !brandsRes.data.length) return null;

    var modelsRes = await client
      .from('lease_models')
      .select('brand_id,slug,name,price_from,price_to,img_url,ks_model_id,config_json,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (modelsRes.error) throw modelsRes.error;

    var modelsByBrand = {};
    (modelsRes.data || []).forEach(function (m) {
      if (!modelsByBrand[m.brand_id]) modelsByBrand[m.brand_id] = [];
      modelsByBrand[m.brand_id].push({
        id: m.slug,
        name: m.name,
        priceFrom: m.price_from,
        priceTo: m.price_to,
        img: m.img_url,
        ksModelId: m.ks_model_id != null ? parseInt(m.ks_model_id, 10) : null,
        config: m.config_json || {}
      });
    });

    var domestic = [];
    var imported = [];
    (brandsRes.data || []).forEach(function (b) {
      var item = {
        id: b.slug,
        name: b.name,
        logo: b.logo_url,
        ksBrandId: b.ks_brand_id != null ? parseInt(b.ks_brand_id, 10) : null,
        models: modelsByBrand[b.id] || []
      };
      if (b.origin === 'import') imported.push(item);
      else domestic.push(item);
    });

    return { domestic: domestic, import: imported };
  }

  function mapBlogRow(r) {
    return {
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      thumb: r.thumb_url,
      url: r.external_url,
      date: fmtDate(r.published_at),
      viewCount: r.view_count || 0,
      publishedAt: r.published_at || null
    };
  }

  async function fetchBlogPosts() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('blog_posts')
      .select('id,title,excerpt,thumb_url,external_url,published_at,view_count,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(mapBlogRow);
  }

  async function fetchBlogHomeLatest(limit) {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('blog_posts')
      .select('id,title,excerpt,thumb_url,external_url,published_at,view_count')
      .eq('is_active', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit || 4);
    if (res.error) throw res.error;
    return (res.data || []).map(mapBlogRow);
  }

  async function fetchBlogHomePopular(limit) {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('blog_posts')
      .select('id,title,excerpt,thumb_url,external_url,published_at,view_count')
      .eq('is_active', true)
      .order('view_count', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit || 4);
    if (res.error) throw res.error;
    return (res.data || []).map(mapBlogRow);
  }

  async function incrementBlogViews(id) {
    var client = getClient();
    if (!client) return null;
    var res = await client.rpc('increment_blog_views', { p_id: id });
    if (res.error) throw res.error;
    return res.data;
  }

  async function submitInquiry(payload) {
    var client = getClient();
    if (!client) throw new Error('Supabase not configured');
    var row = {
      name: payload.name,
      phone: payload.phone,
      brand: payload.brand || '',
      usage_method: payload.usage_method || '',
      car_type: payload.brand || payload.car_type || '',
      message: payload.usage_method || payload.message || '',
      source_page: payload.source_page || 'index',
      is_read: false
    };
    var res = await client.from('inquiries').insert([row]);
    if (res.error) throw res.error;
    return res.data;
  }

  async function submitLeaseQuote(payload) {
    var client = getClient();
    if (!client) throw new Error('Supabase not configured');
    var quote = payload.quote || {};
    var row = {
      name: String(payload.name || '').trim(),
      phone: String(payload.phone || '').trim(),
      origin: quote.origin || payload.origin || 'domestic',
      brand_name: quote.brand_name || payload.brand_name || '',
      model_name: quote.model_name || payload.model_name || '',
      quote_json: quote,
      source_page: payload.source_page || 'estimate',
      is_read: false
    };
    if (!row.name || !row.phone) throw new Error('성함과 연락처를 입력해 주세요.');
    var res = await client.from('lease_quotes').insert([row]);
    if (res.error) throw res.error;
    return res.data;
  }

  async function submitLeaseCalculatorInquiry(payload) {
    var client = getClient();
    if (!client) throw new Error('Supabase not configured');
    var row = {
      name: String(payload.name || '').trim(),
      phone: String(payload.phone || '').trim(),
      calc_json: payload.calc_json || {},
      source_page: payload.source_page || 'lease-calculator',
      is_read: false
    };
    if (!row.name || !row.phone) throw new Error('성함과 연락처를 입력해 주세요.');
    var res = await client.from('lease_calculator_inquiries').insert([row]);
    if (res.error) throw res.error;
    return res.data;
  }

  async function submitUsedCarInquiry(payload) {
    var client = getClient();
    if (!client) throw new Error('Supabase not configured');
    var row = {
      name: String(payload.name || '').trim(),
      phone: String(payload.phone || '').trim(),
      listing_id: parseInt(payload.listing_id, 10) || 0,
      brand: payload.brand || '',
      vehicle_name: payload.vehicle_name || '',
      product_title: payload.product_title || '',
      price: parseInt(payload.price, 10) || 0,
      thumb_url: payload.thumb_url || '',
      detail_url: payload.detail_url || '',
      vehicle_json: payload.vehicle_json || {},
      source_page: payload.source_page || 'used-car-detail',
      is_read: false
    };
    if (!row.name || !row.phone) throw new Error('성함과 연락처를 입력해 주세요.');
    if (!row.listing_id) throw new Error('차량 정보를 확인할 수 없습니다.');
    var res = await client.from('used_car_inquiries').insert([row]);
    if (res.error) throw res.error;
    return res.data;
  }

  function mapPartnerPublicRow(r) {
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      region: r.region || '',
      sigungu: r.sigungu || '',
      address: r.address || '',
      desc: r.short_desc || '',
      phone: r.phone || '',
      tags: r.tag_names || [],
      is_premium: !!r.is_premium,
      video_youtube_id: r.video_youtube_id || '',
      gallery: Array.isArray(r.gallery) ? r.gallery : [],
      body_html: r.body_html || ''
    };
  }

  async function fetchPartnersPageSettings() {
    var client = getClient();
    if (!client) return null;
    var res = await client.from('partner_page_settings').select('*').eq('id', 1).maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  }

  async function fetchPartnersTags() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('partner_tags')
      .select('name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) { return r.name; });
  }

  async function fetchPartnersRegions() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('partner_regions')
      .select('code,name,sigungu')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        code: r.code,
        name: r.name,
        sigungu: Array.isArray(r.sigungu) ? r.sigungu : []
      };
    });
  }

  async function fetchPartnersList() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .order('is_premium', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(mapPartnerPublicRow);
  }

  async function fetchPartnerById(id) {
    var client = getClient();
    if (!client) return null;
    var n = parseInt(id, 10);
    if (!n) return null;
    var res = await client
      .from('partners')
      .select('*')
      .eq('id', n)
      .eq('is_active', true)
      .maybeSingle();
    if (res.error) throw res.error;
    return mapPartnerPublicRow(res.data);
  }

  async function fetchPartnersBundle() {
    if (!getClient()) return null;
    var results = await Promise.all([
      fetchPartnersPageSettings(),
      fetchPartnersTags(),
      fetchPartnersRegions(),
      fetchPartnersList()
    ]);
    if (!results[0] && (!results[2] || !results[2].length) && (!results[3] || !results[3].length)) {
      return null;
    }
    return {
      pageSettings: results[0],
      tags: results[1] || [],
      regions: results[2] || [],
      partners: results[3] || []
    };
  }

  window.PurpleLeaseData = {
    fetchYoutubeVideos: fetchYoutubeVideos,
    fetchYoutubeHomeMain: fetchYoutubeHomeMain,
    fetchYoutubeHomeFeatured: fetchYoutubeHomeFeatured,
    fetchYoutubeAll: fetchYoutubeAll,
    fetchYoutubeGrid: fetchYoutubeGrid,
    fetchYoutubeDetail: fetchYoutubeDetail,
    fetchYoutubeDetailWithNav: fetchYoutubeDetailWithNav,
    fetchTimeDeals: fetchTimeDeals,
    fetchTimeSaleSettings: fetchTimeSaleSettings,
    fetchUsedCars: fetchUsedCars,
    fetchUsedCarsList: fetchUsedCarsList,
    fetchUsedCarDetail: fetchUsedCarDetail,
    fetchLeaseTransfersList: fetchLeaseTransfersList,
    fetchLeaseTransferDetail: fetchLeaseTransferDetail,
    fetchParts: fetchParts,
    fetchPartDetail: fetchPartDetail,
    fetchCustomerReviews: fetchCustomerReviews,
    fetchCustomerReviewDetail: fetchCustomerReviewDetail,
    incrementReviewViews: incrementReviewViews,
    fetchLeaseCatalog: fetchLeaseCatalog,
    fetchBlogPosts: fetchBlogPosts,
    fetchBlogHomeLatest: fetchBlogHomeLatest,
    fetchBlogHomePopular: fetchBlogHomePopular,
    incrementBlogViews: incrementBlogViews,
    submitInquiry: submitInquiry,
    submitLeaseQuote: submitLeaseQuote,
    submitLeaseCalculatorInquiry: submitLeaseCalculatorInquiry,
    submitUsedCarInquiry: submitUsedCarInquiry,
    fetchPartnersPageSettings: fetchPartnersPageSettings,
    fetchPartnersTags: fetchPartnersTags,
    fetchPartnersRegions: fetchPartnersRegions,
    fetchPartnersList: fetchPartnersList,
    fetchPartnerById: fetchPartnerById,
    fetchPartnersBundle: fetchPartnersBundle,
    isConfigured: function () { return hasSupabaseConfig(); }
  };
})();

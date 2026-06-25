/**
 * Supabase 데이터 로더 — 퍼플리스 전 페이지 공통
 */
(function () {
  'use strict';

  function getClient() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    if (cfg.url.indexOf('YOUR_') === 0 || cfg.anonKey.indexOf('YOUR_') === 0) return null;
    if (!cfg.anonKey || cfg.anonKey.length < 10) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
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

  async function fetchUsedCars() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('used_cars')
      .select('badge,badge_class,name,meta,price,detail_slug,thumb_url,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        badge: r.badge,
        badgeClass: r.badge_class,
        name: r.name,
        meta: r.meta,
        price: r.price,
        slug: r.detail_slug,
        thumb: r.thumb_url
      };
    });
  }

  async function fetchUsedCarsList() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('used_cars')
      .select('listing_id,origin,name,year,fuel,mileage,price_num,brand,segment,status,photo_count,thumb_url,tags,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.listing_id,
        origin: r.origin || 'domestic',
        name: r.name,
        year: r.year,
        fuel: r.fuel,
        mileage: r.mileage,
        price: r.price_num,
        brand: r.brand,
        segment: r.segment,
        status: r.status,
        photoCount: r.photo_count || 0,
        thumb: r.thumb_url,
        tags: r.tags || []
      };
    });
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
    return Object.assign({
      name: res.data.name,
      origin: res.data.origin,
      status: res.data.status,
      year: res.data.year,
      mileage: res.data.mileage,
      fuel: res.data.fuel,
      price: res.data.price_num,
      tags: res.data.tags || [],
      photos: res.data.thumb_url ? [res.data.thumb_url] : []
    }, d);
  }

  async function fetchParts() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('parts')
      .select('listing_id,brand,category,name,price,stock,thumb_url,tags,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        id: r.listing_id,
        brand: r.brand,
        category: r.category,
        name: r.name,
        price: r.price,
        stock: r.stock,
        thumb: r.thumb_url,
        tags: r.tags || []
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
    var base = {
      id: res.data.listing_id,
      brand: res.data.brand,
      category: res.data.category,
      name: res.data.name,
      price: res.data.price,
      stock: res.data.stock,
      thumb: res.data.thumb_url,
      tags: res.data.tags || []
    };
    return Object.assign(base, res.data.detail_json || {});
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
      .select('id,slug,name,origin,logo_url,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (brandsRes.error) throw brandsRes.error;
    if (!brandsRes.data || !brandsRes.data.length) return null;

    var modelsRes = await client
      .from('lease_models')
      .select('brand_id,slug,name,price_from,price_to,img_url,config_json,sort_order')
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
        models: modelsByBrand[b.id] || []
      };
      if (b.origin === 'import') imported.push(item);
      else domestic.push(item);
    });

    return { domestic: domestic, import: imported };
  }

  async function fetchBlogPosts() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('blog_posts')
      .select('title,excerpt,thumb_url,external_url,published_at,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        title: r.title,
        excerpt: r.excerpt,
        thumb: r.thumb_url,
        url: r.external_url,
        date: fmtDate(r.published_at)
      };
    });
  }

  async function submitInquiry(payload) {
    var client = getClient();
    if (!client) throw new Error('Supabase not configured');
    var res = await client.from('inquiries').insert([payload]);
    if (res.error) throw res.error;
    return res.data;
  }

  window.PurpleLeaseData = {
    fetchYoutubeVideos: fetchYoutubeVideos,
    fetchYoutubeHomeMain: fetchYoutubeHomeMain,
    fetchYoutubeHomeFeatured: fetchYoutubeHomeFeatured,
    fetchYoutubeAll: fetchYoutubeAll,
    fetchYoutubeGrid: fetchYoutubeGrid,
    fetchTimeDeals: fetchTimeDeals,
    fetchUsedCars: fetchUsedCars,
    fetchUsedCarsList: fetchUsedCarsList,
    fetchUsedCarDetail: fetchUsedCarDetail,
    fetchParts: fetchParts,
    fetchPartDetail: fetchPartDetail,
    fetchCustomerReviews: fetchCustomerReviews,
    fetchCustomerReviewDetail: fetchCustomerReviewDetail,
    incrementReviewViews: incrementReviewViews,
    fetchLeaseCatalog: fetchLeaseCatalog,
    fetchBlogPosts: fetchBlogPosts,
    submitInquiry: submitInquiry,
    isConfigured: function () { return !!getClient(); }
  };
})();

/**
 * Supabase 데이터 로더 — index.html 에서 사용
 */
(function () {
  'use strict';

  function getClient() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    if (cfg.url.indexOf('YOUR_') === 0 || cfg.anonKey.indexOf('YOUR_') === 0) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  async function fetchYoutubeVideos() {
    var client = getClient();
    if (!client) return null;
    var res = await client
      .from('youtube_videos')
      .select('video_id,title,description,thumb_url,duration,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return {
        videoId: r.video_id,
        title: r.title,
        desc: r.description,
        thumb: r.thumb_url,
        duration: r.duration
      };
    });
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
      .select('badge,badge_class,name,meta,price,detail_slug,sort_order')
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
        slug: r.detail_slug
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
    fetchTimeDeals: fetchTimeDeals,
    fetchUsedCars: fetchUsedCars,
    submitInquiry: submitInquiry,
    isConfigured: function () { return !!getClient(); }
  };
})();

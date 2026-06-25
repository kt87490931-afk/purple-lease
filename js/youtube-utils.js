/**
 * YouTube 공통 유틸 — 썸네일 자동, video_id 파싱
 */
(function () {
  'use strict';

  function parseVideoId(urlOrId) {
    if (!urlOrId) return '';
    var s = String(urlOrId).trim();
    var m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    return '';
  }

  function getThumbUrl(videoId, quality) {
    if (!videoId) return '';
    var q = quality || 'mqdefault';
    return 'https://img.youtube.com/vi/' + videoId + '/' + q + '.jpg';
  }

  function resolveThumb(videoId, thumbUrl) {
    if (thumbUrl && String(thumbUrl).indexOf('http') === 0) return thumbUrl;
    if (thumbUrl && String(thumbUrl).indexOf('/') === 0) return thumbUrl;
    return getThumbUrl(videoId);
  }

  function watchUrl(videoId) {
    return videoId ? 'https://www.youtube.com/watch?v=' + videoId : '';
  }

  function formatIsoDuration(iso) {
    if (!iso || typeof iso !== 'string') return '';
    var m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return iso;
    var h = parseInt(m[1] || '0', 10);
    var min = parseInt(m[2] || '0', 10);
    var sec = parseInt(m[3] || '0', 10);
    if (h > 0) return h + ':' + String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    return min + ':' + String(sec).padStart(2, '0');
  }

  window.YoutubeUtils = {
    parseVideoId: parseVideoId,
    getThumbUrl: getThumbUrl,
    resolveThumb: resolveThumb,
    watchUrl: watchUrl,
    formatIsoDuration: formatIsoDuration
  };
})();

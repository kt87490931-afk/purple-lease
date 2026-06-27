/**
 * UA + 터치 포인트 기반 디바이스 분류 (방문 통계용)
 */
(function (global) {
  'use strict';

  function detectDeviceType(userAgent, maxTouchPoints) {
    var ua = userAgent || '';
    var lower = ua.toLowerCase();
    var touch = maxTouchPoints || 0;

    if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini|webos/i.test(lower)) {
      return 'mobile';
    }
    if (touch > 1 && /macintosh|mac os x/i.test(ua)) {
      return 'tablet';
    }
    if (lower.indexOf('mozilla') >= 0 || lower.indexOf('windows') >= 0 || lower.indexOf('linux') >= 0 || lower.indexOf('mac') >= 0) {
      return 'desktop';
    }
    return ua ? 'unknown' : 'unknown';
  }

  function deviceTypeLabel(type) {
    switch (type) {
      case 'desktop': return 'PC';
      case 'mobile': return '모바일';
      case 'tablet': return '태블릿';
      default: return '기타';
    }
  }

  global.PurpleDeviceType = {
    detect: detectDeviceType,
    label: deviceTypeLabel
  };
})(typeof window !== 'undefined' ? window : this);

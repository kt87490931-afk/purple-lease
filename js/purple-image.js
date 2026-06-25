/**
 * 퍼플 중고차 이미지 규격 — 4:3 cover 리사이즈
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PurpleImage = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIZES = {
    THUMB: { w: 800, h: 600 },
    GALLERY: { w: 1280, h: 960 },
    MINI: { w: 128, h: 96 }
  };

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('이미지 로드 실패: ' + url)); };
      img.src = url;
    });
  }

  function drawCover(ctx, img, w, h) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(w / iw, h / ih);
    var nw = iw * scale;
    var nh = ih * scale;
    var nx = (w - nw) / 2;
    var ny = (h - nh) / 2;
    ctx.fillStyle = '#f4f2fa';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, nx, ny, nw, nh);
  }

  function resizeImageToBlob(img, width, height, quality) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    drawCover(ctx, img, width, height);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('canvas toBlob failed'));
      }, 'image/jpeg', quality || 0.88);
    });
  }

  async function resizeUrlToBlob(url, width, height, quality) {
    var img = await loadImage(url);
    return resizeImageToBlob(img, width, height, quality);
  }

  async function resizeUrlToBlobs(url, sizeMap, quality) {
    var img = await loadImage(url);
    var out = {};
    var keys = Object.keys(sizeMap || {});
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var s = sizeMap[key];
      out[key] = await resizeImageToBlob(img, s.w, s.h, quality);
    }
    return out;
  }

  function loadFileAsImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('파일 없음'));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('파일 로드 실패'));
      };
      img.src = url;
    });
  }

  async function resizeFileToBlob(file, width, height, quality) {
    var img = await loadFileAsImage(file);
    return resizeImageToBlob(img, width, height, quality);
  }

  return {
    SIZES: SIZES,
    loadImage: loadImage,
    loadFileAsImage: loadFileAsImage,
    resizeUrlToBlob: resizeUrlToBlob,
    resizeUrlToBlobs: resizeUrlToBlobs,
    resizeImageToBlob: resizeImageToBlob,
    resizeFileToBlob: resizeFileToBlob
  };
}));

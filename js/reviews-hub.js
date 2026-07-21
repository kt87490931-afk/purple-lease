/**
 * 퍼플리뷰 허브 — /reviews?tab={slug}
 * 탭은 review_tabs, 콘텐츠는 타입별 테이블(tab_id)
 */
(function () {
  'use strict';

  var PAGE_SIZE = 15;
  var boardPage = 1;
  var boardData = [];
  var currentTab = null;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function qsTab() {
    try {
      return new URLSearchParams(location.search).get('tab') || '';
    } catch (e) {
      return '';
    }
  }

  function tabHref(slug) {
    return '/reviews?tab=' + encodeURIComponent(slug);
  }

  function renderTabs(tabs, activeSlug) {
    var el = document.getElementById('reviewSubTabs');
    if (!el) return;
    el.innerHTML = (tabs || []).map(function (t) {
      var active = t.slug === activeSlug ? ' active' : '';
      return '<a href="' + tabHref(t.slug) + '" class="sub-tab' + active + '">' + esc(t.title) + '</a>';
    }).join('');
  }

  function showPane(type) {
    ['yt', 'blog', 'board'].forEach(function (k) {
      var pane = document.getElementById('pane-' + k);
      if (pane) pane.hidden = k !== type;
    });
  }

  function renderYoutube(rows) {
    var grid = document.getElementById('ytGrid');
    if (!grid) return;
    if (!rows || !rows.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">등록된 영상이 없습니다.</div>';
      return;
    }
    var carIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="#9494A3" stroke-width="1.5" width="32" height="32"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
    grid.innerHTML = rows.map(function (v) {
      var href = v.id != null ? '/youtube-detail?id=' + encodeURIComponent(v.id) : '#';
      var thumb = v.thumb
        ? '<img src="' + esc(v.thumb) + '" alt="' + esc(v.title) + '">'
        : '<div class="ph-icon">' + carIcon + '</div>';
      return (
        '<div class="yt-card" role="link" tabindex="0" data-href="' + esc(href) + '">' +
          '<div class="yt-thumb">' + thumb +
            '<div class="play-badge"><div class="play-circle"><svg viewBox="0 0 24 24" fill="#fff"><polygon points="8 5 20 12 8 19"/></svg></div></div>' +
            (v.duration ? '<span class="duration-chip">' + esc(v.duration) + '</span>' : '') +
          '</div>' +
          '<div class="yt-body"><div class="yt-title">' + esc(v.title) + '</div>' +
            '<div class="yt-meta">' + esc(v.date || '') + '</div></div>' +
        '</div>'
      );
    }).join('');
    grid.querySelectorAll('.yt-card').forEach(function (el) {
      el.addEventListener('click', function () {
        var href = el.getAttribute('data-href');
        if (href) location.href = href;
      });
    });
  }

  function renderBlog(rows) {
    var grid = document.getElementById('blogGrid');
    if (!grid) return;
    if (!rows || !rows.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">등록된 블로그 글이 없습니다.</div>';
      return;
    }
    var carIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="#9494A3" stroke-width="1.5" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>';
    grid.innerHTML = rows.map(function (b) {
      return (
        '<a class="blog-card" href="' + esc(b.url) + '" data-blog-id="' + esc(b.id) + '" target="_blank" rel="noopener">' +
          '<div class="blog-thumb">' +
            (b.thumb
              ? '<img src="' + esc(b.thumb) + '" alt="' + esc(b.title) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">'
              : '') +
            '<div class="ph-icon" style="display:' + (b.thumb ? 'none' : 'flex') + ';position:absolute;inset:0;align-items:center;justify-content:center;">' + carIcon + '</div>' +
          '</div>' +
          '<div class="blog-body"><div class="blog-title">' + esc(b.title) + '</div>' +
            '<div class="blog-meta">' + esc(b.date || '') + (b.viewCount != null ? ' · 조회 ' + b.viewCount : '') + '</div></div>' +
        '</a>'
      );
    }).join('');
    grid.querySelectorAll('a[data-blog-id]').forEach(function (a) {
      a.addEventListener('click', function () {
        var id = a.getAttribute('data-blog-id');
        if (id && window.PurpleLeaseData && window.PurpleLeaseData.incrementBlogViews) {
          window.PurpleLeaseData.incrementBlogViews(id).catch(function () {});
        }
      });
    });
  }

  function renderBoardPage() {
    var body = document.getElementById('boardBody');
    var pag = document.getElementById('pagination');
    if (!body) return;
    var total = boardData.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (boardPage > pages) boardPage = pages;
    var start = (boardPage - 1) * PAGE_SIZE;
    var slice = boardData.slice(start, start + PAGE_SIZE);
    if (!slice.length) {
      body.innerHTML = '<div class="empty-state">등록된 후기가 없습니다.</div>';
    } else {
      body.innerHTML = slice.map(function (r) {
        return (
          '<a class="board-row" href="/review-detail?id=' + encodeURIComponent(r.id) + '">' +
            '<span class="col-date">' + esc(r.date) + '</span>' +
            '<span class="col-title">' + esc(r.title) + '</span>' +
            '<span class="col-views">' + (r.views || 0) + '</span>' +
          '</a>'
        );
      }).join('');
    }
    if (pag) {
      if (pages <= 1) {
        pag.innerHTML = '';
      } else {
        var html = '';
        for (var i = 1; i <= pages; i++) {
          html += '<button type="button" class="page-btn' + (i === boardPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
        }
        pag.innerHTML = html;
        pag.querySelectorAll('.page-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            boardPage = parseInt(btn.getAttribute('data-page'), 10) || 1;
            renderBoardPage();
          });
        });
      }
    }
  }

  async function loadTabContent(tab) {
    currentTab = tab;
    var type = tab.type === 'youtube' ? 'youtube' : (tab.type === 'blog' ? 'blog' : 'board');
    showPane(type === 'youtube' ? 'yt' : type);
    var D = window.PurpleLeaseData;
    if (!D || !D.isConfigured || !D.isConfigured()) {
      if (type === 'youtube') renderYoutube([]);
      if (type === 'blog') renderBlog([]);
      if (type === 'board') { boardData = []; renderBoardPage(); }
      return;
    }
    try {
      if (type === 'youtube') {
        var yt = await D.fetchYoutubeAll({ tabId: tab.id });
        renderYoutube(yt || []);
      } else if (type === 'blog') {
        var blogs = await D.fetchBlogPosts({ tabId: tab.id });
        renderBlog(blogs || []);
      } else {
        boardData = (await D.fetchCustomerReviews({ tabId: tab.id })) || [];
        boardPage = 1;
        renderBoardPage();
      }
    } catch (e) {
      console.warn('[reviews-hub]', e);
      if (type === 'youtube') renderYoutube([]);
      if (type === 'blog') renderBlog([]);
      if (type === 'board') { boardData = []; renderBoardPage(); }
    }
  }

  async function init() {
    var D = window.PurpleLeaseData;
    var tabs = [];
    try {
      if (D && D.fetchReviewTabs) {
        tabs = (await D.fetchReviewTabs({ activeOnly: true })) || [];
      }
    } catch (e) {
      console.warn('[reviews-hub] tabs', e);
    }
    if (!tabs.length) {
      tabs = [
        { id: 1, slug: 'purple-youtube', title: '퍼플오토 유튜브', type: 'youtube' },
        { id: 2, slug: 'purple-blog', title: '퍼플오토 블로그', type: 'blog' },
        { id: 3, slug: 'customer-reviews', title: '고객후기', type: 'board' }
      ];
    }
    var want = qsTab();
    var active = null;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].slug === want) { active = tabs[i]; break; }
    }
    if (!active) active = tabs[0];
    if (want !== active.slug) {
      history.replaceState(null, '', tabHref(active.slug));
    }
    renderTabs(tabs, active.slug);
    document.title = (active.title || '후기') + ' | 퍼플오토';
    await loadTabContent(active);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

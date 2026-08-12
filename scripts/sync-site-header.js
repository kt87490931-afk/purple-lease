/**
 * One-off: sync site-header.css + remove duplicated inline header/nav CSS
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_VER = '20260710b';
const SITE_HEADER_VER = '20260812b';
const CATEGORY_NAV_VER = '20260812a';
const SITE_HEADER_LINK = `<link rel="stylesheet" href="/css/site-header.css?v=${SITE_HEADER_VER}">`;
const CATEGORY_NAV_LINK_RE = /<link rel="stylesheet" href="\/css\/category-nav\.css\?v=[^"]+">/;

const PHONE_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6C3CE0" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

const HEADER_ACTIONS = `    <div class="header-actions">
      <a href="tel:1555-6362" class="header-call">
        ${PHONE_SVG}
        <span class="label">1555-6362</span>
      </a>
      <button type="button" class="icon-btn mobile-menu-trigger" data-mobile-menu-open aria-label="전체 메뉴" aria-expanded="false" aria-controls="mobileMenuDrawer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15151D" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>`;

const CSS_BLOCK_RE = /\/\* --- Header[^*]*\*\/\s*[\s\S]*?(?=\n(?:\/\*|\.btn|\.bottom-tabbar|\.page-|\.hero-|\.section|\.wrap|\.eyebrow|@media))/;

const RULES_TO_STRIP = [
  /\.site-header\s*\{[^}]*\}\s*/g,
  /\.header-inner\s*\{[^}]*\}\s*/g,
  /\.logo\s*\{[^}]*\}\s*/g,
  /\.logo\s+\.logo-p\s*\{[^}]*\}\s*/g,
  /\.logo\s+\.logo-rest\s*\{[^}]*\}\s*/g,
  /\.logo\s+\.logo-img\s*\{[^}]*\}\s*/g,
  /^\.logo-img\s*\{[^}]*\}\s*/gm,
  /\.footer-logo\s+img,\s*\.footer-logo-img\s*\{[^}]*\}\s*/g,
  /^\.footer-logo-img\s*\{[^}]*\}\s*/gm,
  /\.header-call\s*\{[^}]*\}\s*/g,
  /\.header-call\s+\.num\s*\{[^}]*\}\s*/g,
  /\.icon-btn:not\(\[data-mobile-menu-open\]\)\s*\{[^}]*\}\s*/g,
  /^\.icon-btn\s*\{[^}]*\}\s*/gm,
  /\.category-nav\s*\{[^}]*\}\s*/g,
  /\.category-nav\s+a\s*\{[^}]*\}\s*/g,
  /\.category-nav\s+a\.active\s*\{[^}]*\}\s*/g,
  /\/\* --- Header \(메인과 동일\) --- \*\/\s*/g,
];

function stripHeaderCss(content) {
  let out = content.replace(CSS_BLOCK_RE, '');
  for (const re of RULES_TO_STRIP) {
    out = out.replace(re, '');
  }
  // cleanup double blank lines in style
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

function ensureCssLinks(content) {
  const catLink = `<link rel="stylesheet" href="/css/category-nav.css?v=${CATEGORY_NAV_VER}">`;
  let out = content;

  if (CATEGORY_NAV_LINK_RE.test(out)) {
    out = out.replace(CATEGORY_NAV_LINK_RE, catLink);
  }

  if (!out.includes('site-header.css')) {
    if (out.includes('category-nav.css')) {
      out = out.replace(
        `<link rel="stylesheet" href="/css/category-nav.css?v=${CATEGORY_NAV_VER}">`,
        `${SITE_HEADER_LINK}\n<link rel="stylesheet" href="/css/category-nav.css?v=${CATEGORY_NAV_VER}">`
      );
    } else if (out.includes('</head>')) {
      out = out.replace('</head>', `${SITE_HEADER_LINK}\n${catLink}\n</head>`);
    }
  } else {
    out = out.replace(/site-header\.css\?v=[^"]+/, `site-header.css?v=${SITE_HEADER_VER}`);
  }

  // ensure mobile-menu.css before category-nav.js or at end before body close
  const mobileCss = `<link rel="stylesheet" href="/css/mobile-menu.css?v=${CSS_VER}">`;
  const mobileJs = `<script src="/js/mobile-menu.js?v=${CSS_VER}"></script>`;
  if (!out.includes('mobile-menu.css')) {
    if (out.includes('category-nav.js')) {
      out = out.replace(
        /<script src="\/js\/category-nav\.js/,
        `${mobileCss}\n<script src="/js/category-nav.js`
      );
    } else if (out.includes('</body>')) {
      out = out.replace('</body>', `${mobileCss}\n${mobileJs}\n</body>`);
    }
  } else {
    out = out.replace(/mobile-menu\.css\?v=[^"]+/, `mobile-menu.css?v=${CSS_VER}`);
  }
  if (!out.includes('mobile-menu.js')) {
    if (out.includes('category-nav.js')) {
      out = out.replace(
        /(<script src="\/js\/category-nav\.js[^>]+><\/script>)/,
        `$1\n${mobileJs}`
      );
    }
  } else {
    out = out.replace(/mobile-menu\.js\?v=[^"]+/, `mobile-menu.js?v=${CSS_VER}`);
  }

  return out;
}

function fixHeaderMarkup(content) {
  // Already has header-actions with hamburger
  if (content.includes('header-actions') && content.includes('data-mobile-menu-open')) {
    return content;
  }

  // estimate inline flex wrapper
  content = content.replace(
    /<div style="display:\s*flex;\s*align-items:\s*center;\s*gap:\s*10px;">\s*<a href="tel:1555-6362" class="header-call">[\s\S]*?<\/a>\s*<\/div>/,
    HEADER_ACTIONS
  );

  // header-actions without hamburger (index partial)
  if (content.includes('class="header-actions"') && !content.includes('data-mobile-menu-open')) {
    content = content.replace(
      /(<div class="header-actions">\s*<a href="tel:1555-6362" class="header-call">[\s\S]*?<\/a>)\s*(<\/div>)/,
      `$1\n      <button type="button" class="icon-btn mobile-menu-trigger" data-mobile-menu-open aria-label="전체 메뉴" aria-expanded="false" aria-controls="mobileMenuDrawer">\n        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15151D" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>\n      </button>\n    $2`
    );
    return content;
  }

  // direct header-call (various span/text patterns)
  const callRe = /\s*<a href="tel:1555-6362" class="header-call">[\s\S]*?<\/a>\s*(?=\n\s*<\/div>\s*\n\s*<nav class="category-nav">)/;
  if (callRe.test(content)) {
    content = content.replace(callRe, '\n' + HEADER_ACTIONS + '\n');
  }

  return content;
}

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const targets = files.filter((f) => {
  const c = fs.readFileSync(path.join(ROOT, f), 'utf8');
  return c.includes('category-nav') || c.includes('site-header');
});

let changed = [];
for (const file of targets) {
  const fp = path.join(ROOT, file);
  let content = fs.readFileSync(fp, 'utf8');
  const orig = content;
  content = stripHeaderCss(content);
  content = ensureCssLinks(content);
  content = fixHeaderMarkup(content);
  if (content !== orig) {
    fs.writeFileSync(fp, content, 'utf8');
    changed.push(file);
  }
}

console.log('Updated:', changed.join(', ') || '(none)');

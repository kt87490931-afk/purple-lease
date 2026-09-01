#!/usr/bin/env python3
"""DB seo_settings + seo_page_meta → 공개 HTML 정적 meta 블록 반영 (SNS 크롤러용)"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

WEB_ROOT = os.environ.get('WEB_ROOT', '/var/www/purple-lease')
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://zliclwgiaqvilnnookyi.supabase.co').rstrip('/')
ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
STAMP_FILE = os.path.join(WEB_ROOT, '.seo-static-sync.json')

PAGE_TO_HTML = {
    '/': 'index.html',
    '/estimate': 'estimate.html',
    '/used-cars': 'used-cars.html',
    '/used-car-detail': 'used-car-detail.html',
    '/parts-register': 'parts-register.html',
    '/parts-detail': 'parts-detail.html',
    '/reviews-customer': 'reviews-customer.html',
    '/reviews-youtube': 'reviews-youtube.html',
    '/reviews-blog': 'reviews-blog.html',
    '/review-detail': 'review-detail.html',
    '/reviews': 'reviews.html',
}


def esc_attr(s):
    return (s or '').replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')


def esc_html(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;')


def page_url(site_url, page_path):
    base = (site_url or 'https://purpleauto.co.kr').rstrip('/')
    return base + '/' if page_path == '/' else base + page_path


def build_meta_block(site_name, site_url, og_image, row):
    title = row.get('title') or site_name
    description = row.get('description') or ''
    keywords = row.get('meta_keywords') or ''
    og_title = row.get('og_title') or title
    og_desc = row.get('og_description') or description
    twitter_desc = row.get('twitter_description') or og_desc
    canonical = page_url(site_url, row.get('page_path') or '/')
    lines = []
    if description:
        lines.append(f'<meta name="description" content="{esc_attr(description)}">')
    if keywords:
        lines.append(f'<meta name="keywords" content="{esc_attr(keywords)}">')
    lines.append(f'<link rel="canonical" href="{esc_attr(canonical)}">')
    lines.extend([
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{esc_attr(site_name)}">',
        f'<meta property="og:title" content="{esc_attr(og_title)}">',
    ])
    if og_desc:
        lines.append(f'<meta property="og:description" content="{esc_attr(og_desc)}">')
    lines.extend([
        f'<meta property="og:url" content="{esc_attr(canonical)}">',
        f'<meta property="og:image" content="{esc_attr(og_image)}">',
        '<meta property="og:locale" content="ko_KR">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{esc_attr(og_title)}">',
    ])
    if twitter_desc:
        lines.append(f'<meta name="twitter:description" content="{esc_attr(twitter_desc)}">')
    lines.append(f'<meta name="twitter:image" content="{esc_attr(og_image)}">')
    return '\n'.join(lines) + '\n'


def sb_get(path):
    if not ANON_KEY:
        raise RuntimeError('SUPABASE_ANON_KEY required')
    req = urllib.request.Request(
        SUPABASE_URL + path,
        headers={
            'apikey': ANON_KEY,
            'Authorization': 'Bearer ' + ANON_KEY,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode('utf-8'))


def patch_verification_meta(content, settings):
    google = (settings.get('google_verification') or '').strip()
    naver = (settings.get('naver_verification') or '').strip()
    content = re.sub(r'\s*<meta name="google-site-verification"[^>]*>\n?', '\n', content, flags=re.IGNORECASE)
    content = re.sub(r'\s*<meta name="naver-site-verification"[^>]*>\n?', '\n', content, flags=re.IGNORECASE)
    if not google and not naver:
        return content
    lines = []
    if google:
        lines.append(f'<meta name="google-site-verification" content="{esc_attr(google)}">')
    if naver:
        lines.append(f'<meta name="naver-site-verification" content="{esc_attr(naver)}">')
    block = '\n'.join(lines) + '\n'
    vp = re.search(r'<meta name="viewport"[^>]*>\n?', content, re.IGNORECASE)
    if vp:
        insert_at = vp.end()
        return content[:insert_at] + block + content[insert_at:]
    cs = re.search(r'<meta charset="[^"]*">\n?', content, re.IGNORECASE)
    if cs:
        insert_at = cs.end()
        return content[:insert_at] + block + content[insert_at:]
    return content


def read_html(html_path):
    with open(html_path, 'r', encoding='utf-8-sig') as f:
        return f.read()


def write_html(html_path, content):
    with open(html_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)


def list_public_html_files():
    skip = {'admin.html', 'admin-login.html'}
    out = []
    for name in os.listdir(WEB_ROOT):
        if name.endswith('.html') and name not in skip:
            out.append(os.path.join(WEB_ROOT, name))
    return sorted(out)


def strip_bom_from_all_html():
    """UTF-8 BOM(EF BB BF) 제거 — 네이버·구글 소유확인 파서 호환"""
    stripped = []
    for html_path in list_public_html_files():
        raw = open(html_path, 'rb').read()
        if not raw.startswith(b'\xef\xbb\xbf'):
            continue
        write_html(html_path, raw[3:].decode('utf-8'))
        stripped.append(os.path.basename(html_path))
        print(f'[patch-seo] stripped BOM {os.path.basename(html_path)}')
    return stripped


def patch_html_verification(html_path, settings):
    content = read_html(html_path)
    new_content = patch_verification_meta(content, settings)
    if new_content == content:
        return False
    write_html(html_path, new_content)
    return True


def patch_html_file(html_path, meta_block, title):
    content = read_html(html_path)
    pattern = re.compile(
        r'(<link rel="apple-touch-icon"[^>]*>\n)(.*?)(<title>[^<]*</title>)',
        re.DOTALL,
    )
    new_title = '<title>' + esc_html(title) + '</title>'
    if not pattern.search(content):
        print(f'[patch-seo] skip pattern: {html_path}', file=sys.stderr)
        return False
    new_content = pattern.sub(r'\1' + meta_block + new_title, content, count=1)
    if new_content == content:
        return False
    write_html(html_path, new_content)
    return True


def load_stamp():
    if not os.path.isfile(STAMP_FILE):
        return ''
    try:
        with open(STAMP_FILE, 'r', encoding='utf-8') as f:
            return json.load(f).get('signature', '')
    except Exception:
        return ''


def save_stamp(signature, patched):
    payload = {
        'signature': signature,
        'patched_at': datetime.now(timezone.utc).isoformat(),
        'files': patched,
    }
    with open(STAMP_FILE, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def main():
    force = '--force' in sys.argv
    settings_rows = sb_get('/rest/v1/seo_settings?id=eq.1&select=*')
    if not settings_rows:
        print('[patch-seo] no seo_settings')
        return 0
    settings = settings_rows[0]
    pages = sb_get('/rest/v1/seo_page_meta?select=*&order=page_path')
    site_name = settings.get('site_name') or '퍼플오토'
    site_url = settings.get('site_url') or 'https://purpleauto.co.kr'
    og_image = settings.get('og_image_url') or (site_url.rstrip('/') + '/assets/brand-logos/og-image.png')
    signature = json.dumps({'settings': settings, 'pages': pages}, ensure_ascii=False, sort_keys=True)
    if not force and signature == load_stamp():
        print('[patch-seo] unchanged — skip')
        return 0
    patched = []
    verify_patched = []
    bom_stripped = strip_bom_from_all_html()
    for html_path in list_public_html_files():
        html_name = os.path.basename(html_path)
        if patch_html_verification(html_path, settings):
            verify_patched.append(html_name)
            print(f'[patch-seo] verification {html_name}')
    for row in pages:
        page_path = row.get('page_path')
        html_name = PAGE_TO_HTML.get(page_path)
        if not html_name:
            continue
        html_path = os.path.join(WEB_ROOT, html_name)
        if not os.path.isfile(html_path):
            print(f'[patch-seo] missing file: {html_path}', file=sys.stderr)
            continue
        meta = build_meta_block(site_name, site_url, og_image, row)
        title = row.get('title') or site_name
        if patch_html_file(html_path, meta, title):
            patched.append(html_name)
            print(f'[patch-seo] patched {html_name}')
    save_stamp(signature, patched + verify_patched + bom_stripped)
    print(
        f'[patch-seo] OK — meta {len(patched)} · verification {len(verify_patched)} · BOM {len(bom_stripped)} file(s)'
    )
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'[patch-seo] ERROR: {exc}', file=sys.stderr)
        sys.exit(1)

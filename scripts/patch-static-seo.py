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


def patch_html_file(html_path, meta_block, title):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
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
    with open(html_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_content)
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
    save_stamp(signature, patched)
    print(f'[patch-seo] OK — {len(patched)} file(s)')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'[patch-seo] ERROR: {exc}', file=sys.stderr)
        sys.exit(1)

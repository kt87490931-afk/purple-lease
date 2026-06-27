-- SEO 설정 (퍼플오토) — Supabase SQL Editor에서 Run

CREATE TABLE IF NOT EXISTS seo_settings (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name           TEXT NOT NULL DEFAULT '퍼플오토',
  title_suffix        TEXT NOT NULL DEFAULT '| 퍼플오토',
  default_description TEXT NOT NULL DEFAULT '퍼플오토 — 오토리스·장기렌트·리스·중고차·수입차부품 전문. 무료 견적과 맞춤 상담을 받아보세요.',
  og_image_url        TEXT NOT NULL DEFAULT 'https://purpleauto.co.kr/assets/brand-logos/purple-logo.png',
  google_verification TEXT NOT NULL DEFAULT '',
  naver_verification  TEXT NOT NULL DEFAULT '',
  site_url            TEXT NOT NULL DEFAULT 'https://purpleauto.co.kr',
  robots_extra        TEXT NOT NULL DEFAULT '',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seo_page_meta (
  id                 BIGSERIAL PRIMARY KEY,
  page_path          TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL DEFAULT '',
  description        TEXT NOT NULL DEFAULT '',
  og_title           TEXT NOT NULL DEFAULT '',
  noindex            BOOLEAN NOT NULL DEFAULT false,
  sitemap_priority   NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  sitemap_changefreq TEXT NOT NULL DEFAULT 'weekly',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO seo_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO seo_page_meta (page_path, title, description, sitemap_priority, sitemap_changefreq) VALUES
  ('/reviews-customer', '고객후기 | 퍼플오토', '퍼플오토 고객후기 — 장기렌트·리스 출고 후기를 확인하세요.', 1.0, 'daily'),
  ('/reviews-youtube', '퍼플오토 유튜브 | 퍼플오토', '퍼플오토 공식 유튜브 — 차량 리뷰·출고 영상.', 0.95, 'weekly'),
  ('/reviews-blog', '퍼플오토 블로그 | 퍼플오토', '퍼플오토 블로그 — 자동차·렌트 정보 글.', 0.95, 'weekly'),
  ('/review-detail', '후기 상세 | 퍼플오토', '퍼플오토 고객후기 상세.', 0.9, 'weekly'),
  ('/', '퍼플오토 — 오토리스 · 장기렌트 승계매입전문업체', '퍼플오토 — 무보증 장기렌트·리스·승계매입·중고차 전문.', 0.85, 'daily'),
  ('/estimate', '간편견적 | 퍼플오토', '비대면 간편 견적 — 국산·수입 신차 리스·장기렌트 견적.', 0.8, 'weekly'),
  ('/used-cars', '중고차 매물 | 퍼플오토', '퍼플오토 중고차 매물 목록.', 0.7, 'daily'),
  ('/used-car-detail', '중고차 상세 | 퍼플오토', '퍼플오토 중고차 상세 정보.', 0.65, 'weekly'),
  ('/parts-register', '수입차부품 | 퍼플오토', '수입차 순정·호환 부품.', 0.6, 'weekly'),
  ('/parts-detail', '부품 상세 | 퍼플오토', '수입차 부품 상세.', 0.55, 'weekly')
ON CONFLICT (page_path) DO NOTHING;

ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_page_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_seo_settings" ON seo_settings;
CREATE POLICY "public_read_seo_settings" ON seo_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_seo_page_meta" ON seo_page_meta;
CREATE POLICY "public_read_seo_page_meta" ON seo_page_meta FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_seo_settings" ON seo_settings;
CREATE POLICY "admin_write_seo_settings" ON seo_settings
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_seo_page_meta" ON seo_page_meta;
CREATE POLICY "admin_write_seo_page_meta" ON seo_page_meta
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

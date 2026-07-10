-- 완납승계 인수·판매 소개 페이지 CMS (paid_transfer_page)
-- Supabase SQL Editor 또는 deploy/run-migration-paid-transfer-page.sh

CREATE TABLE IF NOT EXISTS paid_transfer_page (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO paid_transfer_page (id, content_json) VALUES (1, '{
  "eyebrow": "About",
  "headline_line1": "불편하고 비합리적인",
  "headline_accent": "리스or장기렌트 매각 서비스",
  "headline_line3": "혁신하기 위해 출발했습니다.",
  "sub_copy": "리스나 렌트 중도해지 위약금이 너무 많다고?\n인증되지 않은 업체의 불합리한 감가가 고민이라면?\n퍼플오토와 함께해요!",
  "cards": [
    {
      "desc": "오직 고객님만을 위한 1:1 다이렉트 승계담당자 배정 후 모든 업무를 대행해드립니다.",
      "title_main": "승계대행",
      "title_accent": "시스템"
    },
    {
      "desc": "중도해지 시 발생되는 위약금(패널티) 때문에 걱정이라면??",
      "title_main": "비교견적",
      "title_accent": "서비스"
    },
    {
      "desc": "전국 12개의 제휴업체와 함께 전국 어디서든 편하게 차량검수를 받을 수 있습니다.",
      "title_main": "방문검수",
      "title_accent": "시스템"
    }
  ],
  "cta_label": "더 알아보기",
  "cta_url": "",
  "cta_new_tab": false
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE paid_transfer_page ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_paid_transfer_page" ON paid_transfer_page;
CREATE POLICY "public_read_paid_transfer_page" ON paid_transfer_page
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_paid_transfer_page" ON paid_transfer_page;
CREATE POLICY "admin_write_paid_transfer_page" ON paid_transfer_page
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

INSERT INTO seo_page_meta (page_path, title, description, og_title, sitemap_priority, sitemap_changefreq) VALUES
  ('/paid-transfer', '완납승계 인수 · 판매 | 퍼플오토', '리스·장기렌트 완납승계 인수·판매 서비스. 승계대행, 비교견적, 방문검수까지 퍼플오토와 함께하세요.', '완납승계 인수 · 판매 | 퍼플오토', 0.72, 'weekly')
ON CONFLICT (page_path) DO NOTHING;

SELECT 'paid_transfer_page migration OK' AS result;

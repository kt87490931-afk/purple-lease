-- 히어로 배너 슬라이드 (메인 index) — 최대 4장, A안 빌더 + HTML 타입
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS hero_slides (
  id BIGSERIAL PRIMARY KEY,
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  slide_type TEXT NOT NULL DEFAULT 'builder',
  bg_image_url TEXT NOT NULL DEFAULT '',
  kicker_text TEXT NOT NULL DEFAULT '',
  kicker_font_size TEXT NOT NULL DEFAULT 'sm',
  kicker_color TEXT NOT NULL DEFAULT '',
  kicker_align TEXT NOT NULL DEFAULT 'left',
  title_text TEXT NOT NULL DEFAULT '',
  title_font_size TEXT NOT NULL DEFAULT 'lg',
  title_color TEXT NOT NULL DEFAULT '',
  title_align TEXT NOT NULL DEFAULT 'left',
  desc_text TEXT NOT NULL DEFAULT '',
  desc_font_size TEXT NOT NULL DEFAULT 'md',
  desc_color TEXT NOT NULL DEFAULT '',
  desc_align TEXT NOT NULL DEFAULT 'left',
  buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  html_content TEXT NOT NULL DEFAULT '',
  overlay_opacity NUMERIC NOT NULL DEFAULT 0.35,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hero_slides_type_check CHECK (slide_type IN ('builder', 'html'))
);

CREATE INDEX IF NOT EXISTS idx_hero_slides_sort ON hero_slides (sort_order ASC, id ASC);

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hero_slides" ON hero_slides;
CREATE POLICY "public_read_hero_slides" ON hero_slides
  FOR SELECT TO anon, authenticated
  USING (is_enabled = true);

DROP POLICY IF EXISTS "admin_write_hero_slides" ON hero_slides;
CREATE POLICY "admin_write_hero_slides" ON hero_slides
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

-- 초기 데이터 (테이블 비어 있을 때만)
INSERT INTO hero_slides (
  sort_order, is_enabled, slide_type, kicker_text, title_text, desc_text, buttons
)
SELECT * FROM (VALUES
  (0, true, 'builder', '🎉 신규 가입 이벤트',
   E'선납금 0원, 보증금 걱정 없는\n무보증 장기렌트 특가',
   '퍼플오토와 함께라면 목돈 부담 없이 원하는 차를 탈 수 있습니다. 지금 바로 무료 견적을 받아보세요.',
   '[{"label":"무료 견적받기","href":"/estimate","style":"primary"},{"label":"타임특가 보기","href":"#timesale","style":"outline"}]'::jsonb),
  (1, true, 'builder', '🚗 승계매입 전문',
   E'타고 있는 리스·렌트차,\n위약금 없이 승계하세요',
   '오토리스·장기렌트 승계매입 전문업체 퍼플오토가 잔여 계약을 안전하게 인수해드립니다.',
   '[{"label":"승계 상담받기","href":"/estimate","style":"primary"},{"label":"중고매물 보기","href":"/used-cars","style":"outline"}]'::jsonb),
  (2, true, 'builder', '⚡ 5일 이내 출고',
   E'기다림 없이 받는\n즉시출고 차량 모음',
   '인기 모델 즉시출고 재고를 지금 확인하세요. 빠르게 타고 싶은 분께 추천합니다.',
   '[{"label":"즉시출고 확인","href":"/estimate","style":"primary"}]'::jsonb)
) AS v(sort_order, is_enabled, slide_type, kicker_text, title_text, desc_text, buttons)
WHERE NOT EXISTS (SELECT 1 FROM hero_slides LIMIT 1);

SELECT 'hero slides migration OK' AS result, COUNT(*)::int AS slide_count FROM hero_slides;

-- 히어로 슬라이드 배너 전체 클릭 링크
-- Supabase SQL Editor 또는 deploy/run-migration-hero-slide-link.sh 실행

ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS link_url TEXT NOT NULL DEFAULT '';

SELECT 'hero slide link_url migration OK' AS result;

-- 유튜브 메인/추천 노출 필드 (SQL Editor에서 Run)
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS is_home_main BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS is_home_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_youtube_home_main ON youtube_videos (is_home_main) WHERE is_home_main = true;
CREATE INDEX IF NOT EXISTS idx_youtube_home_featured ON youtube_videos (is_home_featured) WHERE is_home_featured = true;

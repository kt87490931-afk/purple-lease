-- 퍼플리뷰 동적 탭 CMS
-- Supabase SQL Editor 또는 deploy/run-migration-review-tabs.sh

CREATE TABLE IF NOT EXISTS review_tabs (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('blog', 'youtube', 'board')),
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO review_tabs (id, slug, title, type, sort_order, is_active, is_system) VALUES
  (1, 'purple-youtube', '퍼플오토 유튜브', 'youtube', 10, true, true),
  (2, 'purple-blog', '퍼플오토 블로그', 'blog', 20, true, true),
  (3, 'customer-reviews', '고객후기', 'board', 30, true, true)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_order = EXCLUDED.sort_order,
  is_system = EXCLUDED.is_system,
  is_active = true,
  updated_at = now();

SELECT setval(pg_get_serial_sequence('review_tabs', 'id'), GREATEST((SELECT MAX(id) FROM review_tabs), 3));

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tab_id BIGINT REFERENCES review_tabs(id);
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS tab_id BIGINT REFERENCES review_tabs(id);
ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS tab_id BIGINT REFERENCES review_tabs(id);

UPDATE blog_posts SET tab_id = 2 WHERE tab_id IS NULL;
UPDATE youtube_videos SET tab_id = 1 WHERE tab_id IS NULL;
UPDATE customer_reviews SET tab_id = 3 WHERE tab_id IS NULL;

ALTER TABLE blog_posts ALTER COLUMN tab_id SET DEFAULT 2;
ALTER TABLE youtube_videos ALTER COLUMN tab_id SET DEFAULT 1;
ALTER TABLE customer_reviews ALTER COLUMN tab_id SET DEFAULT 3;

DO $$
BEGIN
  ALTER TABLE blog_posts ALTER COLUMN tab_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE youtube_videos ALTER COLUMN tab_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE customer_reviews ALTER COLUMN tab_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_posts_tab_id ON blog_posts(tab_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_tab_id ON youtube_videos(tab_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_tab_id ON customer_reviews(tab_id);
CREATE INDEX IF NOT EXISTS idx_review_tabs_sort ON review_tabs(sort_order, id);

ALTER TABLE review_tabs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_review_tabs" ON review_tabs;
CREATE POLICY "public_read_review_tabs" ON review_tabs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_write_review_tabs" ON review_tabs;
CREATE POLICY "admin_write_review_tabs" ON review_tabs
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

-- 공개는 활성 탭만 읽도록 재정의
DROP POLICY IF EXISTS "public_read_review_tabs" ON review_tabs;
CREATE POLICY "public_read_review_tabs" ON review_tabs
  FOR SELECT USING (is_active = true);

INSERT INTO seo_page_meta (page_path, title, description, og_title, sitemap_priority, sitemap_changefreq) VALUES
  ('/reviews', '후기 | 퍼플오토', '퍼플오토 유튜브 · 블로그 · 고객후기를 한곳에서 확인하세요.', '후기 | 퍼플오토', 1.0, 'daily')
ON CONFLICT (page_path) DO NOTHING;

SELECT 'migration-review-tabs OK' AS result,
  (SELECT COUNT(*) FROM review_tabs) AS tab_cnt,
  (SELECT COUNT(*) FROM blog_posts WHERE tab_id = 2) AS blog_seed,
  (SELECT COUNT(*) FROM youtube_videos WHERE tab_id = 1) AS yt_seed,
  (SELECT COUNT(*) FROM customer_reviews WHERE tab_id = 3) AS board_seed;

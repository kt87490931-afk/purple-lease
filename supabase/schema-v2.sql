-- 퍼플리스 Supabase 스키마 v2 (기존 schema.sql 실행 후 이 파일 실행)
-- SQL Editor에서 전체 복사 후 Run

-- ========== 중고차 목록 필드 확장 ==========
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS listing_id INT UNIQUE;
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'domestic';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS fuel TEXT DEFAULT '';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS mileage INT DEFAULT 0;
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS price_num INT DEFAULT 0;
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT '';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT '';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '판매중';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS photo_count INT DEFAULT 0;
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS thumb_url TEXT DEFAULT '';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS detail_json JSONB;

-- ========== 수입차 부품 ==========
CREATE TABLE IF NOT EXISTS parts (
  id            BIGSERIAL PRIMARY KEY,
  listing_id    INT NOT NULL UNIQUE,
  brand         TEXT NOT NULL DEFAULT 'tesla',
  category      TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL DEFAULT '',
  price         INT NOT NULL DEFAULT 0,
  stock         TEXT NOT NULL DEFAULT '재고있음',
  thumb_url     TEXT NOT NULL DEFAULT '',
  tags          TEXT[] DEFAULT '{}',
  detail_json   JSONB,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 고객후기 ==========
CREATE TABLE IF NOT EXISTS customer_reviews (
  id            BIGSERIAL PRIMARY KEY,
  listing_id    INT NOT NULL UNIQUE,
  title         TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  author        TEXT NOT NULL DEFAULT '퍼플리스 고객',
  views         INT NOT NULL DEFAULT 0,
  published_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 블로그(외부 링크) ==========
CREATE TABLE IF NOT EXISTS blog_posts (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  excerpt       TEXT NOT NULL DEFAULT '',
  thumb_url     TEXT NOT NULL DEFAULT '',
  external_url  TEXT NOT NULL DEFAULT '',
  published_at  DATE,
  view_count    INT NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== RLS ==========
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_parts" ON parts;
CREATE POLICY "public_read_parts" ON parts
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_customer_reviews" ON customer_reviews;
CREATE POLICY "public_read_customer_reviews" ON customer_reviews
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_blog_posts" ON blog_posts;
CREATE POLICY "public_read_blog_posts" ON blog_posts
  FOR SELECT USING (is_active = true);

-- ========== updated_at 트리거 ==========
DROP TRIGGER IF EXISTS trg_parts_updated ON parts;
CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_reviews_updated ON customer_reviews;
CREATE TRIGGER trg_customer_reviews_updated BEFORE UPDATE ON customer_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_blog_posts_updated ON blog_posts;
CREATE TRIGGER trg_blog_posts_updated BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

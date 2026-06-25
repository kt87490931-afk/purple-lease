-- 퍼플리스 어드민 스키마 (schema.sql + schema-v2.sql 실행 후 SQL Editor에서 실행)
-- 운영자 Supabase Auth 계정 생성 후, 아래 admin_allowlist에 user_id를 등록하세요.

-- ========== 어드민 허용 목록 ==========
CREATE TABLE IF NOT EXISTS admin_allowlist (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_allowlist" ON admin_allowlist;
CREATE POLICY "admin_read_allowlist" ON admin_allowlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_purple_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_allowlist WHERE user_id = auth.uid()
  );
$$;

-- ========== 유튜브 보조 필드 ==========
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS external_url TEXT NOT NULL DEFAULT '';
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS published_at DATE;

-- ========== 신차리스 (estimate.html) ==========
CREATE TABLE IF NOT EXISTS lease_brands (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  origin      TEXT NOT NULL DEFAULT 'domestic',
  logo_url    TEXT NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lease_models (
  id          BIGSERIAL PRIMARY KEY,
  brand_id    BIGINT NOT NULL REFERENCES lease_brands(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  price_from  TEXT NOT NULL DEFAULT '',
  price_to    TEXT NOT NULL DEFAULT '',
  img_url     TEXT NOT NULL DEFAULT '',
  config_json JSONB NOT NULL DEFAULT '{}',
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);

ALTER TABLE lease_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_lease_brands" ON lease_brands;
CREATE POLICY "public_read_lease_brands" ON lease_brands
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_lease_models" ON lease_models;
CREATE POLICY "public_read_lease_models" ON lease_models
  FOR SELECT USING (is_active = true);

-- ========== 어드민 쓰기 정책 (인증 + allowlist) ==========
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'youtube_videos', 'blog_posts', 'customer_reviews', 'parts', 'used_cars',
    'time_deals', 'lease_brands', 'lease_models'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin_write_%s" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "admin_write_%s" ON %I FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin())',
      t, t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "admin_read_inquiries" ON inquiries;
CREATE POLICY "admin_read_inquiries" ON inquiries
  FOR SELECT USING (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_inquiries" ON inquiries;
CREATE POLICY "admin_write_inquiries" ON inquiries
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS usage_method TEXT NOT NULL DEFAULT '';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_inquiries_unread ON inquiries (is_read) WHERE is_read = false;

-- ========== updated_at 트리거 (lease) ==========
DROP TRIGGER IF EXISTS trg_lease_brands_updated ON lease_brands;
CREATE TRIGGER trg_lease_brands_updated BEFORE UPDATE ON lease_brands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lease_models_updated ON lease_models;
CREATE TRIGGER trg_lease_models_updated BEFORE UPDATE ON lease_models
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== Storage: 이미지 업로드 버킷 ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'purple-uploads',
  'purple-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_purple_uploads" ON storage.objects;
CREATE POLICY "public_read_purple_uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'purple-uploads');

DROP POLICY IF EXISTS "admin_upload_purple_uploads" ON storage.objects;
CREATE POLICY "admin_upload_purple_uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'purple-uploads' AND public.is_purple_admin()
  );

DROP POLICY IF EXISTS "admin_update_purple_uploads" ON storage.objects;
CREATE POLICY "admin_update_purple_uploads" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'purple-uploads' AND public.is_purple_admin()
  );

DROP POLICY IF EXISTS "admin_delete_purple_uploads" ON storage.objects;
CREATE POLICY "admin_delete_purple_uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'purple-uploads' AND public.is_purple_admin()
  );

-- ========== 조회수 증가 (고객후기 상세) ==========
CREATE OR REPLACE FUNCTION public.increment_review_views(p_listing_id INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_views INT;
BEGIN
  UPDATE customer_reviews
  SET views = views + 1
  WHERE listing_id = p_listing_id AND is_active = true
  RETURNING views INTO v_views;
  RETURN COALESCE(v_views, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_review_views(INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_blog_views(p_id BIGINT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_views INT;
BEGIN
  UPDATE blog_posts SET view_count = view_count + 1
  WHERE id = p_id AND is_active = true
  RETURNING view_count INTO v_views;
  RETURN COALESCE(v_views, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_blog_views(BIGINT) TO anon, authenticated;

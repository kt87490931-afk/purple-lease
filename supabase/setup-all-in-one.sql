-- ============================================================
-- 퍼플리스 전체 DB + 어드민 + admin/0000 계정 한번에 설치
-- Supabase Dashboard > SQL Editor > 전체 복사 > Run (1회)
-- 로그인: admin / 0000
-- ※ Authentication > Email > Minimum password length = 4 설정 필요
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 공통 함수 ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- 1) 기본 테이블 ----------
CREATE TABLE IF NOT EXISTS youtube_videos (
  id          BIGSERIAL PRIMARY KEY,
  video_id    TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  thumb_url   TEXT NOT NULL DEFAULT '',
  duration    TEXT NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_deals (
  id          BIGSERIAL PRIMARY KEY,
  badge       TEXT NOT NULL DEFAULT '',
  badge_class TEXT NOT NULL DEFAULT 'badge-grad',
  name        TEXT NOT NULL DEFAULT '',
  trim        TEXT NOT NULL DEFAULT '',
  was_price   TEXT NOT NULL DEFAULT '',
  now_price   TEXT NOT NULL DEFAULT '',
  lease_info  TEXT NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS used_cars (
  id          BIGSERIAL PRIMARY KEY,
  badge       TEXT NOT NULL DEFAULT '',
  badge_class TEXT NOT NULL DEFAULT 'badge-purple',
  name        TEXT NOT NULL DEFAULT '',
  meta        TEXT NOT NULL DEFAULT '',
  price       TEXT NOT NULL DEFAULT '',
  detail_slug TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  car_type    TEXT,
  message     TEXT,
  source_page TEXT DEFAULT 'index',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 2) v2 테이블 + 중고차 확장 ----------
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

CREATE TABLE IF NOT EXISTS blog_posts (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  excerpt       TEXT NOT NULL DEFAULT '',
  thumb_url     TEXT NOT NULL DEFAULT '',
  external_url  TEXT NOT NULL DEFAULT '',
  published_at  DATE,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 3) 어드민 테이블 ----------
CREATE TABLE IF NOT EXISTS admin_allowlist (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS external_url TEXT NOT NULL DEFAULT '';
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS published_at DATE;
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS is_home_main BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS is_home_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_youtube_home_main ON youtube_videos (is_home_main) WHERE is_home_main = true;
CREATE INDEX IF NOT EXISTS idx_youtube_home_featured ON youtube_videos (is_home_featured) WHERE is_home_featured = true;

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

-- ---------- 4) RLS 활성화 ----------
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_models ENABLE ROW LEVEL SECURITY;

-- ---------- 5) 공개 읽기 정책 ----------
DROP POLICY IF EXISTS "public_read_youtube" ON youtube_videos;
CREATE POLICY "public_read_youtube" ON youtube_videos FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_deals" ON time_deals;
CREATE POLICY "public_read_deals" ON time_deals FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_used_cars" ON used_cars;
CREATE POLICY "public_read_used_cars" ON used_cars FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_insert_inquiries" ON inquiries;
CREATE POLICY "public_insert_inquiries" ON inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_parts" ON parts;
CREATE POLICY "public_read_parts" ON parts FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_customer_reviews" ON customer_reviews;
CREATE POLICY "public_read_customer_reviews" ON customer_reviews FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_blog_posts" ON blog_posts;
CREATE POLICY "public_read_blog_posts" ON blog_posts FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_lease_brands" ON lease_brands;
CREATE POLICY "public_read_lease_brands" ON lease_brands FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_lease_models" ON lease_models;
CREATE POLICY "public_read_lease_models" ON lease_models FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_read_allowlist" ON admin_allowlist;
CREATE POLICY "admin_read_allowlist" ON admin_allowlist FOR SELECT USING (auth.uid() = user_id);

-- ---------- 6) 어드민 함수 + 쓰기 정책 ----------
CREATE OR REPLACE FUNCTION public.is_purple_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_allowlist WHERE user_id = auth.uid());
$$;

DO $$
DECLARE t TEXT;
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
CREATE POLICY "admin_read_inquiries" ON inquiries FOR SELECT USING (public.is_purple_admin());

-- ---------- 7) 트리거 ----------
DROP TRIGGER IF EXISTS trg_youtube_updated ON youtube_videos;
CREATE TRIGGER trg_youtube_updated BEFORE UPDATE ON youtube_videos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_deals_updated ON time_deals;
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON time_deals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_used_cars_updated ON used_cars;
CREATE TRIGGER trg_used_cars_updated BEFORE UPDATE ON used_cars FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_parts_updated ON parts;
CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_customer_reviews_updated ON customer_reviews;
CREATE TRIGGER trg_customer_reviews_updated BEFORE UPDATE ON customer_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_blog_posts_updated ON blog_posts;
CREATE TRIGGER trg_blog_posts_updated BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lease_brands_updated ON lease_brands;
CREATE TRIGGER trg_lease_brands_updated BEFORE UPDATE ON lease_brands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lease_models_updated ON lease_models;
CREATE TRIGGER trg_lease_models_updated BEFORE UPDATE ON lease_models FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- 8) Storage ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('purple-uploads', 'purple-uploads', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "public_read_purple_uploads" ON storage.objects;
CREATE POLICY "public_read_purple_uploads" ON storage.objects FOR SELECT USING (bucket_id = 'purple-uploads');
DROP POLICY IF EXISTS "admin_upload_purple_uploads" ON storage.objects;
CREATE POLICY "admin_upload_purple_uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'purple-uploads' AND public.is_purple_admin());
DROP POLICY IF EXISTS "admin_update_purple_uploads" ON storage.objects;
CREATE POLICY "admin_update_purple_uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'purple-uploads' AND public.is_purple_admin());
DROP POLICY IF EXISTS "admin_delete_purple_uploads" ON storage.objects;
CREATE POLICY "admin_delete_purple_uploads" ON storage.objects FOR DELETE USING (bucket_id = 'purple-uploads' AND public.is_purple_admin());

-- ---------- 9) 조회수 함수 ----------
CREATE OR REPLACE FUNCTION public.increment_review_views(p_listing_id INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_views INT;
BEGIN
  UPDATE customer_reviews SET views = views + 1
  WHERE listing_id = p_listing_id AND is_active = true
  RETURNING views INTO v_views;
  RETURN COALESCE(v_views, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_review_views(INT) TO anon, authenticated;

-- ---------- 10) admin / 0000 계정 ----------
DO $$
DECLARE
  admin_email TEXT := 'admin@purplelease.com';
  admin_password TEXT := '0000';
  admin_uid UUID := 'a0000000-0000-4000-8000-000000000001';
BEGIN
  DELETE FROM public.admin_allowlist WHERE email = admin_email OR user_id = admin_uid;
  DELETE FROM auth.identities WHERE user_id = admin_uid;
  DELETE FROM auth.users WHERE id = admin_uid OR email = admin_email;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated', admin_email,
    crypt(admin_password, gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin","display_name":"admin"}'::jsonb,
    NOW(), NOW(), '', '', '', '', false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), admin_uid,
    jsonb_build_object('sub', admin_uid::text, 'email', admin_email, 'email_verified', true, 'phone_verified', false),
    'email', admin_uid::text, NOW(), NOW(), NOW()
  );

  INSERT INTO public.admin_allowlist (user_id, email)
  VALUES (admin_uid, admin_email)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
END $$;

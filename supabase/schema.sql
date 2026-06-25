-- 퍼플리스(PURPLE LEASE) Supabase 스키마
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

-- 1) 유튜브 영상
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

-- 2) 타임특가
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

-- 3) 중고차 매물
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

-- 4) 견적/문의
CREATE TABLE IF NOT EXISTS inquiries (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  car_type    TEXT,
  message     TEXT,
  source_page TEXT DEFAULT 'index',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (활성 데이터만)
CREATE POLICY "public_read_youtube" ON youtube_videos
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_read_deals" ON time_deals
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_read_used_cars" ON used_cars
  FOR SELECT USING (is_active = true);

-- 문의 INSERT (anon 허용)
CREATE POLICY "public_insert_inquiries" ON inquiries
  FOR INSERT WITH CHECK (true);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_youtube_updated BEFORE UPDATE ON youtube_videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON time_deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_used_cars_updated BEFORE UPDATE ON used_cars
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

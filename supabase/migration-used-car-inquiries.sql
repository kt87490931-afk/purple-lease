-- 중고차 상담 문의 (used-car-detail.html 상담신청)
-- Supabase SQL Editor에서 Run

CREATE TABLE IF NOT EXISTS used_car_inquiries (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  listing_id     BIGINT NOT NULL DEFAULT 0,
  brand          TEXT NOT NULL DEFAULT '',
  vehicle_name   TEXT NOT NULL DEFAULT '',
  product_title  TEXT NOT NULL DEFAULT '',
  price          BIGINT NOT NULL DEFAULT 0,
  thumb_url      TEXT NOT NULL DEFAULT '',
  detail_url     TEXT NOT NULL DEFAULT '',
  vehicle_json   JSONB NOT NULL DEFAULT '{}',
  source_page    TEXT NOT NULL DEFAULT 'used-car-detail',
  is_read        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_used_car_inquiries_unread ON used_car_inquiries (is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_used_car_inquiries_created ON used_car_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_used_car_inquiries_listing ON used_car_inquiries (listing_id);

ALTER TABLE used_car_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_used_car_inquiries" ON used_car_inquiries;
CREATE POLICY "public_insert_used_car_inquiries" ON used_car_inquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_used_car_inquiries" ON used_car_inquiries;
CREATE POLICY "admin_read_used_car_inquiries" ON used_car_inquiries
  FOR SELECT USING (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_used_car_inquiries" ON used_car_inquiries;
CREATE POLICY "admin_write_used_car_inquiries" ON used_car_inquiries
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

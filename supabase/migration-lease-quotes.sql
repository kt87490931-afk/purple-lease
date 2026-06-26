-- 신차리스 견적 (estimate.html 최종 견적서 제출)
-- Supabase SQL Editor에서 Run

CREATE TABLE IF NOT EXISTS lease_quotes (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  origin       TEXT NOT NULL DEFAULT 'domestic',
  brand_name   TEXT NOT NULL DEFAULT '',
  model_name   TEXT NOT NULL DEFAULT '',
  quote_json   JSONB NOT NULL DEFAULT '{}',
  source_page  TEXT NOT NULL DEFAULT 'estimate',
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_quotes_unread ON lease_quotes (is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_lease_quotes_created ON lease_quotes (created_at DESC);

ALTER TABLE lease_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_lease_quotes" ON lease_quotes;
CREATE POLICY "public_insert_lease_quotes" ON lease_quotes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_lease_quotes" ON lease_quotes;
CREATE POLICY "admin_read_lease_quotes" ON lease_quotes
  FOR SELECT USING (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_lease_quotes" ON lease_quotes;
CREATE POLICY "admin_write_lease_quotes" ON lease_quotes
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

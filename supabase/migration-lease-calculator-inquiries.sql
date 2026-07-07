-- 리스·렌트 금리 계산기 견적 문의 (lease-calculator.html)
-- Supabase SQL Editor에서 Run

CREATE TABLE IF NOT EXISTS lease_calculator_inquiries (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  calc_json    JSONB NOT NULL DEFAULT '{}',
  source_page  TEXT NOT NULL DEFAULT 'lease-calculator',
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_calc_inq_unread ON lease_calculator_inquiries (is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_lease_calc_inq_created ON lease_calculator_inquiries (created_at DESC);

ALTER TABLE lease_calculator_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_lease_calc_inquiries" ON lease_calculator_inquiries;
CREATE POLICY "public_insert_lease_calc_inquiries" ON lease_calculator_inquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_lease_calc_inquiries" ON lease_calculator_inquiries;
CREATE POLICY "admin_read_lease_calc_inquiries" ON lease_calculator_inquiries
  FOR SELECT USING (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_lease_calc_inquiries" ON lease_calculator_inquiries;
CREATE POLICY "admin_write_lease_calc_inquiries" ON lease_calculator_inquiries
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

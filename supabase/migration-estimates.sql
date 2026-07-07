-- 퍼플오토 견적서 저장/불러오기 (부품 / 장기렌트·리스)
-- Supabase SQL Editor 또는 psql 로 실행 (idempotent)

CREATE TABLE IF NOT EXISTS estimates (
  id               BIGSERIAL PRIMARY KEY,
  kind             TEXT NOT NULL DEFAULT 'parts',          -- 'parts' | 'rental'
  title            TEXT NOT NULL DEFAULT '',               -- 목록 표시용 제목
  customer_name    TEXT NOT NULL DEFAULT '',
  estimate_number  TEXT NOT NULL DEFAULT '',
  estimate_date    DATE,
  data             JSONB NOT NULL DEFAULT '{}',            -- 폼 전체 데이터
  created_by       TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimates_updated ON estimates (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_kind ON estimates (kind, updated_at DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estimates_updated_at ON estimates;
CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION set_estimates_updated_at();

-- ========== RLS (어드민 전용) ==========
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_estimates" ON estimates;
CREATE POLICY "admin_read_estimates" ON estimates
  FOR SELECT TO authenticated
  USING (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_estimates" ON estimates;
CREATE POLICY "admin_write_estimates" ON estimates
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

-- service role(cron/서버)은 RLS bypass

SELECT 'estimates migration OK' AS result;

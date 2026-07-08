-- 리스 · 장기렌트 일반승계 매물 (어드민 직접 등록, swautopia 동기화 없음)
-- Supabase SQL Editor 또는 psql 로 실행 (idempotent)

CREATE TABLE IF NOT EXISTS lease_transfers (
  id            BIGSERIAL PRIMARY KEY,
  listing_id    INT UNIQUE NOT NULL,
  badge         TEXT NOT NULL DEFAULT '',
  badge_class   TEXT NOT NULL DEFAULT 'badge-purple',
  name          TEXT NOT NULL DEFAULT '',
  meta          TEXT NOT NULL DEFAULT '',
  price         TEXT NOT NULL DEFAULT '',
  detail_slug   TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  origin        TEXT DEFAULT 'domestic',
  year          INT,
  fuel          TEXT DEFAULT '',
  mileage       INT DEFAULT 0,
  price_num     INT DEFAULT 0,
  brand         TEXT DEFAULT '',
  segment       TEXT DEFAULT '',
  status        TEXT DEFAULT '판매중',
  photo_count   INT DEFAULT 0,
  thumb_url     TEXT DEFAULT '',
  tags          TEXT[] DEFAULT '{}',
  detail_json   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_transfers_active_sort
  ON lease_transfers (is_active, sort_order);

ALTER TABLE lease_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_lease_transfers" ON lease_transfers;
CREATE POLICY "public_read_lease_transfers" ON lease_transfers
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_write_lease_transfers" ON lease_transfers;
CREATE POLICY "admin_write_lease_transfers" ON lease_transfers
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

DROP TRIGGER IF EXISTS trg_lease_transfers_updated ON lease_transfers;
CREATE TRIGGER trg_lease_transfers_updated
  BEFORE UPDATE ON lease_transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

SELECT 'lease_transfers migration OK' AS result;

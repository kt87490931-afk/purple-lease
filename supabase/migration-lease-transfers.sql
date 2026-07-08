-- 리스 · 장기렌트 일반승계 매물 (어드민 직접 등록, swautopia 동기화 없음)
-- Supabase 대시보드 → SQL Editor 에서 전체 실행 (idempotent)

-- updated_at 함수 (없으면 생성)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "admin_write_lease_transfers" ON lease_transfers;
CREATE POLICY "admin_write_lease_transfers" ON lease_transfers
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

-- API(anon/authenticated) 테이블 접근 권한
GRANT SELECT ON TABLE public.lease_transfers TO anon, authenticated;
GRANT ALL ON TABLE public.lease_transfers TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.lease_transfers_id_seq TO authenticated;

DROP TRIGGER IF EXISTS trg_lease_transfers_updated ON lease_transfers;
CREATE TRIGGER trg_lease_transfers_updated
  BEFORE UPDATE ON lease_transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- PostgREST(API) 스키마 캐시 갱신
NOTIFY pgrst, 'reload schema';

SELECT 'lease_transfers migration OK' AS result;
SELECT COUNT(*) AS lease_transfer_count FROM lease_transfers;

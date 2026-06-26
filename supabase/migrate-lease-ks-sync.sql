-- ============================================================
-- KS오토플랜 견적 동기화 — lease_brands/models 확장 + 동기화 로그
-- Supabase SQL Editor에서 1회 실행
-- ============================================================

ALTER TABLE lease_brands ADD COLUMN IF NOT EXISTS ks_brand_id INT;
ALTER TABLE lease_brands ADD COLUMN IF NOT EXISTS sync_source TEXT NOT NULL DEFAULT '';
ALTER TABLE lease_brands ADD COLUMN IF NOT EXISTS admin_override BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lease_brands ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

ALTER TABLE lease_models ADD COLUMN IF NOT EXISTS ks_model_id INT;
ALTER TABLE lease_models ADD COLUMN IF NOT EXISTS sync_source TEXT NOT NULL DEFAULT '';
ALTER TABLE lease_models ADD COLUMN IF NOT EXISTS admin_override BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lease_models ADD COLUMN IF NOT EXISTS sync_state JSONB NOT NULL DEFAULT '{}';
ALTER TABLE lease_models ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE lease_models ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_brands_ks_origin
  ON lease_brands (ks_brand_id, origin)
  WHERE ks_brand_id IS NOT NULL AND sync_source = 'ks';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_models_ks_model
  ON lease_models (ks_model_id)
  WHERE ks_model_id IS NOT NULL AND sync_source = 'ks';

CREATE INDEX IF NOT EXISTS idx_lease_brands_sync_source ON lease_brands (sync_source) WHERE sync_source <> '';
CREATE INDEX IF NOT EXISTS idx_lease_models_sync_source ON lease_models (sync_source) WHERE sync_source <> '';

CREATE TABLE IF NOT EXISTS lease_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT false,
  msg TEXT NOT NULL DEFAULT '',
  diag JSONB NOT NULL DEFAULT '{}',
  resume_state JSONB NOT NULL DEFAULT '{}',
  brands_ok INT NOT NULL DEFAULT 0,
  brands_fail INT NOT NULL DEFAULT 0,
  models_ok INT NOT NULL DEFAULT 0,
  models_fail INT NOT NULL DEFAULT 0,
  inserted INT NOT NULL DEFAULT 0,
  updated INT NOT NULL DEFAULT 0,
  deactivated INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lease_sync_logs_country ON lease_sync_logs (country, started_at DESC);

ALTER TABLE lease_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_write_lease_sync_logs" ON lease_sync_logs;
CREATE POLICY "admin_write_lease_sync_logs" ON lease_sync_logs
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_read_lease_sync_logs" ON lease_sync_logs;
CREATE POLICY "admin_read_lease_sync_logs" ON lease_sync_logs
  FOR SELECT USING (public.is_purple_admin());

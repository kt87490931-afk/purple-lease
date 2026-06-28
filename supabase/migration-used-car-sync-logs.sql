-- 중고차(swautopia) 동기화 로그
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS used_car_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'swautopia',
  sync_mode TEXT NOT NULL DEFAULT 'manual',
  ok BOOLEAN NOT NULL DEFAULT false,
  msg TEXT NOT NULL DEFAULT '',
  diag JSONB NOT NULL DEFAULT '{}',
  cars_upserted INT NOT NULL DEFAULT 0,
  cars_deactivated INT NOT NULL DEFAULT 0,
  photos_processed INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_used_car_sync_logs_started ON used_car_sync_logs (started_at DESC);

ALTER TABLE used_car_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_write_used_car_sync_logs" ON used_car_sync_logs;
CREATE POLICY "admin_write_used_car_sync_logs" ON used_car_sync_logs
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_read_used_car_sync_logs" ON used_car_sync_logs;
CREATE POLICY "admin_read_used_car_sync_logs" ON used_car_sync_logs
  FOR SELECT TO authenticated
  USING (public.is_purple_admin());

SELECT 'used_car_sync_logs migration OK' AS result;

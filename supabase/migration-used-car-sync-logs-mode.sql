-- used_car_sync_logs: 수동/자동 구분
-- Supabase SQL Editor에서 실행 (migration-used-car-sync-logs.sql 실행 후)

ALTER TABLE used_car_sync_logs
  ADD COLUMN IF NOT EXISTS sync_mode TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN used_car_sync_logs.sync_mode IS 'manual=어드민 수동파싱, auto=서버 cron';

CREATE INDEX IF NOT EXISTS idx_used_car_sync_logs_mode ON used_car_sync_logs (sync_mode, started_at DESC);

SELECT 'used_car_sync_logs sync_mode OK' AS result;

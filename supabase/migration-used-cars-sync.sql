-- 중고차 swautopia 동기화 필드 (SQL Editor에서 Run)
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS sync_source TEXT NOT NULL DEFAULT '';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_used_cars_sync_source ON used_cars (sync_source) WHERE sync_source <> '';

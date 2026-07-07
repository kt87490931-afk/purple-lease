-- 퍼플오토 고객후기 AI 자동 생성 (Gemini)
-- Supabase SQL Editor에서 실행

-- ========== customer_reviews 확장 ==========
ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS topic_id INT;
ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS generation_meta JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_customer_reviews_ai ON customer_reviews (is_ai_generated, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_topic ON customer_reviews (topic_id, created_at DESC);

-- ========== 생성 로그 (health/observability) ==========
CREATE TABLE IF NOT EXISTS customer_review_gen_logs (
  id               BIGSERIAL PRIMARY KEY,
  ok               BOOLEAN NOT NULL DEFAULT false,
  msg              TEXT NOT NULL DEFAULT '',
  source           TEXT NOT NULL DEFAULT 'manual',
  topic_id         INT,
  tone_id          TEXT,
  listing_id       INT,
  char_count       INT NOT NULL DEFAULT 0,
  response_time_ms INT NOT NULL DEFAULT 0,
  diag             JSONB NOT NULL DEFAULT '{}',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  duration_ms      INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customer_review_gen_logs_started ON customer_review_gen_logs (started_at DESC);

-- ========== 어드민 생성 요청 큐 ==========
CREATE TABLE IF NOT EXISTS customer_review_gen_queue (
  id                 BIGSERIAL PRIMARY KEY,
  topic_id           INT,
  tone_id            TEXT,
  publish            BOOLEAN NOT NULL DEFAULT true,
  dry_run            BOOLEAN NOT NULL DEFAULT false,
  status             TEXT NOT NULL DEFAULT 'pending',
  result_listing_id  INT,
  error_msg          TEXT NOT NULL DEFAULT '',
  requested_by       TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_review_gen_queue_status ON customer_review_gen_queue (status, created_at ASC);

-- ========== RLS ==========
ALTER TABLE customer_review_gen_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_review_gen_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_customer_review_gen_logs" ON customer_review_gen_logs;
CREATE POLICY "admin_read_customer_review_gen_logs" ON customer_review_gen_logs
  FOR SELECT TO authenticated
  USING (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_customer_review_gen_logs" ON customer_review_gen_logs;
CREATE POLICY "admin_write_customer_review_gen_logs" ON customer_review_gen_logs
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_read_customer_review_gen_queue" ON customer_review_gen_queue;
CREATE POLICY "admin_read_customer_review_gen_queue" ON customer_review_gen_queue
  FOR SELECT TO authenticated
  USING (public.is_purple_admin());

DROP POLICY IF EXISTS "admin_write_customer_review_gen_queue" ON customer_review_gen_queue;
CREATE POLICY "admin_write_customer_review_gen_queue" ON customer_review_gen_queue
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

-- service role(cron)은 RLS bypass

SELECT 'customer_review_ai migration OK' AS result;

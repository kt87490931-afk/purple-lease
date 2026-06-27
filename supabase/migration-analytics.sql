-- 퍼플오토(purpleauto.co.kr) 방문 통계 — visit_logs + 집계 RPC
-- Supabase SQL Editor에서 실행 (프로젝트: zliclwgiaqvilnnookyi)

CREATE TABLE IF NOT EXISTS visit_logs (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT,
  user_agent TEXT,
  path TEXT NOT NULL DEFAULT '/',
  visitor_type TEXT NOT NULL DEFAULT 'visitor',
  referrer TEXT,
  visitor_id TEXT,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_logs_created_at ON visit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_logs_path ON visit_logs (path);
CREATE INDEX IF NOT EXISTS idx_visit_logs_visitor_id ON visit_logs (visitor_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_device_type ON visit_logs (device_type);
CREATE INDEX IF NOT EXISTS idx_visit_logs_created_at_kst ON visit_logs ((timezone('Asia/Seoul', created_at)::date));

ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_visit_logs" ON visit_logs;
CREATE POLICY "anon_insert_visit_logs" ON visit_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_visit_logs" ON visit_logs;
CREATE POLICY "admin_read_visit_logs" ON visit_logs
  FOR SELECT TO authenticated
  USING (public.is_purple_admin());

CREATE OR REPLACE FUNCTION analytics_visitor_key(v_id text, v_ip text, v_ua text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    nullif(trim(v_id), ''),
    md5(coalesce(v_ip, '') || '|' || coalesce(left(v_ua, 120), ''))
  );
$$;

CREATE OR REPLACE FUNCTION get_analytics_daily_stats(p_from date, p_to date)
RETURNS TABLE (
  stat_date date,
  pv bigint,
  uv bigint,
  pv_bot bigint,
  uv_bot bigint,
  pv_human bigint,
  uv_human bigint,
  pv_desktop bigint,
  pv_mobile bigint,
  pv_tablet bigint,
  uv_desktop bigint,
  uv_mobile bigint,
  uv_tablet bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_purple_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT
      (timezone('Asia/Seoul', created_at))::date AS d,
      coalesce(visitor_type, 'visitor') AS vtype,
      coalesce(nullif(trim(device_type), ''), 'unknown') AS dtype,
      analytics_visitor_key(visitor_id, ip, user_agent) AS vkey
    FROM visit_logs
    WHERE (timezone('Asia/Seoul', created_at))::date BETWEEN p_from AND p_to
  )
  SELECT
    d,
    count(*)::bigint,
    count(DISTINCT vkey)::bigint,
    count(*) FILTER (WHERE vtype = 'bot')::bigint,
    count(DISTINCT vkey) FILTER (WHERE vtype = 'bot')::bigint,
    count(*) FILTER (WHERE vtype IS DISTINCT FROM 'bot')::bigint,
    count(DISTINCT vkey) FILTER (WHERE vtype IS DISTINCT FROM 'bot')::bigint,
    count(*) FILTER (WHERE dtype = 'desktop')::bigint,
    count(*) FILTER (WHERE dtype = 'mobile')::bigint,
    count(*) FILTER (WHERE dtype = 'tablet')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'desktop')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'mobile')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'tablet')::bigint
  FROM base
  GROUP BY d
  ORDER BY d DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_analytics_monthly_stats(p_from date, p_to date)
RETURNS TABLE (
  stat_month date,
  pv bigint,
  uv bigint,
  pv_bot bigint,
  uv_bot bigint,
  pv_human bigint,
  uv_human bigint,
  pv_desktop bigint,
  pv_mobile bigint,
  pv_tablet bigint,
  uv_desktop bigint,
  uv_mobile bigint,
  uv_tablet bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_purple_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT
      date_trunc('month', timezone('Asia/Seoul', created_at))::date AS m,
      coalesce(visitor_type, 'visitor') AS vtype,
      coalesce(nullif(trim(device_type), ''), 'unknown') AS dtype,
      analytics_visitor_key(visitor_id, ip, user_agent) AS vkey
    FROM visit_logs
    WHERE (timezone('Asia/Seoul', created_at))::date BETWEEN p_from AND p_to
  )
  SELECT
    m,
    count(*)::bigint,
    count(DISTINCT vkey)::bigint,
    count(*) FILTER (WHERE vtype = 'bot')::bigint,
    count(DISTINCT vkey) FILTER (WHERE vtype = 'bot')::bigint,
    count(*) FILTER (WHERE vtype IS DISTINCT FROM 'bot')::bigint,
    count(DISTINCT vkey) FILTER (WHERE vtype IS DISTINCT FROM 'bot')::bigint,
    count(*) FILTER (WHERE dtype = 'desktop')::bigint,
    count(*) FILTER (WHERE dtype = 'mobile')::bigint,
    count(*) FILTER (WHERE dtype = 'tablet')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'desktop')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'mobile')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'tablet')::bigint
  FROM base
  GROUP BY m
  ORDER BY m DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_analytics_period_stats(p_from date, p_to date)
RETURNS TABLE (
  pv bigint,
  uv bigint,
  pv_bot bigint,
  uv_bot bigint,
  pv_human bigint,
  uv_human bigint,
  pv_desktop bigint,
  pv_mobile bigint,
  pv_tablet bigint,
  uv_desktop bigint,
  uv_mobile bigint,
  uv_tablet bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_purple_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT
      coalesce(visitor_type, 'visitor') AS vtype,
      coalesce(nullif(trim(device_type), ''), 'unknown') AS dtype,
      analytics_visitor_key(visitor_id, ip, user_agent) AS vkey
    FROM visit_logs
    WHERE (timezone('Asia/Seoul', created_at))::date BETWEEN p_from AND p_to
  )
  SELECT
    count(*)::bigint,
    count(DISTINCT vkey)::bigint,
    count(*) FILTER (WHERE vtype = 'bot')::bigint,
    count(DISTINCT vkey) FILTER (WHERE vtype = 'bot')::bigint,
    count(*) FILTER (WHERE vtype IS DISTINCT FROM 'bot')::bigint,
    count(DISTINCT vkey) FILTER (WHERE vtype IS DISTINCT FROM 'bot')::bigint,
    count(*) FILTER (WHERE dtype = 'desktop')::bigint,
    count(*) FILTER (WHERE dtype = 'mobile')::bigint,
    count(*) FILTER (WHERE dtype = 'tablet')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'desktop')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'mobile')::bigint,
    count(DISTINCT vkey) FILTER (WHERE dtype = 'tablet')::bigint
  FROM base;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_daily_stats(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_monthly_stats(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_period_stats(date, date) TO authenticated;

SELECT 'purple analytics migration OK' AS result;

-- 문의 IP 기록 + 차단 (문의만 / 문의·접속)
-- Supabase SQL Editor에서 Run (idempotent)
-- IP는 폼 값이 아니라 요청 헤더에서 서버가 기록합니다.

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS client_ip TEXT NOT NULL DEFAULT '';
ALTER TABLE public.lease_quotes ADD COLUMN IF NOT EXISTS client_ip TEXT NOT NULL DEFAULT '';
ALTER TABLE public.lease_calculator_inquiries ADD COLUMN IF NOT EXISTS client_ip TEXT NOT NULL DEFAULT '';
ALTER TABLE public.used_car_inquiries ADD COLUMN IF NOT EXISTS client_ip TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_inquiries_client_ip ON public.inquiries (client_ip);
CREATE INDEX IF NOT EXISTS idx_lease_quotes_client_ip ON public.lease_quotes (client_ip);
CREATE INDEX IF NOT EXISTS idx_lease_calc_inq_client_ip ON public.lease_calculator_inquiries (client_ip);
CREATE INDEX IF NOT EXISTS idx_used_car_inquiries_client_ip ON public.used_car_inquiries (client_ip);

CREATE TABLE IF NOT EXISTS public.blocked_ips (
  ip_address TEXT PRIMARY KEY,
  block_mode TEXT NOT NULL CHECK (block_mode IN ('inquiry', 'site')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_blocked_ips" ON public.blocked_ips;
CREATE POLICY "admin_all_blocked_ips" ON public.blocked_ips
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blocked_ips TO authenticated;

CREATE OR REPLACE FUNCTION public.normalize_ip(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
BEGIN
  s := lower(btrim(coalesce(raw, '')));
  s := regexp_replace(s, '^::ffff:', '');
  IF s ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}:[0-9]+$' THEN
    s := split_part(s, ':', 1);
  END IF;
  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_client_ip()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  headers json;
  raw text;
BEGIN
  BEGIN
    headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    RETURN '';
  END;
  IF headers IS NULL THEN
    RETURN '';
  END IF;
  raw := coalesce(
    headers->>'cf-connecting-ip',
    headers->>'x-real-ip',
    split_part(coalesce(headers->>'x-forwarded-for', ''), ',', 1),
    ''
  );
  RETURN public.normalize_ip(raw);
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_inquiry_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip text;
  mode text;
BEGIN
  ip := public.request_client_ip();
  NEW.client_ip := coalesce(ip, '');
  IF ip <> '' THEN
    SELECT block_mode INTO mode FROM public.blocked_ips WHERE ip_address = ip;
    IF mode IN ('inquiry', 'site') THEN
      RAISE EXCEPTION 'inquiry_ip_blocked' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiries_client_ip ON public.inquiries;
CREATE TRIGGER trg_inquiries_client_ip
  BEFORE INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inquiry_ip();

DROP TRIGGER IF EXISTS trg_lease_quotes_client_ip ON public.lease_quotes;
CREATE TRIGGER trg_lease_quotes_client_ip
  BEFORE INSERT ON public.lease_quotes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inquiry_ip();

DROP TRIGGER IF EXISTS trg_lease_calc_inq_client_ip ON public.lease_calculator_inquiries;
CREATE TRIGGER trg_lease_calc_inq_client_ip
  BEFORE INSERT ON public.lease_calculator_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inquiry_ip();

DROP TRIGGER IF EXISTS trg_used_car_inquiries_client_ip ON public.used_car_inquiries;
CREATE TRIGGER trg_used_car_inquiries_client_ip
  BEFORE INSERT ON public.used_car_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inquiry_ip();

CREATE OR REPLACE FUNCTION public.visitor_block_status()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip text;
  mode text;
BEGIN
  ip := public.request_client_ip();
  IF ip IS NULL OR ip = '' THEN
    RETURN 'none';
  END IF;
  SELECT block_mode INTO mode FROM public.blocked_ips WHERE ip_address = ip;
  IF mode = 'site' THEN
    RETURN 'site';
  END IF;
  IF mode = 'inquiry' THEN
    RETURN 'inquiry';
  END IF;
  RETURN 'none';
END;
$$;

REVOKE ALL ON FUNCTION public.visitor_block_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visitor_block_status() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'ip block migration OK' AS result;

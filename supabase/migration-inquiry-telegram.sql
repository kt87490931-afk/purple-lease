-- 견적문의 INSERT → 텔레그램 웹훅 (pg_net)
-- Supabase SQL Editor에서 Run
-- 사전: deploy/update-telegram-config.sh 로 서버·시크릿 설정 후
--       deploy/sync-telegram-webhook-secret.sh 로 webhook_secret 동기화

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.telegram_notify_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT INTO public.telegram_notify_config (key, value) VALUES
  ('webhook_url', 'https://purpleauto.co.kr/api/webhook/inquiry-telegram'),
  ('webhook_secret', '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.telegram_notify_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_telegram_notify_config" ON public.telegram_notify_config;
CREATE POLICY "service_role_telegram_notify_config" ON public.telegram_notify_config
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.trigger_inquiry_telegram_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_payload jsonb;
BEGIN
  SELECT value INTO v_url FROM public.telegram_notify_config WHERE key = 'webhook_url' LIMIT 1;
  SELECT value INTO v_secret FROM public.telegram_notify_config WHERE key = 'webhook_secret' LIMIT 1;

  IF v_url IS NULL OR v_url = '' OR v_secret IS NULL OR v_secret = '' THEN
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW)
  );

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', v_secret
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiries_telegram ON public.inquiries;
CREATE TRIGGER trg_inquiries_telegram
  AFTER INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_inquiry_telegram_notify();

DROP TRIGGER IF EXISTS trg_lease_quotes_telegram ON public.lease_quotes;
CREATE TRIGGER trg_lease_quotes_telegram
  AFTER INSERT ON public.lease_quotes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_inquiry_telegram_notify();

DROP TRIGGER IF EXISTS trg_used_car_inquiries_telegram ON public.used_car_inquiries;
CREATE TRIGGER trg_used_car_inquiries_telegram
  AFTER INSERT ON public.used_car_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_inquiry_telegram_notify();

DROP TRIGGER IF EXISTS trg_lease_calc_inquiries_telegram ON public.lease_calculator_inquiries;
CREATE TRIGGER trg_lease_calc_inquiries_telegram
  AFTER INSERT ON public.lease_calculator_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_inquiry_telegram_notify();

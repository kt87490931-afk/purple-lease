-- OpenAI Ads lead_created 중복 방지용: 공개 상담 INSERT 후 id 반환 (SECURITY DEFINER)
-- Supabase SQL Editor에서 Run (idempotent)
-- anon은 inquiries SELECT가 막혀 있어 insert().select('id') 가 실패하므로 RPC로 id만 반환합니다.

CREATE OR REPLACE FUNCTION public.insert_inquiry_return_id(
  p_name text,
  p_phone text,
  p_brand text DEFAULT '',
  p_usage_method text DEFAULT '',
  p_consult_type text DEFAULT 'lease_rent',
  p_car_type text DEFAULT '',
  p_message text DEFAULT '',
  p_source_page text DEFAULT 'index'
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id bigint;
  ct text;
BEGIN
  ct := lower(trim(coalesce(p_consult_type, 'lease_rent')));
  IF ct NOT IN ('lease_rent', 'paid_transfer', 'used_car') THEN
    ct := 'lease_rent';
  END IF;

  INSERT INTO public.inquiries (
    name, phone, brand, usage_method, consult_type, car_type, message, source_page, is_read
  ) VALUES (
    coalesce(p_name, ''),
    coalesce(p_phone, ''),
    coalesce(p_brand, ''),
    coalesce(p_usage_method, ''),
    ct,
    coalesce(p_car_type, ''),
    coalesce(p_message, ''),
    coalesce(nullif(trim(p_source_page), ''), 'index'),
    false
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_lease_quote_return_id(
  p_name text,
  p_phone text,
  p_origin text DEFAULT 'domestic',
  p_brand_name text DEFAULT '',
  p_model_name text DEFAULT '',
  p_quote_json jsonb DEFAULT '{}'::jsonb,
  p_source_page text DEFAULT 'estimate'
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id bigint;
BEGIN
  INSERT INTO public.lease_quotes (
    name, phone, origin, brand_name, model_name, quote_json, source_page, is_read
  ) VALUES (
    coalesce(p_name, ''),
    coalesce(p_phone, ''),
    coalesce(nullif(trim(p_origin), ''), 'domestic'),
    coalesce(p_brand_name, ''),
    coalesce(p_model_name, ''),
    coalesce(p_quote_json, '{}'::jsonb),
    coalesce(nullif(trim(p_source_page), ''), 'estimate'),
    false
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_lease_calc_inquiry_return_id(
  p_name text,
  p_phone text,
  p_calc_json jsonb DEFAULT '{}'::jsonb,
  p_source_page text DEFAULT 'lease-calculator'
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id bigint;
BEGIN
  INSERT INTO public.lease_calculator_inquiries (
    name, phone, calc_json, source_page, is_read
  ) VALUES (
    coalesce(p_name, ''),
    coalesce(p_phone, ''),
    coalesce(p_calc_json, '{}'::jsonb),
    coalesce(nullif(trim(p_source_page), ''), 'lease-calculator'),
    false
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_inquiry_return_id(text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_lease_quote_return_id(text, text, text, text, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_lease_calc_inquiry_return_id(text, text, jsonb, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_inquiry_return_id(text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_lease_quote_return_id(text, text, text, text, text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_lease_calc_inquiry_return_id(text, text, jsonb, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'openai lead insert id RPCs OK' AS result;

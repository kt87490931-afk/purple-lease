-- 퍼플오토 푸터 설정 (약관 / 개인정보 / 고지문 / 등록증)
-- Supabase SQL Editor 또는 psql 로 실행 (idempotent)

CREATE TABLE IF NOT EXISTS footer_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  terms_of_service TEXT NOT NULL DEFAULT '',
  privacy_policy TEXT NOT NULL DEFAULT '',
  disclaimer_text TEXT NOT NULL DEFAULT '금융상품 상담은 등록된 금융상품판매대리 · 중개업자가 진행합니다.
금융상품판매대리 · 중개업자 성명 및 등록번호 소속 법인(또는 제휴 법인)
계약 체결 권한은 금융회사에 있으며, 당사는 금융상품판매대리 · 중개업자로서 모집 업무',
  certificate_url TEXT NOT NULL DEFAULT '',
  certificate_mime TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO footer_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_footer_settings" ON footer_settings;
CREATE POLICY "public_read_footer_settings" ON footer_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_footer_settings" ON footer_settings;
CREATE POLICY "admin_write_footer_settings" ON footer_settings
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

SELECT 'footer_settings migration OK' AS result;

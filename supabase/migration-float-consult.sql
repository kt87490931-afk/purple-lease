-- 플로팅 상담 FAB 설정 (싱글톤 id=1)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS float_consult_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  phone_number TEXT NOT NULL DEFAULT '1555-6362',
  kakao_url TEXT NOT NULL DEFAULT 'https://pf.kakao.com/_vyvHG/chat',
  tel_label TEXT NOT NULL DEFAULT '유선상담',
  kakao_label TEXT NOT NULL DEFAULT '카카오상담',
  main_label TEXT NOT NULL DEFAULT '상담',
  bottom_offset_mobile INT NOT NULL DEFAULT 78,
  bottom_offset_desktop INT NOT NULL DEFAULT 28,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO float_consult_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE float_consult_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_float_consult_settings" ON float_consult_settings;
CREATE POLICY "public_read_float_consult_settings" ON float_consult_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_float_consult_settings" ON float_consult_settings;
CREATE POLICY "admin_write_float_consult_settings" ON float_consult_settings
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

SELECT 'float_consult_settings migration OK' AS result;

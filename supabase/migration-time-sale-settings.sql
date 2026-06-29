-- 메인 페이지 타임특가 섹션 노출 설정 (싱글톤 id=1)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS time_sale_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_visible BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO time_sale_settings (id, is_visible) VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE time_sale_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_time_sale_settings" ON time_sale_settings;
CREATE POLICY "public_read_time_sale_settings" ON time_sale_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_time_sale_settings" ON time_sale_settings;
CREATE POLICY "admin_write_time_sale_settings" ON time_sale_settings
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

SELECT 'time_sale_settings migration OK' AS result;

-- 사이트 메뉴·페이지 노출 설정 (싱글톤 id=1) — 현재: 중고차 노출 ON/OFF
-- Supabase SQL Editor에서 실행 (idempotent)

CREATE TABLE IF NOT EXISTS site_visibility_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  used_car_visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_visibility_settings (id, used_car_visible) VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_visibility_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_site_visibility_settings" ON site_visibility_settings;
CREATE POLICY "public_read_site_visibility_settings" ON site_visibility_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_site_visibility_settings" ON site_visibility_settings;
CREATE POLICY "admin_write_site_visibility_settings" ON site_visibility_settings
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

GRANT SELECT ON TABLE public.site_visibility_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.site_visibility_settings TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT id, used_car_visible, updated_at FROM site_visibility_settings;

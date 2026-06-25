-- 견적문의 확장 (SQL Editor에서 Run)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS usage_method TEXT NOT NULL DEFAULT '';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inquiries_unread ON inquiries (is_read) WHERE is_read = false;

DROP POLICY IF EXISTS "admin_write_inquiries" ON inquiries;
CREATE POLICY "admin_write_inquiries" ON inquiries
  FOR ALL USING (public.is_purple_admin()) WITH CHECK (public.is_purple_admin());

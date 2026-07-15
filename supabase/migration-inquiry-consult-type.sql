-- 일반문의(빠른 견적문의) 상담유형
-- Supabase SQL Editor에서 1회 실행
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS consult_type TEXT NOT NULL DEFAULT 'lease_rent';

COMMENT ON COLUMN public.inquiries.consult_type IS
  '상담유형: lease_rent=리스·렌트, paid_transfer=완납승계, used_car=중고차';

CREATE INDEX IF NOT EXISTS idx_inquiries_consult_type
  ON public.inquiries (consult_type);

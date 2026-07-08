-- lease_transfers 공개(anon) 읽기 권한 패치 — 어드민에는 보이나 공개 페이지 0대일 때 실행
-- Supabase SQL Editor에서 실행 (idempotent)

DROP POLICY IF EXISTS "public_read_lease_transfers" ON lease_transfers;
CREATE POLICY "public_read_lease_transfers" ON lease_transfers
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

GRANT SELECT ON TABLE public.lease_transfers TO anon, authenticated;
GRANT ALL ON TABLE public.lease_transfers TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.lease_transfers_id_seq TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT id, listing_id, name, is_active FROM lease_transfers ORDER BY listing_id;

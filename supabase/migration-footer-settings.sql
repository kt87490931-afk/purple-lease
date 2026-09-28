-- 퍼플오토 푸터 설정 (약관 / 개인정보 / 고지문 / 등록증 / 회사정보 / 메뉴·법적 링크 이름)
-- Supabase SQL Editor 또는 psql 로 실행 (idempotent)

CREATE TABLE IF NOT EXISTS footer_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  terms_of_service TEXT NOT NULL DEFAULT '',
  privacy_policy TEXT NOT NULL DEFAULT '',
  disclaimer_text TEXT NOT NULL DEFAULT '금융상품 상담은 등록된 금융상품판매대리 · 중개업자가 진행합니다. 금융상품판매대리 · 중개업자 성명 및 등록번호 소속 법인(또는 제휴 법인) 계약 체결 권한은 금융회사에 있으며, 당사는 금융상품판매대리 · 중개업자로서 모집 업무',
  certificate_url TEXT NOT NULL DEFAULT '',
  certificate_mime TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO footer_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- v2: 회사정보(주소 등) · 메뉴 링크 이름 · 법적 링크 이름
ALTER TABLE footer_settings ADD COLUMN IF NOT EXISTS company_info TEXT NOT NULL DEFAULT
  E'퍼플오토 | 오토리스&장기렌트 승계매입전문업체\n대표 : 이호준 | 주소 : 경기도 용인시 기흥구 강남서로9, 7층 703호\n사업자등록번호 : 885-68-00449\n대표번호 : 1555-6362 | 평일 09:00~18:00';
ALTER TABLE footer_settings ADD COLUMN IF NOT EXISTS nav_labels JSONB NOT NULL DEFAULT
  '{"/":"신차·리스·렌트","/used-cars":"중고차 매물","/lease-transfers":"일반승계 매물","/lease-calculator":"계산기","/parts-register":"수입차부품","/partners":"제휴업체","/reviews":"후기관리","/reviews-youtube":"퍼플오토 유튜브"}'::jsonb;
ALTER TABLE footer_settings ADD COLUMN IF NOT EXISTS label_terms TEXT NOT NULL DEFAULT '이용약관';
ALTER TABLE footer_settings ADD COLUMN IF NOT EXISTS label_privacy TEXT NOT NULL DEFAULT '개인정보처리방침';
ALTER TABLE footer_settings ADD COLUMN IF NOT EXISTS label_certificate TEXT NOT NULL DEFAULT '금융상품판매대리 · 중개업자 등록증';

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

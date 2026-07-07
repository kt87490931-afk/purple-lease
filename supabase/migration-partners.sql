-- 제휴업체 페이지 (상단 영상 · 지역 · 해시태그 · 업체 목록)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS partner_page_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  youtube_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '퍼플오토 제휴업체 네트워크 소개',
  description TEXT NOT NULL DEFAULT '전국 검증된 제휴업체와 함께하는 퍼플오토의 서비스를 영상으로 확인해보세요.',
  thumb_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO partner_page_settings (id, youtube_id, title, description)
VALUES (1, 'dQw4w9WgXcQ', '퍼플오토 제휴업체 네트워크 소개',
  '전국 검증된 제휴업체와 함께하는 퍼플오토의 서비스를 영상으로 확인해보세요.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS partner_tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_regions (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sigungu JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partners (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  sigungu TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  short_desc TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  tag_names TEXT[] NOT NULL DEFAULT '{}',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  video_youtube_id TEXT NOT NULL DEFAULT '',
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  body_html TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_tags_sort ON partner_tags (sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_partner_regions_sort ON partner_regions (sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_partners_sort ON partners (is_premium DESC, sort_order ASC, id ASC);

ALTER TABLE partner_page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_partner_page_settings" ON partner_page_settings;
CREATE POLICY "public_read_partner_page_settings" ON partner_page_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_partner_page_settings" ON partner_page_settings;
CREATE POLICY "admin_write_partner_page_settings" ON partner_page_settings
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

DROP POLICY IF EXISTS "public_read_partner_tags" ON partner_tags;
CREATE POLICY "public_read_partner_tags" ON partner_tags
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_all_partner_tags" ON partner_tags;
CREATE POLICY "admin_all_partner_tags" ON partner_tags
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

DROP POLICY IF EXISTS "public_read_partner_regions" ON partner_regions;
CREATE POLICY "public_read_partner_regions" ON partner_regions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_all_partner_regions" ON partner_regions;
CREATE POLICY "admin_all_partner_regions" ON partner_regions
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

DROP POLICY IF EXISTS "public_read_partners" ON partners;
CREATE POLICY "public_read_partners" ON partners
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_all_partners" ON partners;
CREATE POLICY "admin_all_partners" ON partners
  FOR ALL TO authenticated
  USING (public.is_purple_admin())
  WITH CHECK (public.is_purple_admin());

-- 해시태그 시드
INSERT INTO partner_tags (name, sort_order) VALUES
  ('판금도색', 1), ('튜닝', 2), ('디테일링', 3), ('썬팅', 4),
  ('랩핑', 5), ('PPF', 6), ('세라믹코팅', 7)
ON CONFLICT (name) DO NOTHING;

-- 지역 시드
INSERT INTO partner_regions (code, name, sigungu, sort_order) VALUES
  ('seoul', '서울', '["강남구","서초구","송파구","마포구","영등포구"]'::jsonb, 1),
  ('gyeonggi', '경기', '["용인시","수원시","성남시","화성시","기흥구"]'::jsonb, 2),
  ('incheon', '인천', '["남동구","부평구","연수구"]'::jsonb, 3),
  ('gangwon', '강원', '["춘천시","원주시","강릉시"]'::jsonb, 4),
  ('chungbuk', '충북', '["청주시","충주시"]'::jsonb, 5),
  ('chungnam', '충남', '["천안시","아산시"]'::jsonb, 6),
  ('daejeon', '대전', '["유성구","서구"]'::jsonb, 7),
  ('sejong', '세종', '["세종시"]'::jsonb, 8),
  ('gyeongbuk', '경북', '["포항시","구미시"]'::jsonb, 9),
  ('gyeongnam', '경남', '["창원시","김해시"]'::jsonb, 10),
  ('daegu', '대구', '["수성구","달서구"]'::jsonb, 11),
  ('ulsan', '울산', '["남구","중구"]'::jsonb, 12),
  ('busan', '부산', '["해운대구","수영구"]'::jsonb, 13),
  ('jeonbuk', '전북', '["전주시","군산시"]'::jsonb, 14),
  ('jeonnam', '전남', '["여수시","순천시"]'::jsonb, 15),
  ('gwangju', '광주', '["서구","북구"]'::jsonb, 16),
  ('jeju', '제주', '["제주시","서귀포시"]'::jsonb, 17)
ON CONFLICT (code) DO NOTHING;

-- 업체 시드 (테이블 비어 있을 때만)
INSERT INTO partners (
  name, region, sigungu, address, short_desc, phone, tag_names,
  is_premium, sort_order, video_youtube_id, gallery, body_html
)
SELECT * FROM (VALUES
  (
    '퍼플코팅 강남점', '서울', '강남구', '서울 강남구 테헤란로 123',
    '수입차 전문 광택·코팅 및 실내 디테일링 서비스를 제공합니다.', '02-1234-5678',
    ARRAY['디테일링','세라믹코팅']::text[], true, 1, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"},{"type":"image","url":"https://images.unsplash.com/photo-1507136566006-4b16ce8d0138?w=800&q=80","thumb":"https://images.unsplash.com/photo-1507136566006-4b16ce8d0138?w=800&q=80"}]'::jsonb,
    '<p>퍼플코팅 강남점은 <strong>수입차 전문 디테일링</strong> 업체입니다.</p>'
  ),
  (
    '기흥 판금도색센터', '경기', '기흥구', '경기 용인시 기흥구 강남서로 9',
    '사고차·접촉사고 판금, 도색 및 보험 연계 작업을 전문으로 합니다.', '031-987-6543',
    ARRAY['판금도색']::text[], false, 2, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}]'::jsonb,
    '<p>기흥 판금도색센터는 퍼플오토 제휴 업체입니다.</p>'
  ),
  (
    '수원 썬팅스튜디오', '경기', '수원시', '경기 수원시 영통구 매탄동 123',
    '고급 차량용 썬팅 필름 시공 및 단열 썬팅 전문점입니다.', '031-555-2222',
    ARRAY['썬팅']::text[], false, 3, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}]'::jsonb,
    '<p>수원 썬팅스튜디오 소개입니다.</p>'
  ),
  (
    '부산 랩핑하우스', '부산', '해운대구', '부산 해운대구 센텀로 99',
    'PPF, 컬러 랩핑 등 차량 외장 보호 및 디자인 랩핑을 진행합니다.', '051-321-4567',
    ARRAY['랩핑','PPF']::text[], false, 4, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}]'::jsonb,
    '<p>부산 랩핑하우스 소개입니다.</p>'
  ),
  (
    '대구 튜닝가라지', '대구', '수성구', '대구 수성구 동대구로 45',
    '서스펜션, 배기 등 합법 튜닝 및 ECU 세팅 전문업체입니다.', '053-111-2222',
    ARRAY['튜닝']::text[], false, 5, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}]'::jsonb,
    '<p>대구 튜닝가라지 소개입니다.</p>'
  ),
  (
    '화성 디테일링랩', '경기', '화성시', '경기 화성시 동탄대로 77',
    '신차 출고 전 보호 디테일링 및 세라믹 코팅을 제공합니다.', '031-222-3333',
    ARRAY['디테일링','세라믹코팅']::text[], true, 6, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}]'::jsonb,
    '<p>화성 디테일링랩 소개입니다.</p>'
  ),
  (
    '인천 판금도색공방', '인천', '남동구', '인천 남동구 구월로 12',
    '외제차 전문 판금도색, 색상 매칭 작업이 가능합니다.', '032-444-5555',
    ARRAY['판금도색']::text[], false, 7, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}]'::jsonb,
    '<p>인천 판금도색공방 소개입니다.</p>'
  ),
  (
    '성남 썬팅앤랩핑', '경기', '성남시', '경기 성남시 분당구 정자로 8',
    '썬팅과 랩핑을 동시에 진행하는 원스톱 외장 케어 업체입니다.', '031-666-7777',
    ARRAY['썬팅','랩핑']::text[], false, 8, 'dQw4w9WgXcQ',
    '[{"type":"video","youtube_id":"dQw4w9WgXcQ","thumb":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}]'::jsonb,
    '<p>성남 썬팅앤랩핑 소개입니다.</p>'
  )
) AS v(name, region, sigungu, address, short_desc, phone, tag_names, is_premium, sort_order, video_youtube_id, gallery, body_html)
WHERE NOT EXISTS (SELECT 1 FROM partners LIMIT 1);

SELECT 'partners migration OK' AS result,
  (SELECT COUNT(*)::int FROM partner_tags) AS tag_count,
  (SELECT COUNT(*)::int FROM partner_regions) AS region_count,
  (SELECT COUNT(*)::int FROM partners) AS partner_count;

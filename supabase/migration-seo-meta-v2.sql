-- SEO 메타 v2: keywords, OG/Twitter description + 문서 카피 반영
-- Supabase SQL Editor에서 Run

ALTER TABLE seo_page_meta
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS og_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS twitter_description TEXT NOT NULL DEFAULT '';

UPDATE seo_settings SET
  og_image_url = 'https://purpleauto.co.kr/assets/brand-logos/og-image.png',
  default_description = '선납금 0원, 보증금 걱정 없는 무보증 장기렌트부터 위약금 없는 리스승계매입까지. 현대·기아·제네시스·BMW·벤츠·아우디 전 차종 무료 견적, 5일 이내 즉시출고. 경기 용인 퍼플오토.',
  updated_at = now()
WHERE id = 1;

UPDATE seo_page_meta SET
  title = '퍼플오토 — 오토리스·장기렌트 승계매입 전문업체',
  description = '선납금 0원, 보증금 걱정 없는 무보증 장기렌트부터 위약금 없는 리스승계매입까지. 현대·기아·제네시스·BMW·벤츠·아우디 전 차종 무료 견적, 5일 이내 즉시출고. 경기 용인 퍼플오토.',
  meta_keywords = '장기렌트,오토리스,리스승계,리스승계매입,렌트승계,승계매입,무보증 장기렌트,선납금 0원 장기렌트,즉시출고 장기렌트,법인 장기렌트,용인 장기렌트,기흥 장기렌트,용인 리스승계,경기 오토리스,제네시스 장기렌트,그랜저 장기렌트,G80 리스,BMW 리스승계,벤츠 장기렌트,아우디 리스,중고차 매물,수입차부품',
  og_title = '퍼플오토 — 오토리스·장기렌트 승계매입 전문업체',
  og_description = '선납금 0원, 보증금 걱정 없는 무보증 장기렌트부터 위약금 없는 리스승계매입까지. 지금 무료 견적을 받아보세요.',
  twitter_description = '선납금 0원 무보증 장기렌트, 위약금 없는 리스승계매입. 지금 무료 견적받기.',
  updated_at = now()
WHERE page_path = '/';

UPDATE seo_page_meta SET
  title = '장기렌트·리스 간편견적 | 퍼플오토',
  description = '브랜드와 모델만 선택하면 끝. 국산차·수입차 장기렌트·리스 견적을 비대면으로 간편하게 받아보세요. 보증금·선납금·이용기간 맞춤 설계, 운영자 검수 옵션만 제공합니다.',
  meta_keywords = '장기렌트 견적,리스 견적,오토리스 견적,무료 견적,비대면 견적,장기렌트 비교,리스 비교,승계매입 견적,법인 리스,개인 리스,장기렌트 시뮬레이션,월렌트료 계산,제네시스 견적,현대 장기렌트,기아 장기렌트,수입차 리스 견적',
  og_title = '장기렌트·리스 간편견적 | 퍼플오토',
  og_description = '브랜드와 모델만 선택하면 끝. 국산차·수입차 장기렌트·리스 견적을 비대면으로 간편하게 받아보세요.',
  twitter_description = '국산차·수입차 장기렌트·리스 견적을 비대면으로 간편하게 받아보세요.',
  updated_at = now()
WHERE page_path = '/estimate';

UPDATE seo_page_meta SET
  title = '중고차 매물 | 퍼플오토',
  description = '무사고·짧은주행·성능점검기록부까지 확인 가능한 중고차 매물을 한눈에. 국산차·수입차·수출차량까지, 가격·연식·주행거리로 검색하고 최저가 매물을 만나보세요.',
  meta_keywords = '중고차 매물,중고차 매매,무사고 중고차,성능점검 중고차,수입차 중고차,국산차 중고차,중고차 시세,중고차 구매,중고차 직거래,용인 중고차,경기 중고차,제네시스 중고차,현대 중고차,기아 중고차,BMW 중고차,벤츠 중고차,중고차 수출,중고차 매입,승계매입 차량',
  og_title = '중고차 매물 | 퍼플오토',
  og_description = '무사고·성능점검기록부까지 확인 가능한 검수 중고차 매물을 한눈에 만나보세요.',
  twitter_description = '무사고·성능점검 검수 중고차 매물을 한눈에 만나보세요.',
  updated_at = now()
WHERE page_path = '/used-cars';

UPDATE seo_page_meta SET
  title = '수입차부품 | 퍼플오토',
  description = '테슬라 모델3·모델Y 부품을 중심으로 운영자가 직접 검수한 수입차부품만 판매합니다. 와이퍼, 타이어, 브레이크, 충전케이블까지 가격 확인 후 바로 상담하세요.',
  meta_keywords = '수입차부품,테슬라 부품,모델3 부품,모델Y 부품,테슬라 와이퍼,테슬라 타이어,테슬라 충전케이블,테슬라 브레이크패드,벤츠 부품,BMW 부품,아우디 부품,수입차 정품호환,수입차 순정부품,전기차 부품,테슬라 액세서리,테슬라 외장튜닝',
  og_title = '수입차부품 | 퍼플오토',
  og_description = '테슬라 모델3·모델Y 부품을 중심으로 운영자가 직접 검수한 수입차부품만 판매합니다.',
  twitter_description = '테슬라 모델3·모델Y 부품을 중심으로 검수한 수입차부품을 만나보세요.',
  updated_at = now()
WHERE page_path = '/parts-register';

UPDATE seo_page_meta SET
  title = '고객후기 | 퍼플오토',
  description = '퍼플오토와 함께한 고객들의 실제 후기를 만나보세요. 퍼플오토 유튜브, 블로그, 고객후기까지 한곳에서 확인할 수 있습니다.',
  meta_keywords = '퍼플오토 후기,장기렌트 후기,리스 후기,승계매입 후기,오토리스 후기,퍼플리뷰,장기렌트 이용후기,리스승계 이용후기,장기렌트 추천,오토리스 추천',
  og_title = '고객후기 | 퍼플오토',
  og_description = '퍼플오토와 함께한 고객들의 실제 후기를 만나보세요.',
  twitter_description = '퍼플오토와 함께한 고객들의 실제 후기를 만나보세요.',
  updated_at = now()
WHERE page_path = '/reviews-customer';

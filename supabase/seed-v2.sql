-- 퍼플리스 샘플 데이터 v2 (schema-v2.sql 실행 후)
-- Supabase SQL Editor에서 실행

-- 중고차 목록 (listing_id 481~484)
INSERT INTO used_cars (listing_id, origin, name, year, fuel, mileage, price_num, brand, segment, status, photo_count, thumb_url, tags, badge, badge_class, meta, price, detail_slug, sort_order) VALUES
(481, 'domestic', '기아 더 뉴 K3 1.6 가솔린 트렌디', 2022, '가솔린', 66926, 1350, '기아', '세단', '판매중', 20, '/assets/usedcars/481-1.jpg', ARRAY['세이프6','무사고','짧은주행'], '국산차', 'badge-grad', '2022년 · 6.7만km · 가솔린', '1,350만원', '481', 1),
(482, 'domestic', '현대 스타리아 2.2 디젤 라운지 9인승', 2022, '디젤', 131191, 2650, '현대', '승합', '판매중', 20, '/assets/usedcars/482-1.jpg', ARRAY['세이프6','무사고','풀옵션'], '국산차', 'badge-grad', '2022년 · 13.1만km · 디젤', '2,650만원', '482', 2),
(483, 'domestic', '기아 더 뉴쏘렌토 하이브리드(MQ4) 1.6 HEV 2WD 프레스티지', 2025, '하이브리드', 18257, 3550, '기아', 'SUV', '판매중', 20, '/assets/usedcars/483-1.jpg', ARRAY['제작사A/S','세이프6','무사고'], '국산차', 'badge-grad', '2025년 · 1.8만km · 하이브리드', '3,550만원', '483', 3),
(484, 'domestic', '기아 디 올뉴니로EV 에어', 2023, '전기', 5214, 2950, '기아', 'SUV', '판매중', 20, '/assets/usedcars/484-1.jpg', ARRAY['제작사A/S','세이프6','짧은주행'], '국산차', 'badge-grad', '2023년 · 0.5만km · 전기', '2,950만원', '484', 4)
ON CONFLICT (listing_id) DO NOTHING;

-- 부품 샘플
INSERT INTO parts (listing_id, brand, category, name, price, stock, thumb_url, tags, sort_order) VALUES
(1, 'tesla', '와이퍼', '모델3/Y 전용 무소음 와이퍼 (좌우 1세트)', 89000, '재고있음', '/assets/parts/part-1.jpg', ARRAY['정품호환','당일발송'], 1),
(2, 'tesla', '타이어', '모델Y 19인치 순정 휠 타이어 4본 세트', 1280000, '재고있음', '/assets/parts/part-2.jpg', ARRAY['순정규격'], 2),
(3, 'tesla', '브레이크', '모델3 퍼포먼스 브레이크 패드 (전륜)', 215000, '재고있음', '/assets/parts/part-3.jpg', ARRAY['고성능'], 3)
ON CONFLICT (listing_id) DO NOTHING;

-- 고객후기 샘플
INSERT INTO customer_reviews (listing_id, title, body, author, views, published_at, sort_order) VALUES
(1, '장기렌트 처음인데 친절하게 안내해주셔서 좋았어요', '처음 장기렌트를 이용했는데 상담부터 출고까지 친절하게 안내해주셔서 만족했습니다.', '김*수', 312, '2026-06-25', 1),
(2, 'G80 출고 후기 — 생각보다 빠르게 받았습니다', '제네시스 G80 장기렌트 출고가 생각보다 빨라서 좋았습니다.', '이*영', 245, '2026-06-23', 2)
ON CONFLICT (listing_id) DO NOTHING;

-- 블로그 샘플
INSERT INTO blog_posts (title, excerpt, thumb_url, external_url, published_at, sort_order) VALUES
('장기렌트 계약 전 꼭 확인해야 할 약관 5가지', '퍼플리스 블로그', '/assets/blog/blog-1.jpg', 'https://blog.naver.com/purplelease/000000001', '2026-06-12', 1),
('제네시스 GV70 vs GV80, 장기렌트 비용 비교', '퍼플리스 블로그', '/assets/blog/blog-2.jpg', 'https://blog.naver.com/purplelease/000000002', '2026-06-05', 2);

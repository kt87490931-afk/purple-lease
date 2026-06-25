-- 퍼플리스 샘플 데이터 (Supabase SQL Editor에서 실행)
-- 스키마(schema.sql) 실행 후 이 파일을 실행하세요.

INSERT INTO youtube_videos (video_id, title, description, thumb_url, duration, sort_order) VALUES
  ('dQw4w9WgXcQ', '퍼플리스 브랜드 필름', '오토리스 · 장기렌트 승계매입, 퍼플리스가 만들어가는 이야기', 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', '5:42', 1),
  ('9bZkp7q19f0', '장기렌트 견적 비교 가이드', '2026년형 인기 모델 견적을 직접 비교해봤습니다', 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg', '8:15', 2)
ON CONFLICT (video_id) DO NOTHING;

INSERT INTO time_deals (badge, badge_class, name, trim, was_price, now_price, lease_info, sort_order) VALUES
  ('무보증특가', 'badge-grad', 'Model Y', '2026년형 전기 Premium RWD (A/T)', '472,516원', '429,560원', '월 리스료 322,875원 · 48개월 선납30%', 1),
  ('즉시출고', 'badge-purple', '제네시스 G80', '2026년형 가솔린 2.5T AWD', '89,900원', '79,900원', '월 렌트료 589,000원 · 48개월', 2);

INSERT INTO used_cars (badge, badge_class, name, meta, price, detail_slug, sort_order) VALUES
  ('수입차', 'badge-purple', 'BMW 5시리즈 520i', '2022년 · 4.2만km · 무사고', '4,280만원', 'bmw-520i-2022', 1),
  ('국산차', 'badge-grad', '현대 아반떼 CN7', '2023년 · 2.1만km · 무사고', '1,850만원', 'avante-cn7-2023', 2);

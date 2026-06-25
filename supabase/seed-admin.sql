-- 어드민 초기 데이터 (schema-admin.sql 실행 후, 선택 실행)
-- 제네시스/현대 샘플 브랜드·모델

INSERT INTO lease_brands (slug, name, origin, logo_url, sort_order) VALUES
('genesis', '제네시스', 'domestic', '/assets/brand-logos/genesis.png', 1),
('hyundai', '현대', 'domestic', '/assets/brand-logos/hyundai.png', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lease_models (brand_id, slug, name, price_from, price_to, img_url, sort_order)
SELECT b.id, 'g80', 'G80', '5,899', '8,666', '/assets/vehicles/genesis-g80.png', 1
FROM lease_brands b WHERE b.slug = 'genesis'
ON CONFLICT (brand_id, slug) DO NOTHING;

INSERT INTO lease_models (brand_id, slug, name, price_from, price_to, img_url, sort_order)
SELECT b.id, 'g70', 'G70', '4,438', '6,130', '/assets/vehicles/genesis-g70.png', 2
FROM lease_brands b WHERE b.slug = 'genesis'
ON CONFLICT (brand_id, slug) DO NOTHING;

INSERT INTO lease_models (brand_id, slug, name, price_from, price_to, img_url, sort_order)
SELECT b.id, 'avante', '아반떼', '1,833', '2,597', '/assets/vehicles/hyundai-avante.png', 1
FROM lease_brands b WHERE b.slug = 'hyundai'
ON CONFLICT (brand_id, slug) DO NOTHING;

-- 운영자 계정은 supabase/seed-admin-user.sql 실행 (admin / 0000)

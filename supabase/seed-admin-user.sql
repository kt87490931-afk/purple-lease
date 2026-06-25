-- 기본 운영자 계정 생성: 아이디 admin / 비밀번호 0000
-- 선행: schema.sql → schema-v2.sql → schema-admin.sql 실행 후
-- Supabase Dashboard > SQL Editor 에서 전체 복사 후 Run
--
-- 로그인: admin (또는 admin@purplelease.com) / 0000
--
-- ※ 비밀번호 0000(4자) 사용을 위해:
--    Authentication > Providers > Email > Minimum password length 를 4 로 낮춰주세요.
--    (기본 6이면 로그인/생성이 거부될 수 있습니다)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_email TEXT := 'admin@purplelease.com';
  admin_password TEXT := '0000';
  admin_uid UUID := 'a0000000-0000-4000-8000-000000000001';
BEGIN
  DELETE FROM public.admin_allowlist WHERE email = admin_email OR user_id = admin_uid;
  DELETE FROM auth.identities WHERE user_id = admin_uid;
  DELETE FROM auth.users WHERE id = admin_uid OR email = admin_email;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_uid,
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin","display_name":"admin"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    false
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    admin_uid,
    jsonb_build_object(
      'sub', admin_uid::text,
      'email', admin_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    admin_uid::text,
    NOW(),
    NOW(),
    NOW()
  );

  INSERT INTO public.admin_allowlist (user_id, email)
  VALUES (admin_uid, admin_email)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
END $$;

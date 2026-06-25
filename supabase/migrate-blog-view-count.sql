-- blog_posts 조회수 컬럼 + 사이트 클릭 증가 RPC
-- Supabase SQL Editor에서 1회 실행

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_blog_views(p_id BIGINT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_views INT;
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = p_id AND is_active = true
  RETURNING view_count INTO v_views;
  RETURN COALESCE(v_views, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_views(BIGINT) TO anon, authenticated;

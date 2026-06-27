-- purple-uploads 버킷에 sitemap.xml 업로드 허용
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/xml', 'text/xml', 'text/plain', 'application/json'
]::text[]
WHERE id = 'purple-uploads';

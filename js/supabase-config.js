/**
 * Supabase 설정
 * 프로젝트 생성 후 Dashboard > Settings > API 에서 값을 복사해 넣으세요.
 */
window.SUPABASE_CONFIG = {
  url: 'https://zliclwgiaqvilnnookyi.supabase.co',
  anonKey: 'sb_publishable_2Llb_MkOeAPqGN8BFaALfw_umUNEzP7',
  /** 어드민 「채널 동기화」용 — Google Cloud YouTube Data API v3 키 (공개 읽기 전용) */
  youtubeApiKey: 'AIzaSyBIsyVv2rbuwiE0-ib9dT1bwndP_bnzZVM',
  youtubeChannelHandle: 'purplelease',
  /** 오토피아 중고차 동기화 API 베이스 URL */
  swautopiaBaseUrl: 'https://swautopia.co.kr',
  /** KS오토플랜 견적 동기화 — Supabase Edge Function 프록시 (IP 차단 우회) */
  ksRentcarEdgeProxyUrl: 'https://zliclwgiaqvilnnookyi.supabase.co/functions/v1/ks-rentcar-proxy',
  /** 동일 출처 프록시 fallback (CORS 우회) */
  ksRentcarProxyPath: '/api/ks',
  /** Node CLI·서버 직접 호출용 */
  ksRentcarBaseUrl: 'https://ks-rentcar.com'
};

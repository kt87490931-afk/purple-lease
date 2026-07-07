/**
 * 제휴업체 샘플 데이터 — 목록·상세 공용 (추후 Supabase/어드민 연동)
 */
(function (global) {
  'use strict';

  var PLACEHOLDER_THUMB = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
  var SAMPLE_IMG_A = 'https://images.unsplash.com/photo-1507136566006-4b16ce8d0138?w=800&q=80';
  var SAMPLE_IMG_B = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80';
  var SAMPLE_IMG_C = 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80';

  var sidoData = [
    { code: 'seoul', name: '서울', sigungu: ['강남구', '서초구', '송파구', '마포구', '영등포구'] },
    { code: 'gyeonggi', name: '경기', sigungu: ['용인시', '수원시', '성남시', '화성시', '기흥구'] },
    { code: 'incheon', name: '인천', sigungu: ['남동구', '부평구', '연수구'] },
    { code: 'gangwon', name: '강원', sigungu: ['춘천시', '원주시', '강릉시'] },
    { code: 'chungbuk', name: '충북', sigungu: ['청주시', '충주시'] },
    { code: 'chungnam', name: '충남', sigungu: ['천안시', '아산시'] },
    { code: 'daejeon', name: '대전', sigungu: ['유성구', '서구'] },
    { code: 'sejong', name: '세종', sigungu: ['세종시'] },
    { code: 'gyeongbuk', name: '경북', sigungu: ['포항시', '구미시'] },
    { code: 'gyeongnam', name: '경남', sigungu: ['창원시', '김해시'] },
    { code: 'daegu', name: '대구', sigungu: ['수성구', '달서구'] },
    { code: 'ulsan', name: '울산', sigungu: ['남구', '중구'] },
    { code: 'busan', name: '부산', sigungu: ['해운대구', '수영구'] },
    { code: 'jeonbuk', name: '전북', sigungu: ['전주시', '군산시'] },
    { code: 'jeonnam', name: '전남', sigungu: ['여수시', '순천시'] },
    { code: 'gwangju', name: '광주', sigungu: ['서구', '북구'] },
    { code: 'jeju', name: '제주', sigungu: ['제주시', '서귀포시'] }
  ];

  /** 어드민에서 관리할 해시태그 목록 (1차 샘플) */
  var partnerTags = [
    '판금도색',
    '튜닝',
    '디테일링',
    '썬팅',
    '랩핑',
    'PPF',
    '세라믹코팅'
  ];

  var INTRO_VIDEO_YOUTUBE_ID = 'dQw4w9WgXcQ';

  function defaultBody(name) {
    return (
      '<p><strong>' + name + '</strong>은 퍼플오토가 검증한 제휴 업체입니다. 상담 후 방문 예약을 도와드립니다.</p>' +
      '<figure class="pd-body-figure"><img src="' + SAMPLE_IMG_B + '" alt="' + name + ' 시공 사진"></figure>' +
      '<p>수입·국산 차량 모두 상담 가능하며, 견적과 작업 일정을 투명하게 안내해 드립니다. 궁금한 점은 대표번호로 문의해 주세요.</p>'
    );
  }

  var partnersData = [
    {
      id: 1,
      name: '퍼플코팅 강남점',
      region: '서울',
      sigungu: '강남구',
      address: '서울 강남구 테헤란로 123',
      desc: '수입차 전문 광택·코팅 및 실내 디테일링 서비스를 제공합니다.',
      phone: '02-1234-5678',
      tags: ['디테일링', '세라믹코팅'],
      is_premium: true,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_A, thumb: SAMPLE_IMG_A },
        { type: 'image', url: SAMPLE_IMG_B, thumb: SAMPLE_IMG_B }
      ],
      body_html:
        '<p>퍼플코팅 강남점은 <strong>수입차 전문 디테일링</strong> 업체로, 신차 출고 전 보호 코팅부터 실내 클리닝까지 원스톱으로 진행합니다.</p>' +
        '<figure class="pd-body-figure"><img src="' + SAMPLE_IMG_A + '" alt="세라믹 코팅 시공"></figure>' +
        '<p>세라믹 코팅, 유리막 코팅, 실내 디테일링 패키지를 운영하며, 차량 상태에 맞춘 맞춤 견적을 제공합니다.</p>' +
        '<figure class="pd-body-figure"><img src="' + SAMPLE_IMG_C + '" alt="실내 디테일링"></figure>' +
        '<p>방문 전 전화 상담을 권장드립니다. 퍼플오토 고객은 우대 혜택이 적용될 수 있습니다.</p>'
    },
    {
      id: 2,
      name: '기흥 판금도색센터',
      region: '경기',
      sigungu: '기흥구',
      address: '경기 용인시 기흥구 강남서로 9',
      desc: '사고차·접촉사고 판금, 도색 및 보험 연계 작업을 전문으로 합니다.',
      phone: '031-987-6543',
      tags: ['판금도색'],
      is_premium: false,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_C, thumb: SAMPLE_IMG_C }
      ],
      body_html: defaultBody('기흥 판금도색센터')
    },
    {
      id: 3,
      name: '수원 썬팅스튜디오',
      region: '경기',
      sigungu: '수원시',
      address: '경기 수원시 영통구 매탄동 123',
      desc: '고급 차량용 썬팅 필름 시공 및 단열 썬팅 전문점입니다.',
      phone: '031-555-2222',
      tags: ['썬팅'],
      is_premium: false,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_B, thumb: SAMPLE_IMG_B }
      ],
      body_html: defaultBody('수원 썬팅스튜디오')
    },
    {
      id: 4,
      name: '부산 랩핑하우스',
      region: '부산',
      sigungu: '해운대구',
      address: '부산 해운대구 센텀로 99',
      desc: 'PPF, 컬러 랩핑 등 차량 외장 보호 및 디자인 랩핑을 진행합니다.',
      phone: '051-321-4567',
      tags: ['랩핑', 'PPF'],
      is_premium: false,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_A, thumb: SAMPLE_IMG_A }
      ],
      body_html: defaultBody('부산 랩핑하우스')
    },
    {
      id: 5,
      name: '대구 튜닝가라지',
      region: '대구',
      sigungu: '수성구',
      address: '대구 수성구 동대구로 45',
      desc: '서스펜션, 배기 등 합법 튜닝 및 ECU 세팅 전문업체입니다.',
      phone: '053-111-2222',
      tags: ['튜닝'],
      is_premium: false,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_C, thumb: SAMPLE_IMG_C }
      ],
      body_html: defaultBody('대구 튜닝가라지')
    },
    {
      id: 6,
      name: '화성 디테일링랩',
      region: '경기',
      sigungu: '화성시',
      address: '경기 화성시 동탄대로 77',
      desc: '신차 출고 전 보호 디테일링 및 세라믹 코팅을 제공합니다.',
      phone: '031-222-3333',
      tags: ['디테일링', '세라믹코팅'],
      is_premium: true,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_A, thumb: SAMPLE_IMG_A },
        { type: 'image', url: SAMPLE_IMG_B, thumb: SAMPLE_IMG_B }
      ],
      body_html: defaultBody('화성 디테일링랩')
    },
    {
      id: 7,
      name: '인천 판금도색공방',
      region: '인천',
      sigungu: '남동구',
      address: '인천 남동구 구월로 12',
      desc: '외제차 전문 판금도색, 색상 매칭 작업이 가능합니다.',
      phone: '032-444-5555',
      tags: ['판금도색'],
      is_premium: false,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_C, thumb: SAMPLE_IMG_C }
      ],
      body_html: defaultBody('인천 판금도색공방')
    },
    {
      id: 8,
      name: '성남 썬팅앤랩핑',
      region: '경기',
      sigungu: '성남시',
      address: '경기 성남시 분당구 정자로 8',
      desc: '썬팅과 랩핑을 동시에 진행하는 원스톱 외장 케어 업체입니다.',
      phone: '031-666-7777',
      tags: ['썬팅', '랩핑'],
      is_premium: false,
      video_youtube_id: INTRO_VIDEO_YOUTUBE_ID,
      gallery: [
        { type: 'video', youtube_id: INTRO_VIDEO_YOUTUBE_ID, thumb: PLACEHOLDER_THUMB },
        { type: 'image', url: SAMPLE_IMG_B, thumb: SAMPLE_IMG_B }
      ],
      body_html: defaultBody('성남 썬팅앤랩핑')
    }
  ];

  function youtubeThumbFromId(youtubeId) {
    if (!youtubeId) return PLACEHOLDER_THUMB;
    return 'https://i.ytimg.com/vi/' + encodeURIComponent(youtubeId) + '/hqdefault.jpg';
  }

  function youtubeEmbedUrl(youtubeId) {
    if (!youtubeId) return '';
    return 'https://www.youtube.com/embed/' + encodeURIComponent(youtubeId) + '?rel=0&modestbranding=1';
  }

  function getPartnerById(id) {
    var n = parseInt(id, 10);
    return partnersData.find(function (p) { return p.id === n; }) || null;
  }

  var pageSettings = {
    youtube_id: INTRO_VIDEO_YOUTUBE_ID,
    title: '퍼플오토 제휴업체 네트워크 소개',
    description: '전국 검증된 제휴업체와 함께하는 퍼플오토의 서비스를 영상으로 확인해보세요.',
    thumb_url: PLACEHOLDER_THUMB
  };
  var loadedFromDb = false;
  var loadPromise = null;

  function applyBundle(bundle) {
    if (!bundle) return;
    if (bundle.pageSettings) {
      var ytId = bundle.pageSettings.youtube_id || INTRO_VIDEO_YOUTUBE_ID;
      pageSettings = {
        youtube_id: ytId,
        title: bundle.pageSettings.title || pageSettings.title,
        description: bundle.pageSettings.description || pageSettings.description,
        thumb_url: bundle.pageSettings.thumb_url || youtubeThumbFromId(ytId)
      };
    }
    if (bundle.tags && bundle.tags.length) partnerTags = bundle.tags.slice();
    if (bundle.regions && bundle.regions.length) sidoData = bundle.regions.slice();
    if (bundle.partners && bundle.partners.length) partnersData = bundle.partners.slice();
    loadedFromDb = !!(bundle.pageSettings || (bundle.partners && bundle.partners.length));
  }

  function ensureLoaded() {
    if (loadedFromDb) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = (async function () {
      var lease = window.PurpleLeaseData;
      if (!lease || !lease.isConfigured || !lease.isConfigured()) return;
      try {
        var bundle = await lease.fetchPartnersBundle();
        if (bundle) applyBundle(bundle);
      } catch (e) {
        console.warn('[partners-data] Supabase load failed, using fallback', e);
      }
    })();
    return loadPromise;
  }

  function getPageSettings() {
    var ytId = pageSettings.youtube_id || INTRO_VIDEO_YOUTUBE_ID;
    return {
      youtube_id: ytId,
      title: pageSettings.title,
      description: pageSettings.description,
      thumb_url: pageSettings.thumb_url || youtubeThumbFromId(ytId)
    };
  }

  function getIntroVideoId() {
    return getPageSettings().youtube_id || INTRO_VIDEO_YOUTUBE_ID;
  }

  function listThumbUrls(partner) {
    var g = partner.gallery && partner.gallery[0];
    var videoThumb = PLACEHOLDER_THUMB;
    var imageThumb = SAMPLE_IMG_A;
    partner.gallery.forEach(function (item) {
      if (item.type === 'video') videoThumb = item.thumb || videoThumb;
      if (item.type === 'image') imageThumb = item.thumb || item.url || imageThumb;
    });
    var first = partner.gallery && partner.gallery[0];
    return {
      video_thumb_url: videoThumb,
      image_thumb_url: imageThumb,
      thumbnail_type: first && first.type === 'video' ? 'video' : 'image'
    };
  }

  global.PurplePartnersData = {
    INTRO_VIDEO_YOUTUBE_ID: INTRO_VIDEO_YOUTUBE_ID,
    PLACEHOLDER_THUMB: PLACEHOLDER_THUMB,
    ensureLoaded: ensureLoaded,
    getPageSettings: getPageSettings,
    getIntroVideoId: getIntroVideoId,
    youtubeThumbFromId: youtubeThumbFromId,
    getSidoData: function () { return sidoData.slice(); },
    getPartnerTags: function () { return partnerTags.slice(); },
    getPartners: function () { return partnersData.slice(); },
    getPartnerById: getPartnerById,
    youtubeEmbedUrl: youtubeEmbedUrl,
    listThumbUrls: listThumbUrls
  };
})(window);

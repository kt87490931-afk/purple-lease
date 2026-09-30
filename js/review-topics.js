/**
 * 퍼플오토 고객후기 AI 생성 — 주제 마스터 풀
 * category: sell | new_lease | used_car | onestop  (transfer = 퇴역, 기존 후기 표시용 라벨만 유지)
 *
 * 생성 비중: sell(장기렌트카·리스차 매입·처분, 키워드 지정) 80% : 일반 주제 20%
 */
'use strict';

var BRAND_NAME = '퍼플오토';
var BRAND_PHONE = '1555-6362';

var CATEGORY_LABELS = {
  sell: '장기렌트·리스차 매입·처분',
  new_lease: '신차·리스',
  used_car: '중고차',
  transfer: '리스 승계',
  onestop: '원스톱 카라이프'
};

/** sell 주제 전용 키워드 (장기렌트카·리스차 교대로 순환) */
var SELL_KEYWORDS = [
  { keyword: '장기렌트카 판매', car: 'rent', intent: 'sell' },
  { keyword: '리스차 판매', car: 'lease', intent: 'sell' },
  { keyword: '장기렌트카 매각', car: 'rent', intent: 'sell' },
  { keyword: '리스차 매각', car: 'lease', intent: 'sell' },
  { keyword: '장기렌트카 처분', car: 'rent', intent: 'sell' },
  { keyword: '리스차 처분', car: 'lease', intent: 'sell' },
  { keyword: '장기렌트카 판매하는 방법', car: 'rent', intent: 'howto' },
  { keyword: '리스차 판매하는 방법', car: 'lease', intent: 'howto' },
  { keyword: '장기렌트카 인수', car: 'rent', intent: 'acquire' },
  { keyword: '리스차 인수', car: 'lease', intent: 'acquire' },
  { keyword: '장기렌트카 만기', car: 'rent', intent: 'maturity' },
  { keyword: '리스차 만기', car: 'lease', intent: 'maturity' },
  { keyword: '장기렌트카 할부', car: 'rent', intent: 'installment' },
  { keyword: '리스차 할부', car: 'lease', intent: 'installment' },
  { keyword: '장기렌트카 중도해지', car: 'rent', intent: 'midterm' },
  { keyword: '장기렌트카 인수후판매', car: 'rent', intent: 'acquire_sell' }
];

var CAR_TYPE_LABELS = { rent: '장기렌트카', lease: '리스차' };

/** sell 주제 프롬프트에 넣는 실제 업무 범위 (이 밖의 절차·수치는 지어내지 않도록) */
var SELL_BUSINESS_FACTS = [
  '퍼플오토는 고객이 타고 있던 장기렌트카·리스차를 직접 매입하거나, 처분(판매)을 도와주는 업체다',
  '할부가 남아 있는 차도 매입할 수 있다',
  '인수 후 판매: 고객이 계약 차량을 인수한 뒤, 그 차를 퍼플오토가 매입하는 방식이다',
  '상담 후 실제 진행은 보통 1~2일이면 마무리된다'
];

/** sell(80%) 주제 — intents 로 SELL_KEYWORDS 와 매칭 */
var SELL_TOPICS = [
  { id: 51, category: 'sell', intents: ['sell', 'howto'], titleSample: '타던 차 정리하려고 알아보다 퍼플오토에 맡겼더니 이틀 만에 끝났습니다', topic: '사정상 더 이상 타기 어려워진 계약 차량을 퍼플오토에 매입 요청. 계약 상태 확인, 차량 평가, 서류 처리까지 퍼플오토가 맡아 1~2일 만에 마무리된 후기.' },
  { id: 52, category: 'sell', intents: ['howto', 'sell'], titleSample: '판매 방법을 하나도 몰랐는데 상담 한 번에 순서가 정리됐어요', topic: '계약 중인 차를 어떻게 팔아야 하는지 몰라 검색하다 퍼플오토에 문의. 상담부터 차량 확인, 매입 금액 안내, 서류 처리까지 무엇을 하면 되는지 차근차근 안내받고 그대로 진행한 후기.' },
  { id: 53, category: 'sell', intents: ['sell'], titleSample: '여러 곳 견적 받아봤는데 퍼플오토 매입 금액 설명이 가장 납득됐습니다', topic: '타던 계약 차량을 팔기 위해 여러 곳에 문의했지만, 퍼플오토가 차량 상태와 남은 계약 조건을 근거로 매입 금액을 투명하게 설명해 줘서 믿고 맡긴 후기.' },
  { id: 54, category: 'sell', intents: ['sell'], titleSample: '법인 명의 차량 정리, 퍼플오토가 서류까지 맡아줘서 수월했습니다', topic: '법인·개인사업자 명의로 이용하던 계약 차량을 정리해야 했던 담당자가 퍼플오토 매입으로 서류와 일정을 한 번에 해결한 후기.' },
  { id: 55, category: 'sell', intents: ['sell', 'acquire_sell'], titleSample: '차를 바꾸고 싶었는데 남은 계약이 발목, 퍼플오토 매입으로 풀었습니다', topic: '남은 계약 기간 때문에 차를 바꾸지 못하던 고객이 퍼플오토에 타던 차 매입을 맡겨 계약을 정리하고 다음 차 계획을 세우게 된 후기.' },
  { id: 56, category: 'sell', intents: ['sell'], titleSample: '출국 일정 때문에 급하게 정리해야 했는데 1~2일 만에 해결됐어요', topic: '해외 출국·지방 이전 등으로 급하게 계약 차량을 정리해야 했던 고객이 퍼플오토의 빠른 매입 진행 덕분에 일정 안에 처분을 마친 후기.' },
  { id: 57, category: 'sell', intents: ['sell', 'midterm'], titleSample: '월 납입 부담이 커져 정리를 결심, 퍼플오토 상담이 큰 도움이 됐습니다', topic: '소득 변화로 매달 나가는 납입금이 부담스러워진 고객이 퍼플오토에 타던 차 처분을 상담하고, 가장 부담이 적은 정리 방법을 안내받아 진행한 후기.' },
  { id: 58, category: 'sell', intents: ['acquire'], titleSample: '인수할지 말지 고민, 퍼플오토가 인수 금액과 시세를 비교해 줬어요', topic: '계약 차량을 인수할지 고민하던 고객에게 퍼플오토가 계약상 인수 금액과 현재 차량 시세를 비교해 설명하고, 인수 후 바로 판매하는 방법까지 안내해 준 후기.' },
  { id: 59, category: 'sell', intents: ['acquire', 'acquire_sell'], titleSample: '인수 절차가 복잡할 줄 알았는데 서류부터 매입까지 한 번에 끝났습니다', topic: '계약 차량 인수 절차와 필요한 서류를 퍼플오토에게 안내받고, 인수 직후 퍼플오토 매입까지 이어져 따로 발품 팔 필요가 없었던 후기.' },
  { id: 60, category: 'sell', intents: ['maturity', 'acquire_sell'], titleSample: '만기 앞두고 그냥 반납하려다 인수 후 판매로 바꿨습니다', topic: '계약 만기가 다가와 차를 반납하려던 고객이 퍼플오토 상담으로 반납과 인수 후 판매를 비교해 보고, 인수 후 퍼플오토에 판매하는 쪽을 선택한 후기.' },
  { id: 61, category: 'sell', intents: ['maturity'], titleSample: '만기 두세 달 전에 미리 상담했더니 일정이 딱 맞았습니다', topic: '계약 만기 전에 미리 퍼플오토에 상담해 만기일에 맞춰 차량 정리 일정을 계획하고, 공백 없이 깔끔하게 마무리한 후기.' },
  { id: 62, category: 'sell', intents: ['maturity', 'sell'], titleSample: '만기 연장 대신 정리를 선택, 퍼플오토 덕분에 깔끔하게 끝냈어요', topic: '만기 시점에 연장·재계약 대신 차량을 정리하기로 한 고객이 퍼플오토 매입으로 빠르게 처분을 마친 후기.' },
  { id: 63, category: 'sell', intents: ['acquire_sell'], titleSample: '인수후판매라는 방법을 처음 알았는데 반납보다 훨씬 나았습니다', topic: '인수 후 판매가 무엇인지 몰랐던 고객이 퍼플오토에게 흐름(차량 인수 후 퍼플오토 매입)을 설명듣고 실제로 1~2일 만에 진행한 후기.' },
  { id: 64, category: 'sell', intents: ['acquire_sell', 'midterm'], titleSample: '계약 도중이라 포기하고 있었는데 인수 후 판매로 정리했습니다', topic: '계약 기간 중간이라 방법이 없다고 생각하던 고객이 퍼플오토에게 인수 후 판매 방식을 안내받아 차량을 정리한 후기.' },
  { id: 65, category: 'sell', intents: ['midterm'], titleSample: '중도해지 위약금 때문에 고민하다 퍼플오토에 상담했습니다', topic: '중도해지 위약금이 부담돼 망설이던 고객에게 퍼플오토가 해지 외의 정리 방법(인수 후 판매 등)과 그 차이를 비교해 설명해 준 후기.' },
  { id: 66, category: 'sell', intents: ['midterm', 'sell'], titleSample: '사업 정리로 차를 급히 처분해야 했을 때 퍼플오토가 답이었습니다', topic: '사업을 정리하게 된 자영업자가 계약 차량을 중도에 처리해야 했을 때, 퍼플오토 매입으로 부담을 줄이고 빠르게 정리한 후기.' },
  { id: 67, category: 'sell', intents: ['installment'], titleSample: '할부가 남아 있어도 매입이 된다고 해서 바로 맡겼습니다', topic: '할부가 남아 있어 팔 수 없다고 생각했던 고객이 퍼플오토에게 할부가 남은 차도 매입할 수 있다는 안내를 받고 진행한 후기.' },
  { id: 68, category: 'sell', intents: ['installment', 'sell'], titleSample: '남은 할부 정리와 매입을 한 번에, 따로 알아볼 필요가 없었어요', topic: '남은 할부 정리와 차량 매입을 퍼플오토가 한 번에 진행해 줘서 1~2일 만에 처분을 마친 후기.' },
  { id: 69, category: 'sell', intents: ['installment'], titleSample: '할부 남은 차, 제 상황에 맞는 정리 방법을 골라줬습니다', topic: '할부가 남은 차를 정리하려던 고객에게 퍼플오토가 매입 방법과 할부 승계 방법의 차이를 설명하고, 고객은 매입으로 깔끔하게 정리한 후기 (할부 승계는 선택지로 한두 문장만).' },
  { id: 70, category: 'sell', intents: ['howto', 'sell'], titleSample: '처음이라 서류가 걱정됐는데 준비할 것만 딱 알려줬어요', topic: '차량 판매가 처음이라 절차와 서류가 걱정됐던 고객에게 퍼플오토가 준비할 것과 진행 순서를 간단히 정리해 주고 대부분을 대행해 준 후기.' }
];

/** 일반(20%) 주제 — @type {Array<{id:number,category:string,titleSample:string,topic:string}>} */
var GENERAL_TOPICS = [
  /* ===== 카테고리 1: 신차·리스 (1~12) — 추후 상세 주제로 교체 가능 ===== */
  { id: 1, category: 'new_lease', titleSample: 'G80 장기렌트 첫 계약, 퍼플오토 상담으로 한 달 만에 출고했습니다', topic: '신차 장기렌트 견적 비교 후 퍼플오토에서 합리적인 조건으로 계약하고 빠르게 출고받은 후기.' },
  { id: 2, category: 'new_lease', titleSample: '법인 오토리스 2대 동시 진행, 서류·심사까지 퍼플오토가 전담해 줬어요', topic: '법인 명의 오토리스 다건 계약 시 캐피탈사별 조건 비교와 서류 준비를 퍼플오토가 대행해 준 기업 고객 후기.' },
  { id: 3, category: 'new_lease', titleSample: '전기차 EV6 리스, 보조금·충전카드 안내까지 꼼꼼했습니다', topic: '전기차 리스 계약 시 국고 보조금·세제 혜택·충전 인프라 안내를 퍼플오토가 단계별로 설명해 준 후기.' },
  { id: 4, category: 'new_lease', titleSample: '무보증 장기렌트 처음인데 선납금 없이 타기 시작했어요', topic: '선납금·보증금 부담 없이 무보증 장기렌트로 신차를 이용하게 된 개인 고객의 계약·출고 경험.' },
  { id: 5, category: 'new_lease', titleSample: 'BMW 5시리즈 리스, 여러 캐피탈 견적 중 퍼플오토 조건이 가장 합리적이었습니다', topic: '수입차 리스 견적을 여러 곳과 비교한 뒤 퍼플오토에서 월 납입·잔가·보험 조건이 가장 유리했던 후기.' },
  { id: 6, category: 'new_lease', titleSample: '그랜저 장기렌트 재계약, 담당자가 기존 조건까지 기억하고 챙겨줬어요', topic: '만기 재계약 시 기존 이용 이력을 반영해 더 나은 조건을 제안받고 재계약한 장기 고객 후기.' },
  { id: 7, category: 'new_lease', titleSample: '신규 창업 법인 첫 차량, 퍼플오토 덕분에 리스 한 방에 해결', topic: '창업 초기 법인 차량 1대를 리스로 도입하면서 세무·비용 처리까지 안내받은 사례.' },
  { id: 8, category: 'new_lease', titleSample: '카페24·온라인 비대면 견적 후 바로 상담, 출고까지 일사천리였습니다', topic: '홈페이지 견적 문의 후 전화·카톡 상담으로 이어져 신속하게 계약·출고까지 진행된 후기.' },
  { id: 9, category: 'new_lease', titleSample: '옵션 많은 팰리세이드, 트림·사양 선택부터 퍼플오토가 정리해 줬어요', topic: '복잡한 트림·옵션 선택과 캐피탈별 금리 차이를 퍼플오토가 비교표로 정리해 준 상담 후기.' },
  { id: 10, category: 'new_lease', titleSample: '5일 이내 즉시출고 약속, 실제로 일주일도 안 걸렸습니다', topic: '재고·즉시출고 가능 차량 안내와 출고 일정 관리가 정확했던 신차 리스 출고 후기.' },
  { id: 11, category: 'new_lease', titleSample: '월 렌트료 부담 줄이려고 퍼플오토와 리스 구조 다시 짰습니다', topic: '기존 타던 차량 월 부담이 커서 잔가·기간·보험 조건을 재설계해 월 납입을 낮춘 컨설팅 후기.' },
  { id: 12, category: 'new_lease', titleSample: '첫 차 장기렌트, 약관·보험·사고 처리까지 미리 설명해 줘서 안심', topic: '첫 차량 장기렌트 고객에게 계약 전 약관·보험·사고 시 절차를 친절히 안내해 불안을 해소한 후기.' },

  /* ===== 카테고리 2: 중고차 (13~26, 19번은 퇴역) ===== */
  { id: 13, category: 'used_car', titleSample: '중고차 매입 견적 3곳 비교했는데 퍼플오토가 가장 공정했어요', topic: '기존 차량 매입 시 여러 곳 견적 후 퍼플오토의 공정한 시세 평가와 빠른 입금에 만족한 후기.' },
  { id: 14, category: 'used_car', titleSample: 'swautopia 연동 매물 보고 방문, 실차 상태 설명이 정확했습니다', topic: '온라인 중고차 매물 확인 후 방문·시승했을 때 실제 차량 상태가 안내와 일치했던 구매 후기.' },
  { id: 15, category: 'used_car', titleSample: '수입차 중고 구매, 성능·이력 확인까지 퍼플오토가 챙겨줬어요', topic: '수입 중고차 구매 시 성능점검·사고 이력·리콜 여부를 꼼꼼히 확인해 준 구매 후기.' },
  { id: 16, category: 'used_car', titleSample: '중고차 판매 직거래 말고 퍼플오토 매입, 스트레스 없이 끝냈습니다', topic: '개인 직거래 부담 대신 퍼플오토 매입 대행으로 서류·명의 이전까지 깔끔하게 처리한 후기.' },
  { id: 17, category: 'used_car', titleSample: '가족용 SUV 중고 구매, 예산 맞춰 후보 3대 추천받았어요', topic: '예산·용도에 맞춰 중고차 후보를 비교 추천받고 최종 구매까지 상담받은 후기.' },
  { id: 18, category: 'used_car', titleSample: '중고차 구매 후 A/S·보증 안내까지 해줘서 든든했습니다', topic: '중고차 구매 후 보증 범위·정비·문의 채널을 명확히 안내받아 안심하고 구매한 후기.' },
  { id: 20, category: 'used_car', titleSample: '법인 중고차 2대 매입, 감가 반영 없이 합리적 가격 받았습니다', topic: '법인 보유 중고차 일괄 매입 시 시세·감가를 공정하게 반영해 처리한 기업 후기.' },
  { id: 21, category: 'used_car', titleSample: '첫 중고차 구매 긴장했는데, 퍼플오토 상담사분이 차근차근 알려주셨어요', topic: '중고차 구매가 처음인 고객에게 점검 항목·계약서·대금 지급 순서를 단계별로 안내한 후기.' },
  { id: 22, category: 'used_car', titleSample: '지방에서 용인까지 왔는데, 시간 맞춰 차량·서류 다 준비돼 있었어요', topic: '지방 고객 방문 시 사전 준비·일정 조율·당일 계약 처리가 매끄러웠던 후기.' },
  { id: 23, category: 'used_car', titleSample: '중고차 매물 헛걸음 안 하려고 퍼플오토에 맡겼더니 딱 맞는 차 찾았어요', topic: '원하는 조건의 매물을 사전 필터링해 헛방문 없이 적합한 차량을 찾게 도와준 후기.' },
  { id: 24, category: 'used_car', titleSample: '타던 차 팔고 중고 SUV로 갈아탔는데, 대차·매입 동시 진행 편했습니다', topic: '기존 차 매입과 중고차 구매를 동시에 진행해 공백 기간 없이 갈아탄 후기.' },
  { id: 25, category: 'used_car', titleSample: '중고차 대출·현금 구매 고민, 퍼플오토가 비용 구조 비교해 줬어요', topic: '중고차 구매 시 현금·할부·리스 등 결제 방식별 총비용을 비교 안내받은 후기.' },
  { id: 26, category: 'used_car', titleSample: '사고 이력 있는 차 피하려고, 퍼플오토 이력 조회 대행 받았습니다', topic: '중고차 구매 전 보험 이력·사고·침수 여부 확인을 대행해 줘 안심하고 구매한 후기.' },

  /* ===== 카테고리 4: 원스톱 카라이프 (38~50) ===== */
  { id: 38, category: 'onestop', titleSample: '[원스톱] 중고차 매입부터 신차 리스 출고까지 퍼플오토 한 곳에서 하루 만에', topic: '기존 내 차를 좋은 가격에 처분함과 동시에 새로 탈 신차 리스 인도까지 연결해 준 퍼플오토 원스톱 서비스의 편리함.' },
  { id: 39, category: 'onestop', titleSample: '여기저기 알아보기 귀찮으시죠? 차 사고 파는 모든 과정 퍼플오토 정착기', topic: '중고차 상사, 리스 에이전시, 대차 플랫폼을 각각 알아볼 필요 없이 퍼플오토 한 곳에서 모든 차량 거래를 해결한 대만족 후기.' },
  { id: 40, category: 'onestop', titleSample: '리스차 반납하고 새 리스로 갈아타기, 퍼플오토 대차로 감가 손해 없이', topic: '기존 리스 계약 만기 시점에 반납 처리를 대행하고 신형 모델로 자연스럽게 갈아타게 도와준 연속 케어 시스템 칭찬.' },
  { id: 41, category: 'onestop', titleSample: '내 차 팔 땐 높게, 새 차 살 땐 합리적으로 — 퍼플오토 양방향 혜택', topic: '기존 차량 매입 시에는 마진을 최소화해 높게 쳐주고, 신차 구입 리스료는 합리적으로 낮춰 이중 혜택을 본 스토리.' },
  { id: 42, category: 'onestop', titleSample: '중고차 vs 신차 리스 고민, 퍼플오토 컨설팅으로 인생 차 만났어요', topic: '구매 방식 제한 없이 중고차 매입·판매부터 신차 금융까지 전 판도를 다루기 때문에, 고객에게 가장 이득이 되는 객관적 솔루션을 제안해 준 강점.' },
  { id: 43, category: 'onestop', titleSample: '법인 차량 3대 교체, 퍼플오토 원스톱으로 예산 대폭 절감', topic: '법인 노후 차량 처분과 신규 패키지 리스 도입을 일괄 진행하여 행정 소요와 비용을 줄인 기업 고객 후기.' },
  { id: 44, category: 'onestop', titleSample: '퍼플오토는 차 파는 곳이 아니라, 카라이프 전반을 매니지먼트해 주는 파트너', topic: '일회성 판매에 그치지 않고 타던 차 처분(매입), 인수 후 판매, 다음 차 교체까지 차와 관련된 생애 주기를 함께 고민해 주는 브랜드 가치 극찬.' },
  { id: 45, category: 'onestop', titleSample: '장기렌트에서 리스로 갈아탈 때도 타던 차 매입·신규 계약 동시에 풀어줬어요', topic: '기존 장기렌트 차량을 퍼플오토가 매입해 중도 처분 문제를 해결함과 동시에 원하는 외제차 리스 구입까지 원스톱으로 연결해 준 복합 해결 사례.' },
  { id: 46, category: 'onestop', titleSample: '취등록세·명의 이전 서류, 퍼플오토 원스톱 프로세스로 도장만 찍었습니다', topic: '차량 매매와 리스 실행 시 발생하는 복잡한 명의 이전, 세무 신고 절차를 퍼플오토 전담팀이 대행해 준 편안함 강조.' },
  { id: 47, category: 'onestop', titleSample: '타던 차 팔고 일주일 만에 신차 리스 출고, 퍼플오토 리얼 후기', topic: '기존 차량 처분 대금으로 리스 초기 보증금을 충당하여 추가 지출 없이 빠르게 신차를 구입하게 된 효율적 프로세스.' },
  { id: 48, category: 'onestop', titleSample: '개인 직거래 고생 말고, 퍼플오토 매입 대행으로 제값 받고 팔았습니다', topic: '감가 횡포가 심한 일반 중고차 시장 대신, 퍼플오토의 공정한 가치 평가를 통해 깔끔하게 차량을 매입 처리한 후기.' },
  { id: 49, category: 'onestop', titleSample: '첫 차부터 나중 처분까지 걱정 끝, 퍼플오토 원스톱 가이드의 안심', topic: '퍼플오토와 계약하면 나중에 타던 차를 팔거나 처분해야 할 때도 퍼플오토가 직접 매입해 준다는 확신을 얻은 고객의 계약 소감.' },
  { id: 50, category: 'onestop', titleSample: '자동차 매매의 처음과 끝, 퍼플오토 올인원으로 차 관리가 쉬워졌습니다', topic: '차량 구입(리스/렌트), 타던 차 판매(매입), 만기·중도 처분(인수 후 판매)까지 자동차 거래 전 과정을 퍼플오토 하나로 해결한 종합 대만족 후기.' }
];

/** 퇴역 주제 (제3자 승계 중심) — 자동·수동 선택 대상 아님. 기존 후기 topic_id 참고용으로 보존 */
var RETIRED_TOPICS = [
  { id: 19, category: 'used_car', titleSample: '리스 승계 차량 중고로 이어받기, 퍼플오토가 조건 정리해 줬어요', topic: '승계 잔여 계약이 있는 중고차를 인수할 때 잔여 리스료·인도금을 투명하게 정리해 준 후기.' },
  { id: 27, category: 'transfer', titleSample: '캐피탈사마다 다른 승계 조건, 퍼플오토가 중간에서 완벽히 조율해 줬습니다', topic: '캐피탈사마다 다른 승계 조건과 심사 기준을 퍼플오토가 중간에서 조율하고 서류 처리를 전담해 준 해결사 면모 강조.' },
  { id: 28, category: 'transfer', titleSample: '남이 타던 리스 승계 매물, 퍼플오토 검증으로 안전하게 받아왔습니다', topic: '승계 매물을 이어받으려는 구매자 시점에서, 전 차주의 미회수원금과 인도금 계산 오류를 퍼플오토가 정확히 정산해 준 안전 거래 후기.' },
  { id: 29, category: 'transfer', titleSample: '개인 간 리스 승계 사기 맞을 뻔했다가 퍼플오토 검토로 구했습니다', topic: '온라인 카페 등에서 직거래하다가 독소 조항이나 지원금 사기에 휘말릴 뻔한 계약을 퍼플오토가 전문적으로 스크리닝하여 구해준 스토리.' },
  { id: 30, category: 'transfer', titleSample: '퍼플오토 리스 승계: 올린 지 일주일 만에 다음 차주 매칭 성공', topic: '승계 매물이 안 나가서 매달 리스료만 버리던 중, 퍼플오토의 네트워킹과 마케팅으로 빠르게 매칭된 후기.' },
  { id: 31, category: 'transfer', titleSample: '승계 심사 부결 두 번… 퍼플오토 조율로 승계 받아냈습니다', topic: '소득 증빙이 부족해 승계 심사에서 계속 떨어지던 구매자를 위해, 퍼플오토의 금융 노하우로 보완 서류를 준비해 승인받은 사례.' },
  { id: 32, category: 'transfer', titleSample: '위약금 부담 크던데, 퍼플오토 승계로 중도 해지 리스크 막았습니다', topic: '법인 차량 구조조정으로 급하게 리스 차를 처분해야 할 때, 퍼플오토의 신속한 승계 전환으로 대규모 손실을 막은 고마움 표현.' },
  { id: 33, category: 'transfer', titleSample: '퍼플오토 신차 계약, 나중에 승계까지 책임진다는 말에 안심했습니다', topic: '첫 계약 단계부터 향후 발생할지 모르는 중도 처분(승계) 리스크까지 퍼플오토가 끝까지 책임진다는 약속과 신뢰를 다룬 주제.' },
  { id: 34, category: 'transfer', titleSample: '인도금·승계 수수료, 퍼플오토가 투명하게 정산해 준 일지', topic: '승계 시점의 일할 계산과 캐피탈 승계 수수료 문제를 공정하게 정산해 양측(판매자, 구매자) 모두 만족한 후기.' },
  { id: 35, category: 'transfer', titleSample: '승계 차량도 걱정 끝, 퍼플오토 사전 검증·보증 덕분에 믿고 이어받았어요', topic: '승계 차량이라 혹시 모를 결함이 걱정되었으나 퍼플오토의 사전 성능 검증과 보증 덕분에 믿고 이어받은 구매자 후기.' },
  { id: 36, category: 'transfer', titleSample: '폐업 위기 속 퍼플오토 승계 지원으로 위약금 부담 피했습니다', topic: '경영 악화로 차량 유지가 불가능해진 소상공인이 퍼플오토의 발 빠른 승계 지원 덕분에 빚더미 위약금을 피하게 된 감동 스토리.' },
  { id: 37, category: 'transfer', titleSample: '리스 원부 조회부터 승계 동의서까지, 전화 한 통에 퍼플오토가 다 해줬어요', topic: '생업이 바빠 캐피탈사와 실랑이할 시간이 없는 고객을 위해 모든 행정 절차를 대행해 준 편리함 강조.' }
];

/** 선택 가능한 전체 주제 (sell 우선 표시) — 어드민 주제 목록·getTopicById 가 사용 */
var REVIEW_TOPICS = SELL_TOPICS.concat(GENERAL_TOPICS);

var REVIEW_TONES = [
  { id: 'early_30s', name: '30대 초반 직장인', charMin: 1500, charMax: 2000 },
  { id: 'mid_30s', name: '30대 중후반', charMin: 1500, charMax: 2000 },
  { id: 'early_40s', name: '40대 자영업자', charMin: 1500, charMax: 2000 },
  { id: 'corp_manager', name: '법인 담당자', charMin: 1500, charMax: 2000 },
  { id: 'first_car', name: '첫 차량 고객', charMin: 1500, charMax: 2000 },
  { id: 'honest_review', name: '솔직 비교형', charMin: 1500, charMax: 2000 }
];

var TONE_PROMPTS = {
  early_30s: '30대 초반 직장인 고객 시점. 말투는 간결하고 실용적인 존댓말(~습니다, ~였습니다, ~해 주셨습니다). 가성비·시간·상담 친절함을 중심으로.',
  mid_30s: '30대 중후반 고객 시점. 경험담 톤이지만 반드시 존댓말(~습니다, ~더군요, ~인 것 같습니다). 여러 번 차량을 바꿔본 사람의 비교·신뢰 중심.',
  early_40s: '40대 자영업자 시점. 실용적이고 담백한 존댓말(~습니다, ~더라고요, ~해 주셨습니다). 비용·시간·사업 운영 관점.',
  corp_manager: '법인 차량 담당자 시점. 격식 있는 존댓말(~습니다, ~하였습니다, ~드립니다). 예산·서류·일정·리스크 관리 중심.',
  first_car: '첫 차량 구매/리스 고객 시점. 처음이라 긴장·궁금했던 점과 상담으로 안심한 과정. 정중한 존댓말(~습니다, ~해 주셔서 감사했습니다)로 작성.',
  honest_review: '여러 업체 비교 후 퍼플오토를 선택한 솔직 후기. "솔직히", "다른 곳과 비교하면" 등 사용. 말투는 존댓말(~습니다)만 사용.'
};

function getTopicById(id) {
  for (var i = 0; i < REVIEW_TOPICS.length; i++) {
    if (REVIEW_TOPICS[i].id === id) return REVIEW_TOPICS[i];
  }
  return null;
}

function pickTopic(recentTopicIds, seed, forcedTopicId) {
  if (forcedTopicId) {
    var forced = getTopicById(forcedTopicId);
    if (forced) return forced;
  }
  var recent = {};
  (recentTopicIds || []).forEach(function (id) { recent[id] = true; });
  var pool = REVIEW_TOPICS.filter(function (t) { return !recent[t.id]; });
  if (!pool.length) pool = REVIEW_TOPICS.slice();
  var idx = Math.abs(seed || Date.now()) % pool.length;
  return pool[idx];
}

function pickTone(recentToneIds, seed) {
  var recent = {};
  (recentToneIds || []).forEach(function (id) { recent[id] = true; });
  var pool = REVIEW_TONES.filter(function (t) { return !recent[t.id]; });
  if (!pool.length) pool = REVIEW_TONES.slice();
  var idx = Math.abs((seed || 0) + 7) % pool.length;
  return pool[idx];
}

/**
 * 8:2 비중 유지 — 최근 (window)건 안에 일반 주제가 있으면 sell, 없으면 일반.
 * ratio 0.8 → window 4 → 5건 중 1건만 일반 주제.
 * @param {string[]} recentCategories 최근 AI 후기 category (최신순)
 */
function decideReviewMode(recentCategories, sellRatio) {
  var r = typeof sellRatio === 'number' && !isNaN(sellRatio) ? sellRatio : 0.8;
  if (r >= 1) return 'sell';
  if (r <= 0) return 'general';
  var windowSize = Math.max(1, Math.round(1 / (1 - r)) - 1);
  var recent = (recentCategories || []).slice(0, windowSize);
  for (var i = 0; i < recent.length; i++) {
    if (recent[i] !== 'sell') return 'sell';
  }
  return recent.length ? 'general' : 'sell';
}

/**
 * 가장 오래 안 쓴 키워드 선택 (한 번도 안 쓴 키워드 우선, 목록 순서 = 렌트/리스 교대)
 * @param {string[]} recentKeywords 최근 main_keyword (최신순)
 * @param {string[]|null} allowedIntents
 */
function pickSellKeyword(recentKeywords, allowedIntents) {
  var list = SELL_KEYWORDS.filter(function (k) {
    return !allowedIntents || allowedIntents.indexOf(k.intent) >= 0;
  });
  if (!list.length) list = SELL_KEYWORDS.slice();
  var recent = recentKeywords || [];
  var best = null;
  var bestScore = -2;
  for (var i = 0; i < list.length; i++) {
    var pos = recent.indexOf(list[i].keyword);
    var score = pos < 0 ? Number.MAX_SAFE_INTEGER : pos;
    if (score > bestScore) {
      best = list[i];
      bestScore = score;
    }
  }
  return best;
}

function pickSubKeywords(mainKw, topic) {
  var intents = (topic && topic.intents) || [];
  var subs = SELL_KEYWORDS.filter(function (k) {
    return k.car === mainKw.car && k.keyword !== mainKw.keyword && intents.indexOf(k.intent) >= 0;
  }).map(function (k) { return k.keyword; });
  if (!subs.length) {
    var generic = CAR_TYPE_LABELS[mainKw.car] + ' 판매';
    if (generic !== mainKw.keyword) subs.push(generic);
  }
  return subs.slice(0, 2);
}

/**
 * 생성 1건의 주제·키워드 결정
 * @param {object} opts
 * @param {number[]} opts.recentTopicIds
 * @param {string[]} opts.recentCategories
 * @param {string[]} opts.recentKeywords
 * @param {number} opts.seed
 * @param {number|null} opts.forcedTopicId
 * @param {number} opts.sellRatio
 * @returns {{mode:string,topic:object,keyword:object|null,subKeywords:string[]}}
 */
function pickReviewPlan(opts) {
  opts = opts || {};
  var seed = Math.abs(opts.seed || Date.now());
  var recentIds = {};
  (opts.recentTopicIds || []).forEach(function (id) { recentIds[id] = true; });

  var topic = null;
  var keyword = null;
  var mode = null;

  if (opts.forcedTopicId) {
    topic = getTopicById(opts.forcedTopicId);
    if (topic) mode = topic.category === 'sell' ? 'sell' : 'general';
  }

  if (!topic) {
    mode = decideReviewMode(opts.recentCategories, opts.sellRatio);
    if (mode === 'sell') {
      keyword = pickSellKeyword(opts.recentKeywords, null);
      var matching = SELL_TOPICS.filter(function (t) { return t.intents.indexOf(keyword.intent) >= 0; });
      var fresh = matching.filter(function (t) { return !recentIds[t.id]; });
      var pool = fresh.length ? fresh : (matching.length ? matching : SELL_TOPICS);
      topic = pool[seed % pool.length];
    } else {
      var gPool = GENERAL_TOPICS.filter(function (t) { return !recentIds[t.id]; });
      if (!gPool.length) gPool = GENERAL_TOPICS.slice();
      topic = gPool[seed % gPool.length];
    }
  }

  if (mode === 'sell' && !keyword) {
    keyword = pickSellKeyword(opts.recentKeywords, topic.intents || null);
  }

  return {
    mode: mode,
    topic: topic,
    keyword: keyword,
    subKeywords: keyword ? pickSubKeywords(keyword, topic) : []
  };
}

var PurpleReviewTopicsExport = {
  BRAND_NAME: BRAND_NAME,
  BRAND_PHONE: BRAND_PHONE,
  CATEGORY_LABELS: CATEGORY_LABELS,
  REVIEW_TOPICS: REVIEW_TOPICS,
  SELL_TOPICS: SELL_TOPICS,
  GENERAL_TOPICS: GENERAL_TOPICS,
  RETIRED_TOPICS: RETIRED_TOPICS,
  SELL_KEYWORDS: SELL_KEYWORDS,
  SELL_BUSINESS_FACTS: SELL_BUSINESS_FACTS,
  CAR_TYPE_LABELS: CAR_TYPE_LABELS,
  REVIEW_TONES: REVIEW_TONES,
  TONE_PROMPTS: TONE_PROMPTS,
  getTopicById: getTopicById,
  pickTopic: pickTopic,
  pickTone: pickTone,
  decideReviewMode: decideReviewMode,
  pickSellKeyword: pickSellKeyword,
  pickReviewPlan: pickReviewPlan
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PurpleReviewTopicsExport;
}
if (typeof window !== 'undefined') {
  window.PurpleReviewTopics = PurpleReviewTopicsExport;
}

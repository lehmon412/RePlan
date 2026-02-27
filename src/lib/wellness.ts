import type { TimeBlock, DailyPlan } from '@/types/profile';

// ===== 웰니스 팁 카테고리 =====

type TipCategory = 'hydration' | 'diet' | 'exercise' | 'mental' | 'sleep' | 'posture' | 'eye';

interface WellnessTip {
  text: string;
  icon: string;
  category: TipCategory;
}

// ===== 블록 타입별 팁 데이터 =====

const WAKE_TIPS: WellnessTip[] = [
  { text: '일어나서 물 한 잔! 밤새 탈수된 몸에 수분을 채워주세요', icon: '💧', category: 'hydration' },
  { text: '기상 후 5분 스트레칭으로 몸을 깨워보세요', icon: '🧘', category: 'exercise' },
  { text: '커튼을 열어 햇빛을 받으면 세로토닌 분비에 도움이 돼요', icon: '☀️', category: 'mental' },
  { text: '아침에 심호흡 3회로 하루를 차분하게 시작해보세요', icon: '🌬️', category: 'mental' },
  { text: '기상 직후 가벼운 산책은 수면 리듬을 안정시켜줘요', icon: '🚶', category: 'sleep' },
];

const BREAKFAST_TIPS: WellnessTip[] = [
  { text: '단백질 위주 아침이 오전 집중력을 높여줘요 (계란, 그릭요거트)', icon: '🥚', category: 'diet' },
  { text: '바나나 + 견과류 조합은 빠르고 영양 가득한 아침이에요', icon: '🍌', category: 'diet' },
  { text: '아침에 과일 한 조각으로 비타민을 챙겨보세요', icon: '🍎', category: 'diet' },
  { text: '오트밀에 꿀과 베리를 얹으면 건강한 탄수화물 충전!', icon: '🥣', category: 'diet' },
  { text: '아침 식사와 함께 물 한 잔으로 소화를 도와주세요', icon: '💧', category: 'hydration' },
];

const LUNCH_TIPS: WellnessTip[] = [
  { text: '오후 졸림 방지: 탄수화물은 적당히, 채소와 단백질 위주로', icon: '🥗', category: 'diet' },
  { text: '점심 후 10분 산책이 소화와 오후 집중력에 좋아요', icon: '🚶', category: 'exercise' },
  { text: '천천히 씹어 먹으면 포만감도 높고 소화에도 좋아요', icon: '🍽️', category: 'diet' },
  { text: '점심에 식이섬유가 풍부한 채소를 챙겨드세요', icon: '🥦', category: 'diet' },
  { text: '식후 커피보다 녹차가 카페인 과다를 줄여줘요', icon: '🍵', category: 'diet' },
];

const DINNER_TIPS: WellnessTip[] = [
  { text: '취침 3시간 전 마지막 식사가 수면의 질을 높여줘요', icon: '🌙', category: 'sleep' },
  { text: '저녁은 가볍게! 과식은 수면을 방해할 수 있어요', icon: '🍽️', category: 'diet' },
  { text: '마그네슘이 풍부한 음식(시금치, 아몬드)은 수면에 도움돼요', icon: '🥬', category: 'diet' },
  { text: '저녁에 따뜻한 수프 한 그릇은 몸과 마음을 편안하게 해요', icon: '🍲', category: 'diet' },
  { text: '식후 가벼운 산책으로 소화를 도와주세요', icon: '🚶', category: 'exercise' },
];

const WORK_MORNING_TIPS: WellnessTip[] = [
  { text: '90분마다 5분 스트레칭으로 집중력을 리셋하세요!', icon: '🧘', category: 'posture' },
  { text: '중요한 일은 오전에! 집중력이 가장 높은 시간대예요', icon: '🎯', category: 'mental' },
  { text: '작업 시작 전 할 일 목록을 정리하면 효율이 올라가요', icon: '📋', category: 'mental' },
  { text: '물 한 잔 마시면서 시작! 수분은 두뇌 활동에 필수예요', icon: '💧', category: 'hydration' },
  { text: '의자에 앉을 때 허리를 곧게 세우면 피로가 줄어요', icon: '🪑', category: 'posture' },
];

const WORK_AFTERNOON_TIPS: WellnessTip[] = [
  { text: '눈 피로 해소: 20-20-20 규칙 (20분마다 20초간 먼 곳 보기)', icon: '👁️', category: 'eye' },
  { text: '오후 슬럼프? 가벼운 스트레칭이나 짧은 산책이 도움돼요', icon: '🚶', category: 'exercise' },
  { text: '카페인은 오후 2시 이후 줄이면 수면에 도움이 돼요', icon: '☕', category: 'sleep' },
  { text: '자세를 바꿔보세요. 서서 일하기도 좋은 방법이에요', icon: '🧍', category: 'posture' },
  { text: '간식으로 견과류나 과일을 추천해요 (혈당 안정)', icon: '🥜', category: 'diet' },
];

const EXERCISE_TIPS: WellnessTip[] = [
  { text: '운동 30분 전 가벼운 간식과 수분 섭취를 추천해요', icon: '💧', category: 'hydration' },
  { text: '워밍업 5분은 부상 방지의 핵심이에요!', icon: '🔥', category: 'exercise' },
  { text: '운동 후 30분 내 단백질 섭취가 근육 회복에 좋아요', icon: '🥛', category: 'diet' },
  { text: '무리하지 말고 자기 페이스에 맞춰 운동하세요', icon: '💪', category: 'exercise' },
  { text: '쿨다운 스트레칭으로 근육 피로를 줄여보세요', icon: '🧘', category: 'exercise' },
];

const BREAK_TIPS: WellnessTip[] = [
  { text: '잠깐 눈을 감고 심호흡 3회로 리프레시하세요', icon: '🌬️', category: 'mental' },
  { text: '휴식 시간에 물 한 잔! 하루 8잔 목표를 향해', icon: '💧', category: 'hydration' },
  { text: '목과 어깨를 돌려주면 긴장이 풀려요', icon: '🔄', category: 'posture' },
  { text: '잠깐 창밖을 바라보면 눈의 피로가 줄어들어요', icon: '🌳', category: 'eye' },
  { text: '좋아하는 음악 한 곡 들으며 기분 전환해보세요', icon: '🎵', category: 'mental' },
];

const FREE_TIME_TIPS: WellnessTip[] = [
  { text: '블루라이트 줄이기: 취침 1시간 전부터 화면 밝기를 낮춰보세요', icon: '📱', category: 'sleep' },
  { text: '자기 전 가벼운 독서는 수면 유도에 효과적이에요', icon: '📖', category: 'sleep' },
  { text: '따뜻한 차 한 잔으로 하루를 마무리해보세요', icon: '🍵', category: 'mental' },
  { text: '오늘 감사했던 일 3가지를 떠올려보세요', icon: '🙏', category: 'mental' },
  { text: '가벼운 폼롤링이나 스트레칭으로 하루의 피로를 풀어주세요', icon: '🧘', category: 'exercise' },
];

const SLEEP_TIPS: WellnessTip[] = [
  { text: '오늘도 수고했어요! 가벼운 호흡 명상으로 하루를 마무리해보세요', icon: '🧘', category: 'mental' },
  { text: '방 온도를 18-20도로 맞추면 깊은 수면에 도움돼요', icon: '🌡️', category: 'sleep' },
  { text: '잠들기 전 내일 할 일을 적어두면 마음이 편안해져요', icon: '📝', category: 'mental' },
  { text: '같은 시간에 자고 일어나는 습관이 수면 건강의 핵심이에요', icon: '⏰', category: 'sleep' },
  { text: '발을 따뜻하게 하면 잠이 더 잘 와요 (수면 양말 추천!)', icon: '🧦', category: 'sleep' },
];

const COMMUTE_TIPS: WellnessTip[] = [
  { text: '출퇴근길 팟캐스트/오디오북으로 자기계발 시간을 만들어보세요', icon: '🎧', category: 'mental' },
  { text: '대중교통에서 한 정거장 먼저 내려 걷기 운동을 해보세요', icon: '🚶', category: 'exercise' },
  { text: '출근길 물 한 병 챙기면 하루 수분 섭취에 도움돼요', icon: '💧', category: 'hydration' },
];

// ===== 컨디션별 종합 팁 =====

const CONDITION_TIPS: Record<DailyPlan['condition'], WellnessTip[]> = {
  good: [
    { text: '컨디션이 좋은 날! 도전적인 일에 집중해보세요', icon: '🚀', category: 'mental' },
    { text: '에너지가 넘치는 날에는 운동 강도를 살짝 올려봐도 좋아요', icon: '💪', category: 'exercise' },
    { text: '좋은 기운을 유지하려면 수분 섭취를 잊지 마세요', icon: '💧', category: 'hydration' },
  ],
  normal: [
    { text: '꾸준함이 힘이에요. 오늘도 계획대로 차근차근!', icon: '📋', category: 'mental' },
    { text: '적절한 휴식이 생산성의 비결이에요', icon: '⚖️', category: 'mental' },
    { text: '충분한 수분과 균형 잡힌 식사로 컨디션을 유지하세요', icon: '🍽️', category: 'diet' },
  ],
  bad: [
    { text: '무리하지 마세요. 핵심 일만 하고 일찍 쉬는 것도 전략이에요', icon: '🛡️', category: 'mental' },
    { text: '컨디션이 안 좋을 땐 따뜻한 물과 가벼운 음식이 좋아요', icon: '🍵', category: 'diet' },
    { text: '오늘은 자기 자신에게 너그러워져도 괜찮아요', icon: '🤗', category: 'mental' },
  ],
};

// ===== 월경 관련 팁 =====

const MENSTRUAL_TIPS: Record<NonNullable<DailyPlan['menstrualCondition']>, WellnessTip[]> = {
  normal: [],
  pms: [
    { text: '마그네슘 풍부한 음식이 PMS 증상 완화에 도움돼요 (다크초콜릿, 바나나)', icon: '🍫', category: 'diet' },
    { text: 'PMS 기간에는 카페인과 짠 음식을 줄이면 좋아요', icon: '🧂', category: 'diet' },
    { text: '가벼운 요가나 스트레칭이 기분 개선에 효과적이에요', icon: '🧘', category: 'exercise' },
  ],
  period: [
    { text: '철분이 풍부한 음식을 챙겨드세요 (시금치, 살코기, 두부)', icon: '🥬', category: 'diet' },
    { text: '따뜻한 음료와 핫팩으로 몸을 따뜻하게 유지하세요', icon: '🫖', category: 'diet' },
    { text: '격한 운동 대신 가벼운 산책이나 스트레칭을 추천해요', icon: '🚶', category: 'exercise' },
  ],
  post: [
    { text: '생리 직후에는 철분 보충을 위해 영양 섭취에 신경 써주세요', icon: '🥩', category: 'diet' },
    { text: '체력이 회복되는 시기예요. 서서히 활동량을 늘려보세요', icon: '💪', category: 'exercise' },
  ],
};

// ===== 팁 선택 엔진 =====

/**
 * 날짜 기반으로 매일 다른 팁을 선택하는 해시 함수
 */
function getDailyIndex(tips: WellnessTip[], seed: string = ''): number {
  const today = new Date();
  const dayHash = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  // seed를 추가해서 같은 날이라도 블록마다 다른 팁이 나오도록
  let seedHash = 0;
  for (let i = 0; i < seed.length; i++) {
    seedHash = ((seedHash << 5) - seedHash) + seed.charCodeAt(i);
    seedHash |= 0;
  }
  return Math.abs((dayHash + seedHash) % tips.length);
}

function pickTip(tips: WellnessTip[], blockId: string): WellnessTip | null {
  if (tips.length === 0) return null;
  const index = getDailyIndex(tips, blockId);
  return tips[index];
}

/**
 * 시간 블록에 맞는 웰니스 팁을 반환
 */
export function getWellnessTip(
  block: TimeBlock,
): string | undefined {
  let tips: WellnessTip[];

  switch (block.blockType) {
    case 'sleep':
      tips = block.id === 'wake' ? WAKE_TIPS : SLEEP_TIPS;
      break;
    case 'meal':
      if (block.id === 'breakfast') tips = BREAKFAST_TIPS;
      else if (block.id === 'lunch') tips = LUNCH_TIPS;
      else tips = DINNER_TIPS;
      break;
    case 'work': {
      const hour = parseInt(block.startTime.split(':')[0]);
      tips = hour < 12 ? WORK_MORNING_TIPS : WORK_AFTERNOON_TIPS;
      break;
    }
    case 'exercise':
      tips = EXERCISE_TIPS;
      break;
    case 'break':
      tips = BREAK_TIPS;
      break;
    case 'commute':
      tips = COMMUTE_TIPS;
      break;
    case 'free':
      tips = FREE_TIME_TIPS;
      break;
    default:
      return undefined;
  }

  const tip = pickTip(tips, block.id);
  return tip ? `${tip.icon} ${tip.text}` : undefined;
}

/**
 * 오늘의 컨디션 + 월경 상태에 맞는 종합 웰니스 요약 반환
 */
export function getDailyWellnessSummary(
  condition: DailyPlan['condition'],
  menstrualCondition?: DailyPlan['menstrualCondition'],
): { conditionTip: string; menstrualTip?: string } {
  const conditionTips = CONDITION_TIPS[condition];
  const conditionTip = pickTip(conditionTips, 'daily-condition');

  let menstrualTip: string | undefined;
  if (menstrualCondition && menstrualCondition !== 'normal') {
    const mTips = MENSTRUAL_TIPS[menstrualCondition];
    const tip = pickTip(mTips, 'daily-menstrual');
    if (tip) {
      menstrualTip = `${tip.icon} ${tip.text}`;
    }
  }

  return {
    conditionTip: conditionTip ? `${conditionTip.icon} ${conditionTip.text}` : '',
    menstrualTip,
  };
}

/**
 * 모든 시간 블록에 웰니스 팁을 할당
 */
export function assignWellnessTips(
  blocks: TimeBlock[],
): TimeBlock[] {
  return blocks.map(block => ({
    ...block,
    wellnessTip: getWellnessTip(block),
  }));
}

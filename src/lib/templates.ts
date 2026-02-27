import type { UserProfile, TimeBlock, TodoItem } from '@/types/profile';
import { getTodayWeekday } from '@/types/profile';

// 시간 문자열을 분으로 변환
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// 분을 시간 문자열로 변환
export function minutesToTime(minutes: number): string {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440; // 24시간 내로 정규화
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// 시간 범위의 분 단위 길이 계산
export function getBlockDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) end += 1440; // 자정 넘어가는 경우
  return end - start;
}

// 빈 TodoItem 생성
export function createEmptyTodo(): TodoItem {
  return {
    id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: '',
    completed: false,
  };
}

// 빈 TimeBlock 생성
export function createEmptyTimeBlock(
  id: string,
  label: string,
  startTime: string,
  endTime: string,
  icon: string,
  isFixed: boolean,
  blockType: TimeBlock['blockType']
): TimeBlock {
  return {
    id,
    label,
    startTime,
    endTime,
    icon,
    isFixed,
    blockType,
    todos: isFixed ? [] : [createEmptyTodo()],
  };
}

interface BreakPoint {
  time: string;
  duration: number;
  label: string;
  icon: string;
  blockType: TimeBlock['blockType'];
}

// 시간 블록을 휴식/식사 시간 기준으로 분할
function splitWorkBlock(
  startTime: string,
  endTime: string,
  breakPoints: BreakPoint[],
  baseLabel: string,
  icon: string
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  
  // 블록 시간 내에 있는 breakPoint만 필터링 및 정렬
  const relevantBreaks = breakPoints
    .filter(bp => {
      const bpTime = timeToMinutes(bp.time);
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);
      return bpTime > start && bpTime < end;
    })
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  if (relevantBreaks.length === 0) {
    // 분할할 포인트가 없으면 하나의 블록
    blocks.push(createEmptyTimeBlock(
      `work-${startTime}`,
      baseLabel,
      startTime,
      endTime,
      icon,
      false,
      'work'
    ));
    return blocks;
  }

  let currentStart = startTime;
  let partNumber = 1;

  for (const bp of relevantBreaks) {
    // 휴식 전 업무 블록
    if (timeToMinutes(bp.time) > timeToMinutes(currentStart)) {
      blocks.push(createEmptyTimeBlock(
        `work-${currentStart}-${partNumber}`,
        `${baseLabel} ①②③④⑤⑥⑦⑧⑨⑩`.charAt(partNumber) ? `${baseLabel} ${'①②③④⑤⑥⑦⑧⑨⑩'[partNumber - 1]}` : `${baseLabel} ${partNumber}`,
        currentStart,
        bp.time,
        icon,
        false,
        'work'
      ));
      partNumber++;
    }

    // 휴식 블록
    const breakEnd = minutesToTime(timeToMinutes(bp.time) + bp.duration);
    blocks.push(createEmptyTimeBlock(
      `break-${bp.time}`,
      bp.label,
      bp.time,
      breakEnd,
      bp.icon,
      true,
      bp.blockType
    ));

    currentStart = breakEnd;
  }

  // 마지막 업무 블록
  if (timeToMinutes(currentStart) < timeToMinutes(endTime)) {
    blocks.push(createEmptyTimeBlock(
      `work-${currentStart}-${partNumber}`,
      `${baseLabel} ${'①②③④⑤⑥⑦⑧⑨⑩'[partNumber - 1] || partNumber}`,
      currentStart,
      endTime,
      icon,
      false,
      'work'
    ));
  }

  return blocks;
}

// 프로필 기반 시간 블록 생성
export function generateTimeBlocks(profile: UserProfile): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const today = getTodayWeekday();
  const isExerciseToday = profile.exercise.active && 
    (!profile.exercise.days || profile.exercise.days.length === 0 || profile.exercise.days.includes(today));

  // 휴식 포인트 수집
  const breakPoints: BreakPoint[] = [];
  
  // 오전 휴식
  if (profile.breaks?.morning?.enabled) {
    breakPoints.push({
      time: profile.breaks.morning.time,
      duration: profile.breaks.morning.duration,
      label: '오전 휴식',
      icon: '☕',
      blockType: 'break',
    });
  }

  // 오후 휴식
  if (profile.breaks?.afternoon?.enabled) {
    breakPoints.push({
      time: profile.breaks.afternoon.time,
      duration: profile.breaks.afternoon.duration,
      label: '오후 휴식',
      icon: '🍵',
      blockType: 'break',
    });
  }

  // 1. 기상
  blocks.push(createEmptyTimeBlock(
    'wake',
    '기상',
    profile.sleep.wakeTime,
    minutesToTime(timeToMinutes(profile.sleep.wakeTime) + 30),
    '🌅',
    true,
    'sleep'
  ));

  // 2. 아침 식사
  if (profile.meals.breakfast.enabled && profile.meals.breakfast.time) {
    blocks.push(createEmptyTimeBlock(
      'breakfast',
      '아침 식사',
      profile.meals.breakfast.time,
      minutesToTime(timeToMinutes(profile.meals.breakfast.time) + 30),
      '🍳',
      true,
      'meal'
    ));
  }

  // 3. 생활 유형별 일정
  const { lifestyle } = profile;

  if (lifestyle.type === 'office' || lifestyle.type === 'office_flex') {
    const { officeHours, commuteMinutes } = lifestyle;
    
    if (officeHours) {
      // 출근
      const commuteStart = minutesToTime(timeToMinutes(officeHours.start) - (commuteMinutes || 30));
      blocks.push(createEmptyTimeBlock(
        'commute_to',
        '출근',
        commuteStart,
        officeHours.start,
        '🚗',
        true,
        'commute'
      ));

      // 점심시간 기준으로 오전/오후 분할
      const lunchEnd = minutesToTime(timeToMinutes(officeHours.lunchTime) + 60);

      // 오전 업무 (휴식 포인트로 분할)
      const morningBlocks = splitWorkBlock(
        officeHours.start,
        officeHours.lunchTime,
        breakPoints,
        '오전 업무',
        '💼'
      );
      blocks.push(...morningBlocks);

      // 점심 식사
      blocks.push(createEmptyTimeBlock(
        'lunch',
        '점심 식사',
        officeHours.lunchTime,
        lunchEnd,
        '🍱',
        true,
        'meal'
      ));

      // 오후 업무 (휴식 포인트로 분할)
      const afternoonBlocks = splitWorkBlock(
        lunchEnd,
        officeHours.end,
        breakPoints,
        '오후 업무',
        '💼'
      );
      blocks.push(...afternoonBlocks);

      // 퇴근
      const commuteEnd = minutesToTime(timeToMinutes(officeHours.end) + (commuteMinutes || 30));
      blocks.push(createEmptyTimeBlock(
        'commute_from',
        '퇴근',
        officeHours.end,
        commuteEnd,
        '🚗',
        true,
        'commute'
      ));
    }
  } else if (lifestyle.type === 'shift') {
    const shiftHours = {
      day: { start: '06:00', end: '14:00' },
      afternoon: { start: '14:00', end: '22:00' },
      night: { start: '22:00', end: '06:00' },
      rotating: { start: '09:00', end: '18:00' },
    };
    
    const hours = shiftHours[lifestyle.shiftType || 'day'];
    
    // 교대 근무 (하나의 큰 블록)
    blocks.push(createEmptyTimeBlock(
      'shift_work',
      '근무',
      hours.start,
      hours.end,
      '🏭',
      false,
      'work'
    ));
  } else if (lifestyle.type === 'student') {
    const { classHours } = lifestyle;
    
    if (classHours) {
      // 오전 수업/공부
      const morningBlocks = splitWorkBlock(
        classHours.start,
        '12:00',
        breakPoints,
        '오전 수업',
        '📚'
      );
      blocks.push(...morningBlocks);

      // 점심
      if (profile.meals.lunch.enabled) {
        blocks.push(createEmptyTimeBlock(
          'lunch',
          '점심 식사',
          profile.meals.lunch.time || '12:00',
          minutesToTime(timeToMinutes(profile.meals.lunch.time || '12:00') + 60),
          '🍱',
          true,
          'meal'
        ));
      }

      // 오후 수업/공부
      const afternoonBlocks = splitWorkBlock(
        '13:00',
        classHours.end,
        breakPoints,
        '오후 수업',
        '📚'
      );
      blocks.push(...afternoonBlocks);

      // 자습 시간
      blocks.push(createEmptyTimeBlock(
        'self_study',
        '자습/과제',
        classHours.end,
        minutesToTime(timeToMinutes(classHours.end) + 120),
        '✍️',
        false,
        'work'
      ));
    }
  } else if (lifestyle.type === 'freelancer') {
    const periods = lifestyle.preferredWorkHours || ['morning', 'afternoon'];
    
    if (periods.includes('morning')) {
      const morningBlocks = splitWorkBlock('09:00', '12:00', breakPoints, '오전 작업', '💻');
      blocks.push(...morningBlocks);
    }

    if (profile.meals.lunch.enabled) {
      blocks.push(createEmptyTimeBlock(
        'lunch',
        '점심 식사',
        profile.meals.lunch.time || '12:00',
        minutesToTime(timeToMinutes(profile.meals.lunch.time || '12:00') + 60),
        '🍱',
        true,
        'meal'
      ));
    }

    if (periods.includes('afternoon')) {
      const afternoonBlocks = splitWorkBlock('13:00', '18:00', breakPoints, '오후 작업', '💻');
      blocks.push(...afternoonBlocks);
    }

    if (periods.includes('evening')) {
      blocks.push(createEmptyTimeBlock(
        'work_evening',
        '저녁 작업',
        '19:00',
        '23:00',
        '🌙',
        false,
        'work'
      ));
    }

    if (periods.includes('night')) {
      blocks.push(createEmptyTimeBlock(
        'work_night',
        '심야 작업',
        '23:00',
        '03:00',
        '🦉',
        false,
        'work'
      ));
    }
  } else {
    // 기타
    blocks.push(createEmptyTimeBlock(
      'morning_activity',
      '오전 활동',
      '09:00',
      '12:00',
      '☀️',
      false,
      'work'
    ));

    if (profile.meals.lunch.enabled) {
      blocks.push(createEmptyTimeBlock(
        'lunch',
        '점심 식사',
        profile.meals.lunch.time || '12:00',
        minutesToTime(timeToMinutes(profile.meals.lunch.time || '12:00') + 60),
        '🍱',
        true,
        'meal'
      ));
    }

    blocks.push(createEmptyTimeBlock(
      'afternoon_activity',
      '오후 활동',
      '13:00',
      '18:00',
      '🌤️',
      false,
      'work'
    ));
  }

  // 4. 운동 (오늘이 운동 날인 경우)
  if (isExerciseToday && profile.exercise.time) {
    const exerciseEnd = minutesToTime(
      timeToMinutes(profile.exercise.time) + (profile.exercise.duration || 60)
    );
    const exerciseBlock = createEmptyTimeBlock(
      'exercise',
      '운동',
      profile.exercise.time,
      exerciseEnd,
      '🏋️',
      false, // 운동 세부 계획 입력 가능
      'exercise'
    );
    // 운동 종류 선택을 위한 초기값
    if (profile.exercise.types && profile.exercise.types.length > 0) {
      exerciseBlock.exerciseType = profile.exercise.types[0];
    }
    blocks.push(exerciseBlock);
  }

  // 5. 저녁 식사
  if (profile.meals.dinner.enabled && profile.meals.dinner.time) {
    blocks.push(createEmptyTimeBlock(
      'dinner',
      '저녁 식사',
      profile.meals.dinner.time,
      minutesToTime(timeToMinutes(profile.meals.dinner.time) + 60),
      '🍽️',
      true,
      'meal'
    ));
  }

  // 6. 자유시간
  const dinnerEnd = profile.meals.dinner.time 
    ? minutesToTime(timeToMinutes(profile.meals.dinner.time) + 60) 
    : '20:00';
  
  blocks.push(createEmptyTimeBlock(
    'evening_free',
    '자유시간',
    dinnerEnd,
    profile.sleep.bedTime,
    '🌙',
    false,
    'free'
  ));

  // 7. 취침
  blocks.push(createEmptyTimeBlock(
    'sleep',
    '취침',
    profile.sleep.bedTime,
    minutesToTime(timeToMinutes(profile.sleep.bedTime) + 30),
    '😴',
    true,
    'sleep'
  ));

  // 시간순 정렬
  blocks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  return blocks;
}

// 시간 블록의 총 가용 시간 계산 (분)
export function getBlockAvailableMinutes(block: TimeBlock): number {
  return getBlockDuration(block.startTime, block.endTime);
}

// 할 일들의 총 예상 시간 계산 (분)
export function getTotalTodoDuration(todos: TodoItem[]): number {
  return todos.reduce((sum, todo) => sum + (todo.duration || 0), 0);
}

// 시간 초과 여부 확인
export function isTimeOverflow(block: TimeBlock): boolean {
  const available = getBlockAvailableMinutes(block);
  const used = getTotalTodoDuration(block.todos);
  return used > available;
}

export const CONDITION_OPTIONS = [
  { value: 'good', label: '좋음 😊' },
  { value: 'normal', label: '보통 😐' },
  { value: 'bad', label: '안좋음 😔' },
] as const;

export const MENSTRUAL_OPTIONS = [
  { value: 'normal', label: '평소와 같음' },
  { value: 'pms', label: 'PMS 기간' },
  { value: 'period', label: '생리 중' },
  { value: 'post', label: '생리 직후' },
] as const;

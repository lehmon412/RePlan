// 생활 유형
export type LifestyleType = 'office' | 'office_flex' | 'shift' | 'student' | 'freelancer' | 'other';
export type ShiftType = 'day' | 'afternoon' | 'night' | 'rotating';
export type WorkHourPeriod = 'morning' | 'afternoon' | 'evening' | 'night';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type ExerciseFrequency = 'daily' | 'weekdays' | '3times' | '2times' | 'once' | 'none';
export type WeeklyExerciseCount = 1 | 2 | 3 | 4 | 5;
export type Priority = 'high' | 'medium' | 'low';

// 할 일 항목
export interface TodoItem {
  id: string;
  text: string;
  duration?: number; // 예상 소요 시간 (분)
  priority?: Priority;
  completed?: boolean;
}

// 시간 블록
export interface TimeBlock {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  icon: string;
  isFixed: boolean; // 고정 일정 여부
  blockType: 'work' | 'meal' | 'break' | 'commute' | 'exercise' | 'sleep' | 'free';
  todos: TodoItem[];
  // 운동 블록 전용
  exerciseType?: string;
  exercisePlan?: string;
  // 웰니스 팁
  wellnessTip?: string;
}

// 일일 계획
export interface DailyPlan {
  date: string;
  condition: 'good' | 'normal' | 'bad';
  menstrualCondition?: 'normal' | 'pms' | 'period' | 'post';
  timeBlocks: TimeBlock[];
  todayExerciseType?: string;
  notes: string;
}

export interface UserProfile {
  // 기본 정보
  gender: 'male' | 'female' | 'other';
  trackMenstrual?: boolean;

  // 생활 유형
  lifestyle: {
    type: LifestyleType;

    // 회사원 (정규직/유연근무)
    officeHours?: {
      start: string;
      end: string;
      lunchTime: string;
    };
    commuteMinutes?: number;

    // 3교대
    shiftType?: ShiftType;

    // 학생
    classHours?: {
      start: string;
      end: string;
    };
    freeDays?: Weekday[];

    // 프리랜서
    preferredWorkHours?: WorkHourPeriod[];
  };

  // 수면
  sleep: {
    wakeTime: string;
    bedTime: string;
    weekendDifferent?: boolean;
    weekendWakeTime?: string;
    weekendBedTime?: string;
  };

  // 식사
  meals: {
    breakfast: { enabled: boolean; time?: string };
    lunch: { enabled: boolean; time?: string };
    dinner: { enabled: boolean; time?: string };
  };

  // 운동 (확장)
  exercise: {
    active: boolean;
    weeklyCount?: WeeklyExerciseCount; // 주간 횟수
    days?: Weekday[]; // 운동 요일
    time?: string;
    duration?: number; // 분 단위
    types?: string[]; // 복수 운동 종류
  };

  // 휴식 설정
  breaks?: {
    morning?: { enabled: boolean; time: string; duration: number };
    afternoon?: { enabled: boolean; time: string; duration: number };
  };

  // 기타 루틴
  routines?: {
    caffeine?: { enabled: boolean; time?: string };
    nap?: { enabled: boolean; time?: string; duration?: number };
    meditation?: { enabled: boolean; time?: string; duration?: number };
  };
}

// 기존 PlanInput (호환성 유지)
export interface PlanInput {
  slots: {
    id: string;
    label: string;
    time?: string;
    duration?: number;
    icon?: string;
    isFixed?: boolean;
    value: string;
  }[];
  condition: 'good' | 'normal' | 'bad';
  menstrualCondition?: 'normal' | 'pms' | 'period' | 'post';
  notes: string;
}

// 옵션 상수들
export const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
] as const;

export const LIFESTYLE_OPTIONS = [
  { value: 'office', label: '회사원 (정규직)', description: '9-6 등 고정 근무' },
  { value: 'office_flex', label: '회사원 (유연근무)', description: '재택/유연 출퇴근' },
  { value: 'shift', label: '교대 근무자', description: '3교대, 2교대 등' },
  { value: 'student', label: '학생', description: '대학생/고등학생' },
  { value: 'freelancer', label: '프리랜서/자영업', description: '자유로운 시간 관리' },
  { value: 'other', label: '기타', description: '주부/무직 등' },
] as const;

export const SHIFT_OPTIONS = [
  { value: 'day', label: '주간 (06-14시)', hours: { start: '06:00', end: '14:00' } },
  { value: 'afternoon', label: '오후 (14-22시)', hours: { start: '14:00', end: '22:00' } },
  { value: 'night', label: '야간 (22-06시)', hours: { start: '22:00', end: '06:00' } },
  { value: 'rotating', label: '매주 다름 (당일 선택)' },
] as const;

export const WORK_HOUR_PERIOD_OPTIONS = [
  { value: 'morning', label: '오전 (6-12시)' },
  { value: 'afternoon', label: '오후 (12-18시)' },
  { value: 'evening', label: '저녁 (18-24시)' },
  { value: 'night', label: '심야 (0-6시)' },
] as const;

export const WEEKDAY_OPTIONS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
] as const;

export const WEEKLY_EXERCISE_COUNT_OPTIONS = [
  { value: 1, label: '주 1회' },
  { value: 2, label: '주 2회' },
  { value: 3, label: '주 3회' },
  { value: 4, label: '주 4회' },
  { value: 5, label: '주 5회+' },
] as const;

export const EXERCISE_TYPE_OPTIONS = [
  { value: 'gym', label: '헬스/웨이트' },
  { value: 'running', label: '러닝/조깅' },
  { value: 'home', label: '홈트레이닝' },
  { value: 'yoga', label: '요가/필라테스' },
  { value: 'swimming', label: '수영' },
  { value: 'cycling', label: '자전거' },
  { value: 'sports', label: '구기 종목' },
  { value: 'hiking', label: '등산' },
  { value: 'crossfit', label: '크로스핏' },
  { value: 'other', label: '기타' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'high', label: '🔴 긴급', color: '#ef4444' },
  { value: 'medium', label: '🟡 중요', color: '#eab308' },
  { value: 'low', label: '🟢 보통', color: '#22c55e' },
] as const;

export const DURATION_OPTIONS = [
  { value: 15, label: '15분' },
  { value: 30, label: '30분' },
  { value: 45, label: '45분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
] as const;

export const TODO_DURATION_OPTIONS = [
  { value: 10, label: '10분' },
  { value: 15, label: '15분' },
  { value: 20, label: '20분' },
  { value: 30, label: '30분' },
  { value: 45, label: '45분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
] as const;

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const time = `${hour.toString().padStart(2, '0')}:${minute}`;
  return { value: time, label: time };
});

export const COMMUTE_OPTIONS = [
  { value: 10, label: '10분' },
  { value: 20, label: '20분' },
  { value: 30, label: '30분' },
  { value: 45, label: '45분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간 이상' },
] as const;

// 요일 체크 헬퍼
export function getTodayWeekday(): Weekday {
  const days: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
}

export function isExerciseDay(profile: UserProfile): boolean {
  if (!profile.exercise.active) return false;
  if (!profile.exercise.days || profile.exercise.days.length === 0) return true;
  return profile.exercise.days.includes(getTodayWeekday());
}

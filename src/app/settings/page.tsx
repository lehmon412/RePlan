'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/hooks/useProfile';
import {
  RadioOption,
  CheckboxOption,
} from '@/components/OnboardingStep';
import {
  TimePicker,
  CommuteDurationPicker,
  MealTimeInput,
} from '@/components/FormInputs';
import {
  UserProfile,
  LifestyleType,
  Weekday,
  GENDER_OPTIONS,
  LIFESTYLE_OPTIONS,
  WEEKDAY_OPTIONS,
  WEEKLY_EXERCISE_COUNT_OPTIONS,
  EXERCISE_TYPE_OPTIONS,
  WeeklyExerciseCount,
} from '@/types/profile';

export default function SettingsPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { profile, isLoading, saveProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // 폼 상태
  const [gender, setGender] = useState<UserProfile['gender'] | ''>('');
  const [trackMenstrual, setTrackMenstrual] = useState(false);
  const [lifestyleType, setLifestyleType] = useState<LifestyleType | ''>('');
  const [officeStart, setOfficeStart] = useState('09:00');
  const [officeEnd, setOfficeEnd] = useState('18:00');
  const [lunchTime, setLunchTime] = useState('12:00');
  const [commuteMinutes, setCommuteMinutes] = useState(30);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [bedTime, setBedTime] = useState('23:00');
  const [breakfastEnabled, setBreakfastEnabled] = useState(true);
  const [breakfastTime, setBreakfastTime] = useState('08:00');
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [dinnerEnabled, setDinnerEnabled] = useState(true);
  const [dinnerTime, setDinnerTime] = useState('19:00');
  const [exerciseActive, setExerciseActive] = useState(false);
  const [weeklyCount, setWeeklyCount] = useState<WeeklyExerciseCount>(3);
  const [exerciseDays, setExerciseDays] = useState<Weekday[]>([]);
  const [exerciseTime, setExerciseTime] = useState('18:00');
  const [exerciseDuration, setExerciseDuration] = useState(60);
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);

  // 로그인 체크
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  // 기존 프로필 데이터로 폼 초기화
  useEffect(() => {
    if (profile) {
      setGender(profile.gender || '');
      setTrackMenstrual(profile.trackMenstrual || false);
      setLifestyleType(profile.lifestyle?.type || '');
      setOfficeStart(profile.lifestyle?.officeHours?.start || '09:00');
      setOfficeEnd(profile.lifestyle?.officeHours?.end || '18:00');
      setLunchTime(profile.lifestyle?.officeHours?.lunchTime || '12:00');
      setCommuteMinutes(profile.lifestyle?.commuteMinutes || 30);
      setWakeTime(profile.sleep?.wakeTime || '07:00');
      setBedTime(profile.sleep?.bedTime || '23:00');
      setBreakfastEnabled(profile.meals?.breakfast?.enabled ?? true);
      setBreakfastTime(profile.meals?.breakfast?.time || '08:00');
      setLunchEnabled(profile.meals?.lunch?.enabled ?? true);
      setDinnerEnabled(profile.meals?.dinner?.enabled ?? true);
      setDinnerTime(profile.meals?.dinner?.time || '19:00');
      setExerciseActive(profile.exercise?.active || false);
      setWeeklyCount(profile.exercise?.weeklyCount || 3);
      setExerciseDays(profile.exercise?.days || []);
      setExerciseTime(profile.exercise?.time || '18:00');
      setExerciseDuration(profile.exercise?.duration || 60);
      setExerciseTypes(profile.exercise?.types || []);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    
    const updatedProfile: UserProfile = {
      gender: gender as UserProfile['gender'],
      trackMenstrual: gender === 'female' ? trackMenstrual : undefined,
      lifestyle: {
        type: lifestyleType as LifestyleType,
        ...(lifestyleType === 'office' || lifestyleType === 'office_flex' ? {
          officeHours: { start: officeStart, end: officeEnd, lunchTime },
          commuteMinutes,
        } : {}),
      },
      sleep: {
        wakeTime,
        bedTime,
      },
      meals: {
        breakfast: { enabled: breakfastEnabled, time: breakfastTime },
        lunch: { enabled: lunchEnabled, time: lunchTime },
        dinner: { enabled: dinnerEnabled, time: dinnerTime },
      },
      exercise: {
        active: exerciseActive,
        weeklyCount: exerciseActive ? weeklyCount : undefined,
        days: exerciseActive ? exerciseDays : undefined,
        time: exerciseActive ? exerciseTime : undefined,
        duration: exerciseActive ? exerciseDuration : undefined,
        types: exerciseActive ? exerciseTypes : undefined,
      },
    };

    const success = await saveProfile(updatedProfile);
    setIsSaving(false);
    
    if (success) {
      router.push('/');
    } else {
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => router.push('/')}
          className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
        >
          ← 
        </button>
        <h1 className="text-xl font-bold">프로필 설정</h1>
      </div>

      {/* 기본 정보 */}
      <section className="card">
        <button
          onClick={() => toggleSection('basic')}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold">👤 기본 정보</h2>
          <span className="text-[var(--muted)]">{activeSection === 'basic' ? '▲' : '▼'}</span>
        </button>
        
        {activeSection === 'basic' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">성별</label>
              <div className="grid grid-cols-3 gap-2">
                {GENDER_OPTIONS.map((option) => (
                  <RadioOption
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    selected={gender === option.value}
                    onSelect={(v) => setGender(v as UserProfile['gender'])}
                  />
                ))}
              </div>
            </div>

            {gender === 'female' && (
              <div>
                <label className="label">생리 주기 추적</label>
                <div className="flex gap-2">
                  {[{ label: '예', value: true }, { label: '아니오', value: false }].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setTrackMenstrual(opt.value)}
                      className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                        trackMenstrual === opt.value
                          ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 생활 패턴 */}
      <section className="card">
        <button
          onClick={() => toggleSection('lifestyle')}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold">💼 생활 패턴</h2>
          <span className="text-[var(--muted)]">{activeSection === 'lifestyle' ? '▲' : '▼'}</span>
        </button>
        
        {activeSection === 'lifestyle' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">생활 유형</label>
              <div className="grid grid-cols-2 gap-2">
                {LIFESTYLE_OPTIONS.map((option) => (
                  <RadioOption
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    selected={lifestyleType === option.value}
                    onSelect={(v) => setLifestyleType(v as LifestyleType)}
                  />
                ))}
              </div>
            </div>

            {(lifestyleType === 'office' || lifestyleType === 'office_flex') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <TimePicker label="출근 시간" value={officeStart} onChange={setOfficeStart} />
                  <TimePicker label="퇴근 시간" value={officeEnd} onChange={setOfficeEnd} />
                </div>
                <TimePicker label="점심 시간" value={lunchTime} onChange={setLunchTime} />
                <CommuteDurationPicker value={commuteMinutes} onChange={setCommuteMinutes} />
              </>
            )}
          </div>
        )}
      </section>

      {/* 수면 */}
      <section className="card">
        <button
          onClick={() => toggleSection('sleep')}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold">😴 수면</h2>
          <span className="text-[var(--muted)]">{activeSection === 'sleep' ? '▲' : '▼'}</span>
        </button>
        
        {activeSection === 'sleep' && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <TimePicker label="기상 시간" value={wakeTime} onChange={setWakeTime} />
            <TimePicker label="취침 시간" value={bedTime} onChange={setBedTime} />
          </div>
        )}
      </section>

      {/* 식사 */}
      <section className="card">
        <button
          onClick={() => toggleSection('meals')}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold">🍽️ 식사</h2>
          <span className="text-[var(--muted)]">{activeSection === 'meals' ? '▲' : '▼'}</span>
        </button>
        
        {activeSection === 'meals' && (
          <div className="mt-4 space-y-4">
            <MealTimeInput
              label="아침"
              enabled={breakfastEnabled}
              time={breakfastTime}
              onEnabledChange={setBreakfastEnabled}
              onTimeChange={setBreakfastTime}
            />
            <MealTimeInput
              label="점심"
              enabled={lunchEnabled}
              time={lunchTime}
              onEnabledChange={setLunchEnabled}
              onTimeChange={setLunchTime}
            />
            <MealTimeInput
              label="저녁"
              enabled={dinnerEnabled}
              time={dinnerTime}
              onEnabledChange={setDinnerEnabled}
              onTimeChange={setDinnerTime}
            />
          </div>
        )}
      </section>

      {/* 운동 */}
      <section className="card">
        <button
          onClick={() => toggleSection('exercise')}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold">💪 운동</h2>
          <span className="text-[var(--muted)]">{activeSection === 'exercise' ? '▲' : '▼'}</span>
        </button>
        
        {activeSection === 'exercise' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">운동 여부</label>
              <div className="flex gap-2">
                {[{ label: '예', value: true }, { label: '아니오', value: false }].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setExerciseActive(opt.value)}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                      exerciseActive === opt.value
                        ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {exerciseActive && (
              <>
                <div>
                  <label className="label">주간 횟수</label>
                  <div className="flex gap-2">
                    {WEEKLY_EXERCISE_COUNT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setWeeklyCount(opt.value)}
                        className={`flex-1 py-2 rounded-lg border text-sm ${
                          weeklyCount === opt.value
                            ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                            : 'border-[var(--border)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">운동 요일</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => {
                          if (exerciseDays.includes(day.value)) {
                            setExerciseDays(exerciseDays.filter(d => d !== day.value));
                          } else if (exerciseDays.length < weeklyCount) {
                            setExerciseDays([...exerciseDays, day.value]);
                          }
                        }}
                        className={`py-2 rounded text-xs ${
                          exerciseDays.includes(day.value)
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--border)]'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <TimePicker label="운동 시간" value={exerciseTime} onChange={setExerciseTime} />

                <div>
                  <label className="label">운동 종류</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXERCISE_TYPE_OPTIONS.map((type) => (
                      <CheckboxOption
                        key={type.value}
                        label={type.label}
                        checked={exerciseTypes.includes(type.value)}
                        onChange={(checked) => {
                          if (checked) {
                            setExerciseTypes([...exerciseTypes, type.value]);
                          } else {
                            setExerciseTypes(exerciseTypes.filter(t => t !== type.value));
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary w-full text-lg py-4 disabled:opacity-50"
      >
        {isSaving ? '저장 중...' : '💾 저장하기'}
      </button>
    </div>
  );
}

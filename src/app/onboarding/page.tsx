'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/hooks/useProfile';
import {
  OnboardingStep,
  RadioOption,
  CheckboxOption,
  ProgressBar,
} from '@/components/OnboardingStep';
import {
  TimePicker,
  CommuteDurationPicker,
  ToggleGroup,
  MealTimeInput,
  Select,
} from '@/components/FormInputs';
import {
  UserProfile,
  LifestyleType,
  ShiftType,
  WorkHourPeriod,
  Weekday,
  WeeklyExerciseCount,
  GENDER_OPTIONS,
  LIFESTYLE_OPTIONS,
  SHIFT_OPTIONS,
  WORK_HOUR_PERIOD_OPTIONS,
  WEEKDAY_OPTIONS,
  WEEKLY_EXERCISE_COUNT_OPTIONS,
  EXERCISE_TYPE_OPTIONS,
  DURATION_OPTIONS,
} from '@/types/profile';

const TOTAL_STEPS = 8;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { saveProfile } = useProfile();
  const [step, setStep] = useState(1);

  // 로그인 안됐으면 로그인 페이지로
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  // Step 1: 기본 정보
  const [gender, setGender] = useState<UserProfile['gender'] | ''>('');
  const [trackMenstrual, setTrackMenstrual] = useState(false);

  // Step 2: 생활 유형
  const [lifestyleType, setLifestyleType] = useState<LifestyleType | ''>('');

  // Step 3: 고정 일정 (생활 유형별)
  const [officeStart, setOfficeStart] = useState('09:00');
  const [officeEnd, setOfficeEnd] = useState('18:00');
  const [lunchTime, setLunchTime] = useState('12:00');
  const [commuteMinutes, setCommuteMinutes] = useState(30);
  const [shiftType, setShiftType] = useState<ShiftType | ''>('');
  const [classStart, setClassStart] = useState('09:00');
  const [classEnd, setClassEnd] = useState('17:00');
  const [freeDays, setFreeDays] = useState<Weekday[]>([]);
  const [preferredWorkHours, setPreferredWorkHours] = useState<WorkHourPeriod[]>(['morning', 'afternoon']);

  // Step 4: 수면 패턴
  const [wakeTime, setWakeTime] = useState('07:00');
  const [bedTime, setBedTime] = useState('23:00');
  const [weekendDifferent, setWeekendDifferent] = useState(false);
  const [weekendWakeTime, setWeekendWakeTime] = useState('09:00');
  const [weekendBedTime, setWeekendBedTime] = useState('00:00');

  // Step 5: 식사 습관
  const [breakfast, setBreakfast] = useState({ enabled: true, time: '07:30' });
  const [lunch, setLunch] = useState({ enabled: true, time: '12:00' });
  const [dinner, setDinner] = useState({ enabled: true, time: '19:00' });

  // Step 6: 운동 습관 (확장)
  const [exerciseActive, setExerciseActive] = useState<boolean | null>(null);
  const [weeklyCount, setWeeklyCount] = useState<WeeklyExerciseCount>(3);
  const [exerciseDays, setExerciseDays] = useState<Weekday[]>(['mon', 'wed', 'fri']);
  const [exerciseTime, setExerciseTime] = useState('19:00');
  const [exerciseDuration, setExerciseDuration] = useState(60);
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);

  // Step 7: 기타 루틴
  const [caffeine, setCaffeine] = useState({ enabled: false, time: '09:00' });
  const [nap, setNap] = useState({ enabled: false, time: '13:00', duration: 30 });
  const [morningBreak, setMorningBreak] = useState({ enabled: false, time: '10:30', duration: 15 });
  const [afternoonBreak, setAfternoonBreak] = useState({ enabled: false, time: '15:00', duration: 15 });

  const canProceed = () => {
    switch (step) {
      case 1:
        return gender !== '';
      case 2:
        return lifestyleType !== '';
      case 3:
        if (lifestyleType === 'shift') return shiftType !== '';
        return true;
      case 4:
        return wakeTime && bedTime;
      case 5:
        return true;
      case 6:
        if (exerciseActive === null) return false;
        if (exerciseActive && exerciseDays.length === 0) return false;
        return true;
      case 7:
        return true;
      case 8:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // 완료 - 프로필 저장
      const profile: UserProfile = {
        gender: gender as UserProfile['gender'],
        trackMenstrual: gender === 'female' ? trackMenstrual : undefined,
        lifestyle: {
          type: lifestyleType as LifestyleType,
          ...(lifestyleType === 'office' || lifestyleType === 'office_flex' ? {
            officeHours: { start: officeStart, end: officeEnd, lunchTime },
            commuteMinutes,
          } : {}),
          ...(lifestyleType === 'shift' ? { shiftType: shiftType as ShiftType } : {}),
          ...(lifestyleType === 'student' ? {
            classHours: { start: classStart, end: classEnd },
            freeDays,
          } : {}),
          ...(lifestyleType === 'freelancer' ? { preferredWorkHours } : {}),
        },
        sleep: {
          wakeTime,
          bedTime,
          weekendDifferent,
          ...(weekendDifferent ? { weekendWakeTime, weekendBedTime } : {}),
        },
        meals: {
          breakfast,
          lunch,
          dinner,
        },
        exercise: {
          active: exerciseActive!,
          ...(exerciseActive ? {
            weeklyCount,
            days: exerciseDays,
            time: exerciseTime,
            duration: exerciseDuration,
            types: exerciseTypes.length > 0 ? exerciseTypes : undefined,
          } : {}),
        },
        breaks: {
          morning: morningBreak.enabled ? morningBreak : undefined,
          afternoon: afternoonBreak.enabled ? afternoonBreak : undefined,
        },
        routines: {
          caffeine: caffeine.enabled ? caffeine : undefined,
          nap: nap.enabled ? nap : undefined,
        },
      };
      await saveProfile(profile);
      router.push('/');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // 운동 횟수에 맞게 요일 자동 조정
  const handleWeeklyCountChange = (count: WeeklyExerciseCount) => {
    setWeeklyCount(count);
    // 현재 선택된 요일이 횟수보다 많으면 앞에서부터 자르기
    if (exerciseDays.length > count) {
      setExerciseDays(exerciseDays.slice(0, count));
    }
  };

  const handleExerciseDayToggle = (day: Weekday) => {
    if (exerciseDays.includes(day)) {
      setExerciseDays(exerciseDays.filter(d => d !== day));
    } else if (exerciseDays.length < weeklyCount) {
      setExerciseDays([...exerciseDays, day]);
    }
  };

  const renderStep3Content = () => {
    switch (lifestyleType) {
      case 'office':
      case 'office_flex':
        return (
          <OnboardingStep
            title="근무 시간을 알려주세요"
            subtitle="출퇴근 시간과 점심시간을 설정해주세요"
          >
            <TimePicker label="출근 시간" value={officeStart} onChange={setOfficeStart} />
            <TimePicker label="퇴근 시간" value={officeEnd} onChange={setOfficeEnd} />
            <TimePicker label="점심 시간" value={lunchTime} onChange={setLunchTime} />
            <CommuteDurationPicker label="출퇴근 소요 시간 (편도)" value={commuteMinutes} onChange={setCommuteMinutes} />
          </OnboardingStep>
        );
      case 'shift':
        return (
          <OnboardingStep
            title="교대 근무 형태를 선택해주세요"
            subtitle="현재 근무 중인 교대 형태를 알려주세요"
          >
            {SHIFT_OPTIONS.map((option) => (
              <RadioOption
                key={option.value}
                value={option.value}
                label={option.label}
                selected={shiftType === option.value}
                onSelect={(v) => setShiftType(v as ShiftType)}
              />
            ))}
          </OnboardingStep>
        );
      case 'student':
        return (
          <OnboardingStep
            title="수업 시간을 알려주세요"
            subtitle="평균적인 수업 시간을 설정해주세요"
          >
            <TimePicker label="첫 수업 시작" value={classStart} onChange={setClassStart} />
            <TimePicker label="마지막 수업 종료" value={classEnd} onChange={setClassEnd} />
            <div className="mt-2">
              <label className="label">공강인 요일 (선택)</label>
              <ToggleGroup
                options={WEEKDAY_OPTIONS}
                selected={freeDays}
                onChange={(v) => setFreeDays(v as Weekday[])}
              />
            </div>
          </OnboardingStep>
        );
      case 'freelancer':
        return (
          <OnboardingStep
            title="주로 일하는 시간대를 선택해주세요"
            subtitle="여러 개 선택 가능합니다"
          >
            <div className="flex flex-col gap-2">
              {WORK_HOUR_PERIOD_OPTIONS.map((option) => (
                <CheckboxOption
                  key={option.value}
                  label={option.label}
                  checked={preferredWorkHours.includes(option.value)}
                  onChange={(checked) => {
                    if (checked) {
                      setPreferredWorkHours([...preferredWorkHours, option.value]);
                    } else {
                      setPreferredWorkHours(preferredWorkHours.filter(v => v !== option.value));
                    }
                  }}
                />
              ))}
            </div>
          </OnboardingStep>
        );
      default:
        return (
          <OnboardingStep
            title="활동 시간대를 알려주세요"
            subtitle="주로 활동하는 시간을 선택해주세요"
          >
            <div className="flex flex-col gap-2">
              {WORK_HOUR_PERIOD_OPTIONS.map((option) => (
                <CheckboxOption
                  key={option.value}
                  label={option.label}
                  checked={preferredWorkHours.includes(option.value)}
                  onChange={(checked) => {
                    if (checked) {
                      setPreferredWorkHours([...preferredWorkHours, option.value]);
                    } else {
                      setPreferredWorkHours(preferredWorkHours.filter(v => v !== option.value));
                    }
                  }}
                />
              ))}
            </div>
          </OnboardingStep>
        );
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col animate-fadeIn">
      <ProgressBar current={step} total={TOTAL_STEPS} />

      <div className="flex-1 animate-slideIn" key={step}>
        {step === 1 && (
          <OnboardingStep
            title="성별을 알려주세요"
            subtitle="맞춤형 컨디션 관리를 위해 필요해요"
          >
            {GENDER_OPTIONS.map((option) => (
              <RadioOption
                key={option.value}
                value={option.value}
                label={option.label}
                selected={gender === option.value}
                onSelect={(v) => setGender(v as UserProfile['gender'])}
              />
            ))}
            {gender === 'female' && (
              <div className="mt-4 p-4 rounded-lg border border-[var(--border)]">
                <CheckboxOption
                  label="월경 주기를 고려한 컨디션 관리"
                  checked={trackMenstrual}
                  onChange={setTrackMenstrual}
                />
                <p className="text-xs text-[var(--muted)] mt-2 ml-8">
                  PMS, 생리 기간 등을 반영해 일정을 조절해드려요
                </p>
              </div>
            )}
          </OnboardingStep>
        )}

        {step === 2 && (
          <OnboardingStep
            title="어떤 생활을 하고 계신가요?"
            subtitle="맞춤 일정 템플릿을 제공해드릴게요"
          >
            {LIFESTYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLifestyleType(option.value)}
                className={`radio-option flex-col items-start ${lifestyleType === option.value ? 'selected' : ''}`}
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-sm text-[var(--muted)]">{option.description}</span>
              </button>
            ))}
          </OnboardingStep>
        )}

        {step === 3 && renderStep3Content()}

        {step === 4 && (
          <OnboardingStep
            title="수면 패턴을 알려주세요"
            subtitle="기상/취침 시간을 설정해주세요"
          >
            <TimePicker label="평소 기상 시간" value={wakeTime} onChange={setWakeTime} />
            <TimePicker label="평소 취침 시간" value={bedTime} onChange={setBedTime} />
            <div className="mt-4">
              <CheckboxOption
                label="주말은 다른 패턴이에요"
                checked={weekendDifferent}
                onChange={setWeekendDifferent}
              />
            </div>
            {weekendDifferent && (
              <div className="mt-4 p-4 rounded-lg border border-[var(--border)] flex flex-col gap-4">
                <TimePicker label="주말 기상 시간" value={weekendWakeTime} onChange={setWeekendWakeTime} />
                <TimePicker label="주말 취침 시간" value={weekendBedTime} onChange={setWeekendBedTime} />
              </div>
            )}
          </OnboardingStep>
        )}

        {step === 5 && (
          <OnboardingStep
            title="식사 습관을 알려주세요"
            subtitle="각 끼니별 시간을 설정해주세요"
          >
            <MealTimeInput
              label="아침"
              enabled={breakfast.enabled}
              time={breakfast.time}
              onEnabledChange={(enabled) => setBreakfast({ ...breakfast, enabled })}
              onTimeChange={(time) => setBreakfast({ ...breakfast, time })}
            />
            <MealTimeInput
              label="점심"
              enabled={lunch.enabled}
              time={lunch.time}
              onEnabledChange={(enabled) => setLunch({ ...lunch, enabled })}
              onTimeChange={(time) => setLunch({ ...lunch, time })}
            />
            <MealTimeInput
              label="저녁"
              enabled={dinner.enabled}
              time={dinner.time}
              onEnabledChange={(enabled) => setDinner({ ...dinner, enabled })}
              onTimeChange={(time) => setDinner({ ...dinner, time })}
            />
          </OnboardingStep>
        )}

        {step === 6 && (
          <OnboardingStep
            title="운동을 하시나요?"
            subtitle="운동 습관을 상세히 알려주세요"
          >
            <RadioOption
              value="yes"
              label="네, 운동해요"
              selected={exerciseActive === true}
              onSelect={() => setExerciseActive(true)}
            />
            <RadioOption
              value="no"
              label="아니요, 운동은 안해요"
              selected={exerciseActive === false}
              onSelect={() => setExerciseActive(false)}
            />

            {exerciseActive && (
              <div className="mt-4 p-4 rounded-lg border border-[var(--border)] flex flex-col gap-5">
                {/* 주간 운동 횟수 */}
                <div>
                  <label className="label">주간 운동 횟수</label>
                  <div className="flex gap-2">
                    {WEEKLY_EXERCISE_COUNT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleWeeklyCountChange(opt.value)}
                        className={`flex-1 py-2 px-2 rounded-lg border text-sm font-medium transition-all
                          ${weeklyCount === opt.value
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-[var(--border)]'
                          }`}
                        style={weeklyCount === opt.value ? { backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' } : undefined}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 운동 요일 선택 */}
                <div>
                  <label className="label">운동 요일 ({exerciseDays.length}/{weeklyCount}개 선택)</label>
                  <div className="flex gap-2">
                    {WEEKDAY_OPTIONS.map((opt) => {
                      const isSelected = exerciseDays.includes(opt.value);
                      const canSelect = isSelected || exerciseDays.length < weeklyCount;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleExerciseDayToggle(opt.value)}
                          disabled={!canSelect && !isSelected}
                          className={`w-10 h-10 rounded-full border text-sm font-medium transition-all
                            ${isSelected
                              ? 'border-[var(--primary)] text-white bg-[var(--primary)]'
                              : canSelect
                                ? 'border-[var(--border)] hover:border-[var(--primary)]'
                                : 'border-[var(--border)] opacity-30 cursor-not-allowed'
                            }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 운동 시간 */}
                <div className="grid grid-cols-2 gap-4">
                  <TimePicker label="운동 시간" value={exerciseTime} onChange={setExerciseTime} />
                  <div>
                    <label className="label">운동 시간</label>
                    <Select
                      value={exerciseDuration}
                      onChange={(v) => setExerciseDuration(Number(v))}
                      options={DURATION_OPTIONS}
                    />
                  </div>
                </div>

                {/* 운동 종류 (복수 선택) */}
                <div>
                  <label className="label">자주 하는 운동 (복수 선택 가능)</label>
                  <p className="text-xs text-[var(--muted)] mb-2">매일 계획 작성 시 당일 운동을 선택할 수 있어요</p>
                  <div className="flex flex-wrap gap-2">
                    {EXERCISE_TYPE_OPTIONS.map((opt) => {
                      const isSelected = exerciseTypes.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setExerciseTypes(exerciseTypes.filter(t => t !== opt.value));
                            } else {
                              setExerciseTypes([...exerciseTypes, opt.value]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full border text-sm transition-all
                            ${isSelected
                              ? 'border-[var(--primary)] text-[var(--primary)]'
                              : 'border-[var(--border)] hover:border-[var(--primary)]'
                            }`}
                          style={isSelected ? { backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' } : undefined}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </OnboardingStep>
        )}

        {step === 7 && (
          <OnboardingStep
            title="기타 루틴이 있나요?"
            subtitle="선택사항입니다"
          >
            <div className="flex flex-col gap-4">
              {/* 오전 휴식 */}
              <div className="p-4 rounded-lg border border-[var(--border)]">
                <CheckboxOption
                  label="☕ 오전 휴식/커피타임"
                  checked={morningBreak.enabled}
                  onChange={(checked) => setMorningBreak({ ...morningBreak, enabled: checked })}
                />
                {morningBreak.enabled && (
                  <div className="mt-3 ml-8 grid grid-cols-2 gap-4">
                    <TimePicker label="시간" value={morningBreak.time} onChange={(time) => setMorningBreak({ ...morningBreak, time })} />
                    <div>
                      <label className="label">길이</label>
                      <Select
                        value={morningBreak.duration}
                        onChange={(v) => setMorningBreak({ ...morningBreak, duration: Number(v) })}
                        options={[
                          { value: 10, label: '10분' },
                          { value: 15, label: '15분' },
                          { value: 20, label: '20분' },
                          { value: 30, label: '30분' },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 오후 휴식 */}
              <div className="p-4 rounded-lg border border-[var(--border)]">
                <CheckboxOption
                  label="🍵 오후 휴식"
                  checked={afternoonBreak.enabled}
                  onChange={(checked) => setAfternoonBreak({ ...afternoonBreak, enabled: checked })}
                />
                {afternoonBreak.enabled && (
                  <div className="mt-3 ml-8 grid grid-cols-2 gap-4">
                    <TimePicker label="시간" value={afternoonBreak.time} onChange={(time) => setAfternoonBreak({ ...afternoonBreak, time })} />
                    <div>
                      <label className="label">길이</label>
                      <Select
                        value={afternoonBreak.duration}
                        onChange={(v) => setAfternoonBreak({ ...afternoonBreak, duration: Number(v) })}
                        options={[
                          { value: 10, label: '10분' },
                          { value: 15, label: '15분' },
                          { value: 20, label: '20분' },
                          { value: 30, label: '30분' },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 낮잠 */}
              <div className="p-4 rounded-lg border border-[var(--border)]">
                <CheckboxOption
                  label="😴 낮잠"
                  checked={nap.enabled}
                  onChange={(checked) => setNap({ ...nap, enabled: checked })}
                />
                {nap.enabled && (
                  <div className="mt-3 ml-8 grid grid-cols-2 gap-4">
                    <TimePicker label="낮잠 시간" value={nap.time} onChange={(time) => setNap({ ...nap, time })} />
                    <div>
                      <label className="label">낮잠 길이</label>
                      <Select
                        value={nap.duration}
                        onChange={(v) => setNap({ ...nap, duration: Number(v) })}
                        options={[
                          { value: 15, label: '15분' },
                          { value: 30, label: '30분' },
                          { value: 45, label: '45분' },
                          { value: 60, label: '1시간' },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </OnboardingStep>
        )}

        {step === 8 && (
          <OnboardingStep
            title="설정 완료!"
            subtitle="입력하신 정보를 확인해주세요"
          >
            <div className="card">
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">성별</span>
                  <span>{GENDER_OPTIONS.find(o => o.value === gender)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">생활 유형</span>
                  <span>{LIFESTYLE_OPTIONS.find(o => o.value === lifestyleType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">기상 시간</span>
                  <span>{wakeTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">취침 시간</span>
                  <span>{bedTime}</span>
                </div>
                {exerciseActive && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">운동</span>
                      <span>주 {weeklyCount}회 / {exerciseTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">운동 요일</span>
                      <span>{exerciseDays.map(d => WEEKDAY_OPTIONS.find(o => o.value === d)?.label).join(', ')}</span>
                    </div>
                  </>
                )}
                {(morningBreak.enabled || afternoonBreak.enabled) && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">휴식</span>
                    <span>
                      {[
                        morningBreak.enabled && `오전 ${morningBreak.time}`,
                        afternoonBreak.enabled && `오후 ${afternoonBreak.time}`,
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-[var(--muted)] text-center mt-4">
              완료를 누르면 맞춤형 계획 페이지로 이동합니다
            </p>
          </OnboardingStep>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button onClick={handleBack} className="btn-secondary flex-1">
            이전
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="btn-primary flex-1"
        >
          {step === TOTAL_STEPS ? '완료' : '다음'}
        </button>
      </div>
    </div>
  );
}

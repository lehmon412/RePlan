'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useProfile } from '@/hooks/useProfile';
import { useNotification } from '@/hooks/useNotification';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { usePlanTimer, NOTIFY_TIMING_OPTIONS, type TimerSettings } from '@/hooks/usePlanTimer';
import { generateTimeBlocks, CONDITION_OPTIONS, MENSTRUAL_OPTIONS } from '@/lib/templates';
import { autoAssignTodosToBlocks, suggestAlternativeForBlock } from '@/lib/planner';
import { Timeline } from '@/components/TimeBlockCard';
import { RadioOption } from '@/components/OnboardingStep';
import { NotificationModal } from '@/components/NotificationModal';
import type { TimeBlock, DailyPlan } from '@/types/profile';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { profile, isLoading, hasProfile, clearProfile } = useProfile();
  
  // 날짜 선택
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { plan: savedPlan, isLoading: isPlanLoading, isSaving, savePlan, hasPlan, dateString } = useDailyPlan(selectedDate);
  
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [condition, setCondition] = useState<DailyPlan['condition']>('normal');
  const [menstrualCondition, setMenstrualCondition] = useState<DailyPlan['menstrualCondition']>('normal');
  const [notes, setNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTodos, setPendingTodos] = useState<{text: string; duration?: number; priority?: 'high' | 'medium' | 'low'}[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDuration, setNewTodoDuration] = useState<number | ''>('');
  const [newTodoPriority, setNewTodoPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoAdvice, setAutoAdvice] = useState('');
  
  // 알림 관련 상태
  const [timerSettings, setTimerSettings] = useState<TimerSettings>({
    enabled: false,
    timing: 'on_time',
  });
  const [notificationBlock, setNotificationBlock] = useState<TimeBlock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlternativeLoading, setIsAlternativeLoading] = useState(false);
  const [alternativePlan, setAlternativePlan] = useState<{
    suggestion: string;
    modifiedTodos: { text: string; duration?: number; priority?: 'high' | 'medium' | 'low' }[];
  } | null>(null);

  const { permission, isSupported, requestPermission, sendNotification } = useNotification();

  const showMenstrualOption = profile?.gender === 'female' && profile?.trackMenstrual === true;

  // 저장된 계획 불러오기 또는 프로필 기반 새 계획 생성
  useEffect(() => {
    if (!profile) return;
    
    if (savedPlan && !isPlanLoading) {
      // 저장된 계획이 있으면 불러오기
      setTimeBlocks(savedPlan.timeBlocks || []);
      setCondition(savedPlan.condition || 'normal');
      setMenstrualCondition(savedPlan.menstrualCondition || 'normal');
      setNotes(savedPlan.notes || '');
      setHasUnsavedChanges(false);
    } else if (!savedPlan && !isPlanLoading) {
      // 저장된 계획이 없으면 프로필 기반 새 블록 생성
      const blocks = generateTimeBlocks(profile);
      setTimeBlocks(blocks);
      setCondition('normal');
      setMenstrualCondition('normal');
      setNotes('');
      setHasUnsavedChanges(false);
    }
  }, [profile, savedPlan, isPlanLoading]);

  // 로그인 체크 → 프로필 체크
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (sessionStatus === 'authenticated' && !isLoading && !hasProfile) {
      router.push('/onboarding');
    }
  }, [sessionStatus, isLoading, hasProfile, router]);

  // 알림 핸들러
  const handleNotify = useCallback((block: TimeBlock) => {
    // 브라우저 알림
    sendNotification({
      title: `📋 ${block.label}`,
      body: block.todos.length > 0 
        ? `할 일: ${block.todos.map(t => t.text).join(', ')}`
        : '시간이 되었습니다!',
      onClick: () => {
        setNotificationBlock(block);
        setIsModalOpen(true);
      },
    });

    // 앱 내 모달
    setNotificationBlock(block);
    setIsModalOpen(true);
    setAlternativePlan(null);
  }, [sendNotification]);

  // 타이머 훅
  const { activeTimers } = usePlanTimer({
    timeBlocks,
    settings: timerSettings,
    onNotify: handleNotify,
  });

  // 알림 권한 요청
  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setTimerSettings(prev => ({ ...prev, enabled: true }));
    } else {
      alert('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
    }
  };

  // 대안 요청 (로컬 규칙 기반)
  const handleRequestAlternative = async (block: TimeBlock) => {
    setIsAlternativeLoading(true);
    setAlternativePlan(null);

    try {
      const alt = suggestAlternativeForBlock(block, condition);
      setAlternativePlan(alt);
    } catch (error) {
      console.error('Alternative Error:', error);
      setAlternativePlan({
        suggestion: '대체 계획을 만들지 못했어요. 가장 중요한 일 1개만 남기고 나머지는 미루는 걸 추천해요.',
        modifiedTodos: [],
      });
    } finally {
      setIsAlternativeLoading(false);
    }
  };

  // 대체 계획 적용
  const handleApplyAlternative = (block: TimeBlock, newTodos: import('@/types/profile').TodoItem[]) => {
    setTimeBlocks(prev => prev.map(b => 
      b.id === block.id ? { ...b, todos: newTodos } : b
    ));
    setHasUnsavedChanges(true);
  };

  // 계획 저장
  const handleSavePlan = async () => {
    const planData: DailyPlan = {
      date: dateString,
      condition,
      menstrualCondition: showMenstrualOption ? menstrualCondition : undefined,
      timeBlocks,
      notes,
    };
    
    const success = await savePlan(planData);
    if (success) {
      setHasUnsavedChanges(false);
    }
    return success;
  };

  // 날짜 변경
  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // 계획 확인 (실천 가능)
  const handleConfirmBlock = (block: TimeBlock) => {
    // 블록 상태 업데이트 (필요시)
    console.log('Confirmed block:', block.id);
  };

  const handleSubmit = () => {
    const planData: DailyPlan = {
      date: new Date().toISOString().split('T')[0],
      condition,
      menstrualCondition: showMenstrualOption ? menstrualCondition : undefined,
      timeBlocks,
      notes,
    };

    const encoded = encodeURIComponent(JSON.stringify(planData));
    router.push(`/result?data=${encoded}`);
  };

  const handleReset = async () => {
    if (confirm('프로필을 초기화하시겠습니까? 온보딩을 다시 진행해야 합니다.')) {
      await clearProfile();
      router.push('/onboarding');
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    await clearProfile();
    router.push('/login');
  };

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      setPendingTodos([...pendingTodos, {
        text: newTodoText.trim(),
        duration: newTodoDuration === '' ? undefined : newTodoDuration,
        priority: newTodoPriority,
      }]);
      setNewTodoText('');
      setNewTodoDuration('');
      setNewTodoPriority('medium');
    }
  };

  const handleRemoveTodo = (index: number) => {
    setPendingTodos(pendingTodos.filter((_, i) => i !== index));
  };

  const handleAutoAssign = async () => {
    if (pendingTodos.length === 0) {
      alert('먼저 할 일을 추가해주세요.');
      return;
    }

    try {
      setIsAutoLoading(true);
      setAutoAdvice('');

      const { updatedBlocks, advice } = autoAssignTodosToBlocks(pendingTodos, timeBlocks, condition);
      setTimeBlocks(updatedBlocks);
      setPendingTodos([]);
      setAutoAdvice(advice);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Auto assign error:', error);
      alert('자동 배치 중 오류가 발생했습니다.');
    } finally {
      setIsAutoLoading(false);
    }
  };

  if (isLoading || sessionStatus === 'loading' || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    );
  }

  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const formattedDate = selectedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // 선택된 날짜가 운동 날인지 확인
  const isExerciseDay = profile.exercise.active && 
    (!profile.exercise.days || profile.exercise.days.length === 0 || 
     profile.exercise.days.includes((['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[selectedDate.getDay()]));

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold mb-1">Re_Plan</h1>
        </div>
        
        {/* 사용자 정보 & 테마 */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push('/settings')}
            className="text-lg hover:scale-110 transition-transform"
            title="설정"
          >
            ⚙️
          </button>
          {session?.user && (
            <div className="flex items-center gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 날짜 선택기 */}
      <div className="card flex items-center justify-between">
        <button
          onClick={() => handleDateChange(-1)}
          className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
        >
          ◀
        </button>
        <div className="text-center">
          <p className="font-semibold">{formattedDate}</p>
          {isToday && <span className="text-xs text-[var(--primary)]">오늘</span>}
          {hasPlan && <span className="text-xs text-green-600 ml-2">저장됨 ✓</span>}
          {hasUnsavedChanges && <span className="text-xs text-orange-500 ml-2">변경됨 •</span>}
        </div>
        <button
          onClick={() => handleDateChange(1)}
          className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
        >
          ▶
        </button>
      </div>

      {/* 오늘의 컨디션 */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4">💪 오늘의 컨디션</h2>
        <div className="flex gap-2">
          {CONDITION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setCondition(option.value)}
              className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-all
                ${condition === option.value
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-[var(--border)]'
                }`}
              style={condition === option.value ? { backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' } : undefined}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 월경 컨디션 (여성만) */}
        {showMenstrualOption && (
          <div className="mt-4">
            <label className="label text-[var(--muted)]">생리 주기 상태</label>
            <div className="grid grid-cols-2 gap-2">
              {MENSTRUAL_OPTIONS.map((option) => (
                <RadioOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  selected={menstrualCondition === option.value}
                  onSelect={(v) => setMenstrualCondition(v as DailyPlan['menstrualCondition'])}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 운동 날 알림 */}
      {isExerciseDay && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <span className="text-lg">🏋️</span>
          <span className="text-sm text-green-700 dark:text-green-400 font-medium">
            오늘은 운동하는 날이에요!
          </span>
        </div>
      )}

      {/* 자동 배치 - 할 일 입력 */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4">✨ 자동 스케줄 추천</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          할 일을 입력하면 규칙 기반으로 최적의 시간에 자동 배치해드려요
        </p>

        {/* 대기 중인 할 일 목록 */}
        {pendingTodos.length > 0 && (
          <div className="mb-4 space-y-2">
            {pendingTodos.map((todo, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  todo.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {todo.priority === 'high' ? '긴급' : todo.priority === 'medium' ? '중요' : '보통'}
                </span>
                <span className="flex-1 text-sm">{todo.text}</span>
                {todo.duration && <span className="text-xs text-[var(--muted)]">{todo.duration}분</span>}
                <button onClick={() => handleRemoveTodo(index)} className="text-[var(--muted)] hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* 할 일 입력 폼 */}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            className="input"
            placeholder="할 일을 입력하세요..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
          />
          <div className="flex gap-2">
            <select
              className="input text-sm flex-1"
              value={newTodoDuration}
              onChange={(e) => setNewTodoDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
            >
              <option value="">소요 시간</option>
              <option value="15">15분</option>
              <option value="30">30분</option>
              <option value="60">1시간</option>
              <option value="90">1시간 30분</option>
              <option value="120">2시간</option>
            </select>
            <select
              className="input text-sm flex-1"
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(e.target.value as 'high' | 'medium' | 'low')}
            >
              <option value="high">🔴 긴급</option>
              <option value="medium">🟡 중요</option>
              <option value="low">🟢 보통</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddTodo} className="btn-secondary flex-1 py-2">
              + 추가
            </button>
            <button
              onClick={handleAutoAssign}
              disabled={pendingTodos.length === 0 || isAutoLoading}
              className="btn-primary flex-1 py-2 disabled:opacity-50"
            >
              {isAutoLoading ? '배치 중...' : '⚡ 자동 배치'}
            </button>
          </div>
        </div>

        {/* 조언 */}
        {autoAdvice && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">💡 {autoAdvice}</p>
          </div>
        )}
      </section>

      {/* 시간 블록 타임라인 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">📅 오늘의 일정</h2>
        <Timeline
          blocks={timeBlocks}
          onChange={setTimeBlocks}
          exerciseTypes={profile.exercise.types}
        />
      </section>

      {/* 알림 설정 */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4">🔔 알림 설정</h2>
        
        {!isSupported ? (
          <p className="text-sm text-[var(--muted)]">
            이 브라우저는 알림을 지원하지 않습니다.
          </p>
        ) : permission !== 'granted' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--muted)]">
              알림을 허용하면 시간이 됐을 때 알려드려요.
            </p>
            <button onClick={handleEnableNotifications} className="btn-secondary py-2">
              🔔 알림 허용하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 알림 켜기/끄기 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">알림 활성화</span>
              <button
                onClick={() => setTimerSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  timerSettings.enabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                  timerSettings.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* 알림 타이밍 */}
            {timerSettings.enabled && (
              <div>
                <label className="text-sm text-[var(--muted)] mb-2 block">알림 타이밍</label>
                <div className="grid grid-cols-2 gap-2">
                  {NOTIFY_TIMING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTimerSettings(prev => ({ ...prev, timing: option.value }))}
                      className={`py-2 px-3 rounded-lg border text-sm transition-all ${
                        timerSettings.timing === option.value
                          ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 활성 타이머 수 */}
            {timerSettings.enabled && activeTimers.length > 0 && (
              <p className="text-xs text-[var(--muted)]">
                ⏱️ {activeTimers.length}개의 알림이 예약되었습니다.
              </p>
            )}
          </div>
        )}
      </section>

      {/* 특이사항 */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4">📝 특이사항</h2>
        <textarea
          className="textarea"
          placeholder="오늘 특별히 고려해야 할 사항이 있나요?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </section>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button 
          onClick={handleSavePlan} 
          disabled={isSaving}
          className="btn-secondary flex-1 text-lg py-4 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '💾 저장'}
        </button>
        <button onClick={handleSubmit} className="btn-primary flex-1 text-lg py-4">
          📋 확인
        </button>
      </div>

      {/* 하단 링크 */}
      <div className="flex justify-center gap-4 text-sm">
        <button
          onClick={() => router.push('/settings')}
          className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          프로필 수정
        </button>
        <span className="text-[var(--border)]">|</span>
        <button
          onClick={handleReset}
          className="text-[var(--muted)] hover:text-red-500 transition-colors"
        >
          초기화
        </button>
      </div>

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={isModalOpen}
        block={notificationBlock}
        onClose={() => {
          setIsModalOpen(false);
          setNotificationBlock(null);
          setAlternativePlan(null);
        }}
        onConfirm={handleConfirmBlock}
        onRequestAlternative={handleRequestAlternative}
        onApplyAlternative={handleApplyAlternative}
        isLoadingAlternative={isAlternativeLoading}
        alternativePlan={alternativePlan}
      />
    </div>
  );
}

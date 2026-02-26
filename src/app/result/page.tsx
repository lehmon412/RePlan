'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import Link from 'next/link';
import type { DailyPlan, TimeBlock } from '@/types/profile';
import { EXERCISE_TYPE_OPTIONS } from '@/types/profile';
import { formatDuration } from '@/components/TodoInput';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planData = useMemo<DailyPlan | null>(() => {
    const data = searchParams.get('data');
    if (!data) return null;
    try {
      return JSON.parse(decodeURIComponent(data));
    } catch {
      return null;
    }
  }, [searchParams]);

  if (!planData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">데이터를 찾을 수 없습니다</p>
        <Link href="/" className="btn-primary">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      good: '좋음 😊',
      normal: '보통 😐',
      bad: '안좋음 😔',
    };
    return labels[condition] || condition;
  };

  const getMenstrualLabel = (condition: string) => {
    const labels: Record<string, string> = {
      normal: '평소와 같음',
      pms: 'PMS 기간',
      period: '생리 중',
      post: '생리 직후',
    };
    return labels[condition] || condition;
  };

  const getExerciseTypeLabel = (type: string) => {
    return EXERCISE_TYPE_OPTIONS.find(t => t.value === type)?.label || type;
  };

  // 입력된 할 일이 있는 블록만 필터링
  const blocksWithTodos = planData.timeBlocks.filter(
    block => block.todos.some(t => t.text.trim()) || block.exercisePlan?.trim()
  );

  // 전체 할 일 목록
  const allTodos = planData.timeBlocks.flatMap(block => 
    block.todos.filter(t => t.text.trim()).map(t => ({
      ...t,
      blockLabel: block.label,
      blockTime: block.startTime,
      blockIcon: block.icon,
    }))
  );

  // 우선순위별 정렬
  const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 };
  const sortedTodos = [...allTodos].sort((a, b) => 
    (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) - 
    (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold mb-1">오늘의 계획</h1>
        <p className="text-sm text-[var(--muted)]">
          {new Date(planData.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
      </div>

      {/* 컨디션 요약 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <span className="text-[var(--muted)]">오늘의 컨디션</span>
          <span className="font-medium">{getConditionLabel(planData.condition)}</span>
        </div>
        {planData.menstrualCondition && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
            <span className="text-[var(--muted)]">생리 주기</span>
            <span className="font-medium">{getMenstrualLabel(planData.menstrualCondition)}</span>
          </div>
        )}
      </div>

      {/* 우선순위별 할 일 목록 */}
      {sortedTodos.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-semibold mb-4">✅ 오늘의 할 일 ({sortedTodos.length})</h2>
          <div className="flex flex-col gap-2">
            {sortedTodos.map((todo, index) => (
              <div
                key={todo.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--background)]"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[var(--border)] flex items-center justify-center text-xs">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {todo.priority && (
                      <span className="text-xs">
                        {todo.priority === 'high' && '🔴'}
                        {todo.priority === 'medium' && '🟡'}
                        {todo.priority === 'low' && '🟢'}
                      </span>
                    )}
                    <span className={todo.completed ? 'line-through text-[var(--muted)]' : ''}>
                      {todo.text}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1 flex items-center gap-2">
                    <span>{todo.blockIcon} {todo.blockLabel}</span>
                    <span>({todo.blockTime})</span>
                    {todo.duration && <span>⏱️ {formatDuration(todo.duration)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 타임라인 */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4">📋 타임라인</h2>
        
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[var(--border)]" />
          
          <div className="flex flex-col gap-1">
            {planData.timeBlocks.map((block) => {
              const hasTodos = block.todos.some(t => t.text.trim());
              const hasExercisePlan = block.exercisePlan?.trim();
              const isActive = hasTodos || hasExercisePlan;

              return (
                <div key={block.id} className="relative flex gap-3 py-2">
                  <div 
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-sm
                      ${isActive 
                        ? 'bg-[var(--primary)]' 
                        : block.isFixed 
                          ? 'bg-[var(--card)] border-2 border-[var(--border)]'
                          : 'bg-[var(--card)] border-2 border-dashed border-[var(--muted)]'
                      }`}
                    style={{ boxShadow: '0 0 0 3px var(--card)' }}
                  >
                    <span className="text-xs">{block.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">{block.startTime}</span>
                      <span className={`text-sm font-medium ${isActive ? '' : 'text-[var(--muted)]'}`}>
                        {block.label}
                      </span>
                    </div>
                    
                    {/* 운동 블록 */}
                    {block.blockType === 'exercise' && (block.exerciseType || hasExercisePlan) && (
                      <div className="mt-1 text-sm">
                        {block.exerciseType && (
                          <span className="inline-block px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs mr-2">
                            {getExerciseTypeLabel(block.exerciseType)}
                          </span>
                        )}
                        {hasExercisePlan && (
                          <p className="text-[var(--muted)] mt-1">{block.exercisePlan}</p>
                        )}
                      </div>
                    )}
                    
                    {/* 할 일 목록 */}
                    {hasTodos && (
                      <div className="mt-1">
                        {block.todos.filter(t => t.text.trim()).map((todo) => (
                          <div key={todo.id} className="text-sm flex items-center gap-2">
                            <span className="text-[var(--muted)]">•</span>
                            <span>{todo.text}</span>
                            {todo.duration && (
                              <span className="text-xs text-[var(--muted)]">({formatDuration(todo.duration)})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 특이사항 */}
      {planData.notes && (
        <section className="card">
          <h2 className="text-lg font-semibold mb-2">📝 특이사항</h2>
          <p className="text-[var(--muted)] whitespace-pre-wrap">{planData.notes}</p>
        </section>
      )}

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="btn-secondary flex-1"
        >
          수정하기
        </button>
        <Link href="/" className="btn-primary flex-1 text-center">
          새 계획 작성
        </Link>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import type { TimeBlock, TodoItem } from '@/types/profile';

interface AlternativePlan {
  suggestion: string;
  modifiedTodos: { text: string; duration?: number; priority?: 'high' | 'medium' | 'low' }[];
}

interface NotificationModalProps {
  isOpen: boolean;
  block: TimeBlock | null;
  onClose: () => void;
  onConfirm: (block: TimeBlock) => void;
  onRequestAlternative: (block: TimeBlock) => void;
  onApplyAlternative: (block: TimeBlock, newTodos: TodoItem[]) => void;
  isLoadingAlternative?: boolean;
  alternativePlan?: AlternativePlan | null;
}

export function NotificationModal({
  isOpen,
  block,
  onClose,
  onConfirm,
  onRequestAlternative,
  onApplyAlternative,
  isLoadingAlternative = false,
  alternativePlan = null,
}: NotificationModalProps) {
  const [showAlternative, setShowAlternative] = useState(false);

  if (!isOpen || !block) return null;

  const handleConfirm = () => {
    onConfirm(block);
    onClose();
  };

  const handleRequestAlternative = () => {
    setShowAlternative(true);
    onRequestAlternative(block);
  };

  const handleApplyAlternative = () => {
    if (alternativePlan?.modifiedTodos && alternativePlan.modifiedTodos.length > 0) {
      const newTodos: TodoItem[] = alternativePlan.modifiedTodos.map((todo, index) => ({
        id: `alt-${Date.now()}-${index}`,
        text: todo.text,
        duration: todo.duration,
        priority: todo.priority || 'medium',
        completed: false,
      }));
      onApplyAlternative(block, newTodos);
      onClose();
    }
  };

  const totalDuration = block.todos.reduce((sum, todo) => sum + (todo.duration || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div className="w-full max-w-md bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] animate-slideIn">
        {/* 헤더 */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{block.icon || '📋'}</span>
            <div>
              <h2 className="text-lg font-bold">{block.label}</h2>
              <p className="text-sm text-[var(--muted)]">
                {block.startTime} - {block.endTime}
              </p>
            </div>
          </div>
        </div>

        {/* 웰니스 팁 */}
        {block.wellnessTip && (
          <div className="mx-4 mt-4 px-3 py-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-0.5">🌿 웰니스 팁</p>
            <p className="text-sm text-teal-600 dark:text-teal-300">{block.wellnessTip}</p>
          </div>
        )}

        {/* 할 일 목록 */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-3">예정된 할 일</h3>
          
          {block.todos.length > 0 ? (
            <ul className="space-y-2">
              {block.todos.map((todo) => (
                <li 
                  key={todo.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                >
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    todo.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {todo.priority === 'high' ? '긴급' : todo.priority === 'medium' ? '중요' : '보통'}
                  </span>
                  <span className="flex-1 text-sm">{todo.text}</span>
                  {todo.duration && (
                    <span className="text-xs text-[var(--muted)]">{todo.duration}분</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)] text-center py-4">
              예정된 할 일이 없습니다.
            </p>
          )}

          {totalDuration > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] text-sm text-[var(--muted)] text-right">
              예상 소요: {totalDuration}분
            </div>
          )}
        </div>

        {/* AI 대안 추천 */}
        {showAlternative && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              {isLoadingAlternative ? (
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <span className="animate-pulse-soft">🤖</span>
                  <span className="text-sm">AI가 대체 계획을 생성 중...</span>
                </div>
              ) : alternativePlan ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    💡 AI 추천 대체 계획
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    {alternativePlan.suggestion}
                  </p>
                  
                  {/* 대체 할 일 목록 */}
                  {alternativePlan.modifiedTodos && alternativePlan.modifiedTodos.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400">새로운 할 일:</p>
                      {alternativePlan.modifiedTodos.map((todo, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 p-2 rounded bg-white/50 dark:bg-black/20"
                        >
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            todo.priority === 'high' ? 'bg-red-200 text-red-800' :
                            todo.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-green-200 text-green-800'
                          }`}>
                            {todo.priority === 'high' ? '긴급' : todo.priority === 'medium' ? '중요' : '보통'}
                          </span>
                          <span className="flex-1 text-sm text-blue-900 dark:text-blue-100">{todo.text}</span>
                          {todo.duration && (
                            <span className="text-xs text-blue-600 dark:text-blue-300">{todo.duration}분</span>
                          )}
                        </div>
                      ))}
                      
                      {/* 적용 버튼 */}
                      <button
                        onClick={handleApplyAlternative}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        ✨ 이 계획으로 변경하기
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="p-4 border-t border-[var(--border)] flex gap-3">
          <button
            onClick={handleRequestAlternative}
            disabled={isLoadingAlternative}
            className="flex-1 btn-secondary py-3 text-sm disabled:opacity-50"
          >
            {isLoadingAlternative ? '분석 중...' : '🔄 변경 필요'}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 btn-primary py-3 text-sm"
          >
            ✅ 실천 가능
          </button>
        </div>
      </div>
    </div>
  );
}

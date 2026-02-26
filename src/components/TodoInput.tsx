'use client';

import { useState } from 'react';
import type { TodoItem, Priority } from '@/types/profile';
import { TODO_DURATION_OPTIONS, PRIORITY_OPTIONS } from '@/types/profile';
import { createEmptyTodo } from '@/lib/templates';

interface TodoInputProps {
  todos: TodoItem[];
  onChange: (todos: TodoItem[]) => void;
  availableMinutes?: number;
}

export function TodoInput({ todos, onChange, availableMinutes }: TodoInputProps) {
  const totalDuration = todos.reduce((sum, todo) => sum + (todo.duration || 0), 0);
  const isOverflow = availableMinutes !== undefined && totalDuration > availableMinutes;

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
    onChange(todos.map(todo => todo.id === id ? { ...todo, ...updates } : todo));
  };

  const removeTodo = (id: string) => {
    if (todos.length > 1) {
      onChange(todos.filter(todo => todo.id !== id));
    } else {
      // 마지막 하나는 비우기만
      onChange([createEmptyTodo()]);
    }
  };

  const addTodo = () => {
    onChange([...todos, createEmptyTodo()]);
  };

  const toggleComplete = (id: string) => {
    updateTodo(id, { completed: !todos.find(t => t.id === id)?.completed });
  };

  return (
    <div className="flex flex-col gap-2">
      {todos.map((todo, index) => (
        <TodoItemRow
          key={todo.id}
          todo={todo}
          isFirst={index === 0}
          onUpdate={(updates) => updateTodo(todo.id, updates)}
          onRemove={() => removeTodo(todo.id)}
          onToggleComplete={() => toggleComplete(todo.id)}
        />
      ))}
      
      {/* 할 일 추가 버튼 */}
      <button
        type="button"
        onClick={addTodo}
        className="flex items-center justify-center gap-2 py-2 text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        할 일 추가
      </button>

      {/* 시간 요약 */}
      {availableMinutes !== undefined && (
        <div className={`text-xs ${isOverflow ? 'text-red-500' : 'text-[var(--muted)]'}`}>
          📊 예상: {formatDuration(totalDuration)} / 가용: {formatDuration(availableMinutes)}
          {isOverflow && ' ⚠️ 시간 초과'}
        </div>
      )}
    </div>
  );
}

interface TodoItemRowProps {
  todo: TodoItem;
  isFirst: boolean;
  onUpdate: (updates: Partial<TodoItem>) => void;
  onRemove: () => void;
  onToggleComplete: () => void;
}

function TodoItemRow({ todo, isFirst, onUpdate, onRemove, onToggleComplete }: TodoItemRowProps) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className={`group flex items-start gap-2 ${todo.completed ? 'opacity-50' : ''}`}>
      {/* 체크박스 */}
      <button
        type="button"
        onClick={onToggleComplete}
        className={`mt-2.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
          ${todo.completed
            ? 'border-[var(--primary)] bg-[var(--primary)]'
            : 'border-[var(--border)] hover:border-[var(--primary)]'
          }`}
      >
        {todo.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 입력 영역 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={todo.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={isFirst ? "할 일을 입력하세요..." : "추가 할 일..."}
            className={`flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] 
                       text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] 
                       focus:border-transparent placeholder:text-[var(--muted)]
                       ${todo.completed ? 'line-through' : ''}`}
          />
          
          {/* 옵션 토글 */}
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* 삭제 버튼 */}
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-[var(--muted)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 확장 옵션 (소요시간, 우선순위) */}
        {showOptions && (
          <div className="mt-2 flex items-center gap-3 pl-1">
            {/* 소요 시간 */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--muted)]">⏱️</span>
              <select
                value={todo.duration || ''}
                onChange={(e) => onUpdate({ duration: e.target.value ? Number(e.target.value) : undefined })}
                className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)]"
              >
                <option value="">시간 없음</option>
                {TODO_DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 우선순위 */}
            <div className="flex items-center gap-1">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdate({ priority: todo.priority === opt.value ? undefined : opt.value as Priority })}
                  className={`text-xs px-2 py-1 rounded transition-all
                    ${todo.priority === opt.value
                      ? 'bg-[var(--card)] border border-[var(--border)]'
                      : 'opacity-50 hover:opacity-100'
                    }`}
                >
                  {opt.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 인라인 태그 표시 */}
        {!showOptions && (todo.duration || todo.priority) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {todo.duration && (
              <span className="text-[var(--muted)]">⏱️ {formatDuration(todo.duration)}</span>
            )}
            {todo.priority && (
              <span>{PRIORITY_OPTIONS.find(p => p.value === todo.priority)?.label.split(' ')[0]}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

export { formatDuration };

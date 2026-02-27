'use client';

import type { TimeBlock, TodoItem } from '@/types/profile';
import { EXERCISE_TYPE_OPTIONS } from '@/types/profile';
import { TodoInput, formatDuration } from './TodoInput';
import { getBlockAvailableMinutes, isTimeOverflow } from '@/lib/templates';

interface TimeBlockCardProps {
  block: TimeBlock;
  onChange: (block: TimeBlock) => void;
  exerciseTypes?: string[];
}

export function TimeBlockCard({ block, onChange, exerciseTypes }: TimeBlockCardProps) {
  const isExercise = block.blockType === 'exercise';
  const availableMinutes = getBlockAvailableMinutes(block);
  const overflow = isTimeOverflow(block);

  const handleTodosChange = (todos: TodoItem[]) => {
    onChange({ ...block, todos });
  };

  const handleExerciseTypeChange = (type: string) => {
    onChange({ ...block, exerciseType: type });
  };

  const handleExercisePlanChange = (plan: string) => {
    onChange({ ...block, exercisePlan: plan });
  };

  // 고정 일정 (식사, 출퇴근, 취침 등)
  if (block.isFixed && block.blockType !== 'exercise') {
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--card)] border border-[var(--border)]/50">
        <div className="text-xl">{block.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{block.startTime}</span>
            <span className="font-medium text-sm">{block.label}</span>
          </div>
        </div>
        <span className="text-xs text-[var(--muted)]">{formatDuration(availableMinutes)}</span>
      </div>
    );
  }

  // 입력 가능한 시간 블록 (업무, 자유시간 등)
  return (
    <div className={`rounded-xl border overflow-hidden
      ${overflow 
        ? 'border-red-300 bg-red-50 dark:bg-red-950/20' 
        : isExercise
          ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
          : 'border-[var(--primary)]/30 bg-[var(--primary)]/5'
      }`}
    >
      {/* 헤더 */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b
        ${overflow 
          ? 'border-red-200 dark:border-red-800' 
          : isExercise
            ? 'border-green-200 dark:border-green-800'
            : 'border-[var(--primary)]/20'
        }`}
      >
        <div className="text-xl">{block.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{block.startTime}-{block.endTime}</span>
            <span className={`font-semibold text-sm
              ${isExercise ? 'text-green-700 dark:text-green-400' : 'text-[var(--primary)]'}
            `}>
              {block.label}
            </span>
          </div>
        </div>
        <div className="text-xs text-[var(--muted)]">
          {formatDuration(availableMinutes)}
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4">
        {isExercise ? (
          <ExerciseBlockContent
            block={block}
            exerciseTypes={exerciseTypes}
            onTypeChange={handleExerciseTypeChange}
            onPlanChange={handleExercisePlanChange}
          />
        ) : (
          <TodoInput
            todos={block.todos}
            onChange={handleTodosChange}
            availableMinutes={availableMinutes}
          />
        )}
      </div>
    </div>
  );
}

interface ExerciseBlockContentProps {
  block: TimeBlock;
  exerciseTypes?: string[];
  onTypeChange: (type: string) => void;
  onPlanChange: (plan: string) => void;
}

function ExerciseBlockContent({ block, exerciseTypes, onTypeChange, onPlanChange }: ExerciseBlockContentProps) {
  const types = exerciseTypes && exerciseTypes.length > 0 
    ? EXERCISE_TYPE_OPTIONS.filter(t => exerciseTypes.includes(t.value))
    : EXERCISE_TYPE_OPTIONS;

  return (
    <div className="flex flex-col gap-3">
      {/* 오늘의 운동 종류 선택 */}
      <div>
        <label className="text-xs text-[var(--muted)] mb-2 block">오늘의 운동</label>
        <div className="flex flex-wrap gap-2">
          {types.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onTypeChange(type.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all
                ${block.exerciseType === type.value
                  ? 'bg-green-500 text-white'
                  : 'bg-[var(--card)] border border-[var(--border)] hover:border-green-400'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 운동 세부 계획 */}
      <div>
        <label className="text-xs text-[var(--muted)] mb-2 block">세부 계획 (선택)</label>
        <textarea
          value={block.exercisePlan || ''}
          onChange={(e) => onPlanChange(e.target.value)}
          placeholder="예: 가슴/삼두, 스쿼트 5세트..."
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] 
                     text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 
                     focus:border-transparent placeholder:text-[var(--muted)]"
          rows={2}
        />
      </div>
    </div>
  );
}

// 타임라인 전체 컴포넌트
interface TimelineProps {
  blocks: TimeBlock[];
  onChange: (blocks: TimeBlock[]) => void;
  exerciseTypes?: string[];
}

export function Timeline({ blocks, onChange, exerciseTypes }: TimelineProps) {
  const handleBlockChange = (index: number, updatedBlock: TimeBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  };

  // 블록을 그룹으로 분류 (연속된 고정/입력 블록)
  const renderBlocks = () => {
    return blocks.map((block, index) => {
      const prevBlock = index > 0 ? blocks[index - 1] : null;
      const showGap = prevBlock && 
        parseInt(block.startTime.split(':')[0]) - parseInt(prevBlock.endTime?.split(':')[0] || prevBlock.startTime.split(':')[0]) > 1;

      return (
        <div key={block.id}>
          {showGap && <div className="h-4" />}
          <TimeBlockCard
            block={block}
            onChange={(updated) => handleBlockChange(index, updated)}
            exerciseTypes={exerciseTypes}
          />
        </div>
      );
    });
  };

  // 요약 통계
  const inputBlocks = blocks.filter(b => !b.isFixed || b.blockType === 'exercise');
  const fixedBlocks = blocks.filter(b => b.isFixed && b.blockType !== 'exercise');
  const totalTodos = inputBlocks.reduce((sum, b) => sum + b.todos.filter(t => t.text.trim()).length, 0);

  return (
    <div className="flex flex-col gap-2">
      {renderBlocks()}

      {/* 요약 */}
      <div className="flex gap-4 text-xs text-[var(--muted)] mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
          <span>입력 블록 ({inputBlocks.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--border)]" />
          <span>고정 일정 ({fixedBlocks.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <span>✅ 할 일 ({totalTodos})</span>
        </div>
      </div>
    </div>
  );
}

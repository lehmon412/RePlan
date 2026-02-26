import type { Priority, TimeBlock, TodoItem } from '@/types/profile';
import { getBlockAvailableMinutes, getTotalTodoDuration } from '@/lib/templates';

export interface InputTodo {
  text: string;
  duration?: number;
  priority?: Priority;
}

const PRIORITY_SCORE: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function normalizeTodo(todo: InputTodo, idx: number): TodoItem {
  return {
    id: `todo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    text: todo.text.trim(),
    duration: todo.duration ?? 30,
    priority: todo.priority ?? 'medium',
    completed: false,
  };
}

function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    const pa = a.priority ?? 'medium';
    const pb = b.priority ?? 'medium';
    const scoreDiff = PRIORITY_SCORE[pb] - PRIORITY_SCORE[pa];
    if (scoreDiff !== 0) return scoreDiff;
    return (b.duration ?? 0) - (a.duration ?? 0);
  });
}

function isSchedulableBlock(b: TimeBlock): boolean {
  // 운동/업무/자유시간 블록에 배치
  if (b.isFixed) return false;
  return b.blockType === 'work' || b.blockType === 'free' || b.blockType === 'exercise';
}

export function autoAssignTodosToBlocks(
  inputTodos: InputTodo[],
  blocks: TimeBlock[],
  condition: 'good' | 'normal' | 'bad'
) {
  const todos = sortTodos(inputTodos.map(normalizeTodo));

  // 조건이 안 좋으면 큰 작업(>=60)을 뒤로 미룸
  const adjustedTodos =
    condition === 'bad'
      ? [...todos].sort((a, b) => ((a.duration ?? 0) >= 60 ? 1 : 0) - ((b.duration ?? 0) >= 60 ? 1 : 0))
      : todos;

  const targetBlocks = blocks
    .filter(isSchedulableBlock)
    .map((b) => ({ ...b, todos: b.todos.filter((t) => t.text.trim()) })); // 빈 todo 제거

  // 시간순 정렬은 이미 되어있다고 가정하지만, 안전하게 정렬
  const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  targetBlocks.sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));

  const remaining: TodoItem[] = [];

  for (const todo of adjustedTodos) {
    let placed = false;

    // 높은 우선순위는 가능한 앞쪽(work)부터
    const preferred = todo.priority === 'high' || todo.priority === 'medium'
      ? targetBlocks
      : [...targetBlocks].reverse();

    for (const block of preferred) {
      const available = getBlockAvailableMinutes(block);
      const used = getTotalTodoDuration(block.todos);
      const need = todo.duration ?? 30;

      if (used + need <= available) {
        block.todos = [...block.todos, todo];
        placed = true;
        break;
      }
    }

    if (!placed) remaining.push(todo);
  }

  // 원본 blocks에 반영
  const updatedBlocks = blocks.map((b) => {
    const updated = targetBlocks.find((tb) => tb.id === b.id);
    return updated ? { ...b, todos: updated.todos } : b;
  });

  const advice =
    remaining.length === 0
      ? '모든 할 일을 시간 블록에 배치했어요. 무리하지 말고 진행해봐요.'
      : `시간이 부족해서 ${remaining.length}개 할 일을 아직 배치하지 못했어요. 우선순위가 낮은 일을 내일로 넘기는 걸 추천해요.`;

  return { updatedBlocks, remainingTodos: remaining, advice };
}

export function suggestAlternativeForBlock(
  block: TimeBlock,
  condition: 'good' | 'normal' | 'bad'
): { suggestion: string; modifiedTodos: InputTodo[] } {
  const available = getBlockAvailableMinutes(block);
  const todos = sortTodos(block.todos.filter((t) => t.text.trim()));

  // 컨디션이 안 좋으면 high만 남기고, duration이 큰 건 쪼개기 권장
  let candidates = todos;
  if (condition === 'bad') {
    candidates = todos.filter((t) => (t.priority ?? 'medium') === 'high');
    if (candidates.length === 0) candidates = todos.slice(0, 1);
  }

  const picked: InputTodo[] = [];
  let sum = 0;
  for (const t of candidates) {
    const d = t.duration ?? 30;
    if (sum + d <= available) {
      picked.push({ text: t.text, duration: d, priority: t.priority ?? 'medium' });
      sum += d;
    }
  }

  if (picked.length === 0 && candidates[0]) {
    // 최소 1개는 남기되, 시간이 부족하면 축소
    const t = candidates[0];
    const d = Math.min(t.duration ?? 30, available);
    picked.push({ text: `${t.text} (축소 버전)`, duration: d, priority: t.priority ?? 'medium' });
  }

  const suggestion =
    condition === 'bad'
      ? '컨디션이 안 좋아요. 가장 중요한 것만 남기고 나머지는 미루는 게 좋아요.'
      : '지금 상황에 맞게 할 일을 줄여서 더 실천 가능한 계획으로 바꿨어요.';

  return { suggestion, modifiedTodos: picked };
}


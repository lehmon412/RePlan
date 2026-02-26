'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimeBlock } from '@/types/profile';

export type NotifyTiming = 'on_time' | '5_min_before' | '10_min_before' | '15_min_before';

export interface TimerSettings {
  enabled: boolean;
  timing: NotifyTiming;
}

interface PendingNotification {
  blockId: string;
  block: TimeBlock;
  scheduledTime: Date;
  timerId: NodeJS.Timeout;
}

interface UsePlanTimerProps {
  timeBlocks: TimeBlock[];
  settings: TimerSettings;
  onNotify: (block: TimeBlock) => void;
}

// 시간 문자열을 오늘 날짜의 Date 객체로 변환
function timeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// 알림 타이밍에 따른 시간 조정 (분 단위)
function getTimingOffset(timing: NotifyTiming): number {
  switch (timing) {
    case 'on_time': return 0;
    case '5_min_before': return 5;
    case '10_min_before': return 10;
    case '15_min_before': return 15;
    default: return 0;
  }
}

export function usePlanTimer({ timeBlocks, settings, onNotify }: UsePlanTimerProps) {
  const [activeTimers, setActiveTimers] = useState<string[]>([]);
  const pendingNotifications = useRef<PendingNotification[]>([]);
  const notifiedBlocks = useRef<Set<string>>(new Set());

  // 모든 타이머 정리
  const clearAllTimers = useCallback(() => {
    pendingNotifications.current.forEach(({ timerId }) => {
      clearTimeout(timerId);
    });
    pendingNotifications.current = [];
    setActiveTimers([]);
  }, []);

  // 타이머 설정
  const scheduleNotifications = useCallback(() => {
    if (!settings.enabled) {
      clearAllTimers();
      return;
    }

    clearAllTimers();
    notifiedBlocks.current.clear();

    const now = new Date();
    const offset = getTimingOffset(settings.timing);

    timeBlocks.forEach((block) => {
      // 고정 일정이 아니고 할 일이 있는 블록만 알림
      if (block.isFixed || block.todos.length === 0) return;

      const blockStartTime = timeToDate(block.startTime);
      const notifyTime = new Date(blockStartTime.getTime() - offset * 60 * 1000);

      // 이미 지난 시간은 스킵
      if (notifyTime <= now) return;

      // 이미 알림한 블록은 스킵
      if (notifiedBlocks.current.has(block.id)) return;

      const delay = notifyTime.getTime() - now.getTime();

      const timerId = setTimeout(() => {
        notifiedBlocks.current.add(block.id);
        onNotify(block);
        
        // 완료된 타이머 제거
        setActiveTimers(prev => prev.filter(id => id !== block.id));
        pendingNotifications.current = pendingNotifications.current.filter(
          p => p.blockId !== block.id
        );
      }, delay);

      pendingNotifications.current.push({
        blockId: block.id,
        block,
        scheduledTime: notifyTime,
        timerId,
      });

      setActiveTimers(prev => [...prev, block.id]);
    });
  }, [timeBlocks, settings, onNotify, clearAllTimers]);

  // 설정 또는 블록 변경 시 타이머 재설정
  useEffect(() => {
    scheduleNotifications();
    return () => clearAllTimers();
  }, [scheduleNotifications, clearAllTimers]);

  // 다음 알림까지 남은 시간 계산
  const getNextNotification = useCallback(() => {
    const now = new Date();
    const upcoming = pendingNotifications.current
      .filter(p => p.scheduledTime > now)
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    
    return upcoming[0] || null;
  }, []);

  return {
    activeTimers,
    getNextNotification,
    clearAllTimers,
    reschedule: scheduleNotifications,
  };
}

// 알림 타이밍 옵션
export const NOTIFY_TIMING_OPTIONS: { label: string; value: NotifyTiming }[] = [
  { label: '정각에', value: 'on_time' },
  { label: '5분 전', value: '5_min_before' },
  { label: '10분 전', value: '10_min_before' },
  { label: '15분 전', value: '15_min_before' },
];

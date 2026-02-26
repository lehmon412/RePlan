'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getDailyPlan, saveDailyPlan as savePlanToDb } from '@/lib/supabase';
import type { DailyPlan, TimeBlock } from '@/types/profile';

const DAILY_PLANS_STORAGE_KEY = 'replan_daily_plans';

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useDailyPlan(selectedDate: Date) {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const dateString = formatDate(selectedDate);

  // 계획 불러오기
  useEffect(() => {
    async function loadPlan() {
      setIsLoading(true);
      
      if (session?.user?.email) {
        try {
          const data = await getDailyPlan(session.user.email, dateString);
          if (data) {
            setPlan(data as DailyPlan);
          } else {
            setPlan(null);
          }
        } catch (error) {
          console.error('Failed to load daily plan:', error);
          setPlan(null);
        }
      } else {
        // 로그인 안됐으면 localStorage에서
        const stored = localStorage.getItem(DAILY_PLANS_STORAGE_KEY);
        if (stored) {
          try {
            const plans = JSON.parse(stored);
            setPlan(plans[dateString] || null);
          } catch {
            setPlan(null);
          }
        }
      }
      
      setIsLoading(false);
    }

    loadPlan();
  }, [session, dateString]);

  // 계획 저장
  const savePlan = useCallback(async (planData: DailyPlan) => {
    setIsSaving(true);
    
    try {
      if (session?.user?.email) {
        await savePlanToDb(session.user.email, dateString, planData);
      } else {
        // localStorage 폴백
        const stored = localStorage.getItem(DAILY_PLANS_STORAGE_KEY);
        const plans = stored ? JSON.parse(stored) : {};
        plans[dateString] = planData;
        localStorage.setItem(DAILY_PLANS_STORAGE_KEY, JSON.stringify(plans));
      }
      
      setPlan(planData);
      return true;
    } catch (error) {
      console.error('Failed to save daily plan:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [session, dateString]);

  // 시간 블록만 업데이트
  const updateTimeBlocks = useCallback(async (timeBlocks: TimeBlock[]) => {
    if (plan) {
      const updatedPlan = { ...plan, timeBlocks };
      return savePlan(updatedPlan);
    }
    return false;
  }, [plan, savePlan]);

  return {
    plan,
    isLoading,
    isSaving,
    savePlan,
    updateTimeBlocks,
    hasPlan: plan !== null,
    dateString,
  };
}

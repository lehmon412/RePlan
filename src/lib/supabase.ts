import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabase 클라이언트 (환경변수 없으면 null)
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Supabase 연결 여부 확인
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// 프로필 관련 함수들
export async function getProfile(email: string) {
  if (!supabase) {
    console.warn('Supabase not configured, using localStorage fallback');
    return getProfileFromLocalStorage();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('profile_data')
    .eq('user_email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 프로필이 없는 경우
      return null;
    }
    console.error('Error fetching profile:', error);
    return null;
  }

  return data?.profile_data;
}

export async function saveProfile(email: string, profileData: unknown) {
  if (!supabase) {
    console.warn('Supabase not configured, using localStorage fallback');
    return saveProfileToLocalStorage(profileData);
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_email: email,
        profile_data: profileData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_email',
      }
    );

  if (error) {
    console.error('Error saving profile:', error);
    return false;
  }

  return true;
}

export async function deleteProfile(email: string) {
  if (!supabase) {
    console.warn('Supabase not configured, using localStorage fallback');
    return deleteProfileFromLocalStorage();
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('user_email', email);

  if (error) {
    console.error('Error deleting profile:', error);
    return false;
  }

  return true;
}

// ===== 일일 계획 관련 함수들 =====

export async function getDailyPlan(email: string, date: string) {
  if (!supabase) {
    console.warn('Supabase not configured, using localStorage fallback');
    return getDailyPlanFromLocalStorage(date);
  }

  const { data, error } = await supabase
    .from('daily_plans')
    .select('plan_data')
    .eq('user_email', email)
    .eq('plan_date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 계획이 없는 경우
    }
    console.error('Error fetching daily plan:', error);
    return null;
  }

  return data?.plan_data;
}

export async function saveDailyPlan(email: string, date: string, planData: unknown) {
  if (!supabase) {
    console.warn('Supabase not configured, using localStorage fallback');
    return saveDailyPlanToLocalStorage(date, planData);
  }

  const { error } = await supabase
    .from('daily_plans')
    .upsert(
      {
        user_email: email,
        plan_date: date,
        plan_data: planData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_email,plan_date',
      }
    );

  if (error) {
    console.error('Error saving daily plan:', error);
    return false;
  }

  return true;
}

export async function getDailyPlansList(email: string, startDate: string, endDate: string) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('daily_plans')
    .select('plan_date, plan_data')
    .eq('user_email', email)
    .gte('plan_date', startDate)
    .lte('plan_date', endDate)
    .order('plan_date', { ascending: true });

  if (error) {
    console.error('Error fetching daily plans list:', error);
    return [];
  }

  return data || [];
}

// localStorage 폴백 함수들 - 일일 계획
const DAILY_PLANS_STORAGE_KEY = 'replan_daily_plans';

function getDailyPlanFromLocalStorage(date: string) {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(DAILY_PLANS_STORAGE_KEY);
  if (stored) {
    try {
      const plans = JSON.parse(stored);
      return plans[date] || null;
    } catch {
      return null;
    }
  }
  return null;
}

function saveDailyPlanToLocalStorage(date: string, planData: unknown) {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(DAILY_PLANS_STORAGE_KEY);
    const plans = stored ? JSON.parse(stored) : {};
    plans[date] = planData;
    localStorage.setItem(DAILY_PLANS_STORAGE_KEY, JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}

// ===== 프로필 관련 localStorage 폴백 =====
const PROFILE_STORAGE_KEY = 'replan_user_profile';

function getProfileFromLocalStorage() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

function saveProfileToLocalStorage(profileData: unknown) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData));
    return true;
  } catch {
    return false;
  }
}

function deleteProfileFromLocalStorage() {
  if (typeof window === 'undefined') return false;
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  return true;
}

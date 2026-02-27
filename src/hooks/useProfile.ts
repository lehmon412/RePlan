'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  getProfile, 
  saveProfile as saveProfileToDb, 
  deleteProfile,
  isSupabaseConfigured 
} from '@/lib/supabase';
import type { UserProfile } from '@/types/profile';

const PROFILE_STORAGE_KEY = 'replan_user_profile';

export function useProfile() {
  const { data: session, status: sessionStatus } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 프로필 불러오기
  useEffect(() => {
    async function loadProfile() {
      if (sessionStatus === 'loading') return;
      
      let loaded = false;

      // Supabase 연결 시 서버에서 로드
      if (sessionStatus === 'authenticated' && session?.user?.email && isSupabaseConfigured()) {
        try {
          const data = await getProfile(session.user.email);
          if (data) {
            setProfile(data as UserProfile);
            loaded = true;
          }
        } catch (error) {
          console.error('Failed to load profile from server:', error);
        }
      }
      
      // Supabase에서 못 불러왔으면 localStorage에서 로드
      if (!loaded) {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
          try {
            setProfile(JSON.parse(stored));
          } catch {
            localStorage.removeItem(PROFILE_STORAGE_KEY);
          }
        }
      }
      
      setIsLoading(false);
    }

    loadProfile();
  }, [session, sessionStatus]);

  const saveProfile = useCallback(async (newProfile: UserProfile) => {
    // Supabase 연결 및 로그인 시 서버에 저장
    if (session?.user?.email && isSupabaseConfigured()) {
      const success = await saveProfileToDb(session.user.email, newProfile);
      if (success) {
        // Supabase 저장 성공 → localStorage에도 백업
        try {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
        } catch { /* ignore */ }
        setProfile(newProfile);
        return true;
      }
      // Supabase 저장 실패 → localStorage로 폴백
      console.warn('Supabase save failed, falling back to localStorage');
    }
    
    // 폴백: localStorage에 저장
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      return true;
    } catch {
      return false;
    }
  }, [session]);

  const clearProfile = useCallback(async () => {
    // Supabase 연결 및 로그인 시 서버에서 삭제
    if (session?.user?.email && isSupabaseConfigured()) {
      const success = await deleteProfile(session.user.email);
      if (success) {
        setProfile(null);
      }
      return success;
    }
    
    // 폴백: localStorage에서 삭제
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfile(null);
    return true;
  }, [session]);

  const hasProfile = profile !== null;

  return {
    profile,
    isLoading: isLoading || sessionStatus === 'loading',
    hasProfile,
    saveProfile,
    clearProfile,
  };
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const ProgressContext = createContext(null);

const todayStr = () => new Date().toISOString().split('T')[0];

export function ProgressProvider({ children }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState({ current: 0, lastPracticed: null, history: [] });

  useEffect(() => {
    if (!user) {
      setProgress({});
      setStreak({ current: 0, lastPracticed: null, history: [] });
      return;
    }

    if (user.id === '00000000-0000-0000-0000-000000000000') {
      const localProgress = localStorage.getItem('tarmac_guest_progress');
      const localStreak = localStorage.getItem('tarmac_guest_streak');
      setProgress(localProgress ? JSON.parse(localProgress) : {});
      setStreak(localStreak ? JSON.parse(localStreak) : { current: 3, lastPracticed: todayStr(), history: [todayStr()] });
      return;
    }

    const loadProgressAndStreak = async () => {
      try {
        // 1. Fetch user progress
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('question_id, status')
          .eq('user_id', user.id);

        if (progressError) throw progressError;

        const progressMap = {};
        progressData?.forEach(row => {
          progressMap[row.question_id] = row.status;
        });
        setProgress(progressMap);

        // 2. Fetch user profile for streak info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('streak_count, last_active_date, streak_history')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // If profile fetch fails or hasn't synced yet, fall back silently
          console.warn('Profile fetch warning (might not exist yet):', profileError.message);
          return;
        }

        if (profileData) {
          let history = [];
          if (profileData.streak_history) {
            try {
              history = typeof profileData.streak_history === 'string'
                ? JSON.parse(profileData.streak_history)
                : profileData.streak_history;
            } catch (e) {
              history = [];
            }
          }
          setStreak({
            current: profileData.streak_count || 0,
            lastPracticed: profileData.last_active_date || null,
            history: Array.isArray(history) ? history : [],
          });
        }
      } catch (err) {
        console.error('Error loading progress/streak:', err);
      }
    };

    loadProgressAndStreak();
  }, [user]);

  const updateStatus = useCallback(async (questionId, status) => {
    if (!user) return;

    // Local state optimistic update
    const newProgress = { ...progress, [questionId]: status };
    setProgress(newProgress);

    if (user.id === '00000000-0000-0000-0000-000000000000') {
      localStorage.setItem('tarmac_guest_progress', JSON.stringify(newProgress));
      
      const today = todayStr();
      let newStreak = { ...streak };
      const history = [...(streak.history || [])];
      
      if (!history.includes(today)) {
        history.push(today);
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const wasYesterday = streak.lastPracticed === yesterday;
        newStreak = {
          current: wasYesterday ? (streak.current || 0) + 1 : 1,
          lastPracticed: today,
          history: history.slice(-30),
        };
        setStreak(newStreak);
        localStorage.setItem('tarmac_guest_streak', JSON.stringify(newStreak));
      }
      return;
    }

    try {
      // 1. Sync to Supabase user_progress table
      const { error: progressError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          status: status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,question_id' });

      if (progressError) throw progressError;

      // 2. Streak logic calculation
      const today = todayStr();
      let newStreak = { ...streak };
      const history = [...(streak.history || [])];
      
      if (!history.includes(today)) {
        history.push(today);
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const wasYesterday = streak.lastPracticed === yesterday;
        newStreak = {
          current: wasYesterday ? (streak.current || 0) + 1 : 1,
          lastPracticed: today,
          history: history.slice(-30),
        };

        setStreak(newStreak);

        // 3. Sync streak to profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            streak_count: newStreak.current,
            last_active_date: newStreak.lastPracticed,
            streak_history: newStreak.history
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }
    } catch (err) {
      console.error('Failed to sync progress update to Supabase:', err);
    }
  }, [progress, streak, user]);

  const getStats = useCallback(() => {
    const total = Object.keys(progress).length;
    const practiced = Object.values(progress).filter(s => s === 'practiced').length;
    const confident = Object.values(progress).filter(s => s === 'confident').length;
    return { total, practiced, confident, notStarted: 50 - practiced - confident };
  }, [progress]);

  const getQuestionStatus = useCallback((questionId) => {
    return progress[questionId] || 'not_started';
  }, [progress]);

  const getLast7Days = useCallback(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      days.push({ date: d, practiced: (streak.history || []).includes(d) });
    }
    return days;
  }, [streak.history]);

  return (
    <ProgressContext.Provider value={{ progress, streak, updateStatus, getStats, getQuestionStatus, getLast7Days }}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
};

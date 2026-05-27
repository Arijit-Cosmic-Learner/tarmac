import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ProgressContext = createContext(null);

const getStorageKey = (userId) => `tarmac_progress_${userId}`;

const todayStr = () => new Date().toISOString().split('T')[0];

export function ProgressProvider({ children }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState({ current: 0, lastPracticed: null, history: [] });

  useEffect(() => {
    if (!user) { setProgress({}); setStreak({ current: 0, lastPracticed: null, history: [] }); return; }
    const key = getStorageKey(user.id);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProgress(parsed.progress || {});
        setStreak(parsed.streak || { current: 0, lastPracticed: null, history: [] });
      } catch { /* ignore */ }
    }
  }, [user]);

  const save = useCallback((newProgress, newStreak) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify({ progress: newProgress, streak: newStreak }));
  }, [user]);

  const updateStatus = useCallback((questionId, status) => {
    const newProgress = { ...progress, [questionId]: status };
    
    // Streak logic
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
    }

    setProgress(newProgress);
    setStreak(newStreak);
    save(newProgress, newStreak);
  }, [progress, streak, save]);

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

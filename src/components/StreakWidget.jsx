import { useProgress } from '../context/ProgressContext';
import { Flame } from 'lucide-react';
import './StreakWidget.css';

const MESSAGES = {
  0: "Start your streak today 🌱",
  1: "Day 1 — every expert was once a beginner.",
  2: "2 days strong. Keep it up.",
  3: "3-day streak! You're building momentum.",
  5: "5 days! You're making this a habit.",
  7: "7-day streak! One full week — you're serious about this.",
  14: "14 days! This is becoming second nature.",
  21: "21 days — neuroscience says this is a habit now. 🧠",
  30: "30 days. You're in the top 1% of prepared candidates. 🔥",
};

function getMessage(streak) {
  const keys = Object.keys(MESSAGES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (streak >= k) return MESSAGES[k];
  }
  return MESSAGES[0];
}

export default function StreakWidget() {
  const { streak, getLast7Days } = useProgress();
  const days7 = getLast7Days();
  const currentStreak = streak.current || 0;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="streak-widget">
      <div className="streak-header">
        <div className="streak-count">
          <Flame size={22} className={`flame-icon ${currentStreak > 0 ? 'active' : ''}`} />
          <span className="streak-number">{currentStreak}</span>
          <span className="streak-text">day streak</span>
        </div>
      </div>
      <div className="streak-days">
        {days7.map((day, i) => {
          const d = new Date(day.date + 'T00:00:00');
          return (
            <div key={day.date} className="streak-day">
              <div className={`streak-dot ${day.practiced ? 'filled' : ''}`} />
              <span className="streak-day-label">{dayNames[d.getDay()]}</span>
            </div>
          );
        })}
      </div>
      <p className="streak-message">{getMessage(currentStreak)}</p>
    </div>
  );
}

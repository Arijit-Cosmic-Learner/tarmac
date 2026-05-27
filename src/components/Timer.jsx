import { useState, useEffect, useRef } from 'react';
import './Timer.css';

export default function Timer({ onPhaseChange, onComplete }) {
  const PHASES = [
    { label: 'Think', duration: 120, color: '#60a5fa', desc: 'Organize your thoughts' },
    { label: 'Answer', duration: 180, color: '#34d399', desc: 'Speak or type your answer' },
  ];
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PHASES[0].duration);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const phase = PHASES[phaseIdx];

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          if (phaseIdx < PHASES.length - 1) {
            const nextIdx = phaseIdx + 1;
            setPhaseIdx(nextIdx);
            setTimeLeft(PHASES[nextIdx].duration);
            onPhaseChange?.(nextIdx);
          } else {
            setRunning(false);
            onComplete?.();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phaseIdx]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const pct = timeLeft / phase.duration;
  const r = 42; const circ = 2 * Math.PI * r;

  return (
    <div className="timer-wrap">
      <div className="timer-phases">
        {PHASES.map((p, i) => (
          <div key={i} className={`timer-phase-dot ${i === phaseIdx ? 'current' : ''} ${i < phaseIdx ? 'done' : ''}`}>
            <span>{p.label}</span>
          </div>
        ))}
      </div>
      <div className="timer-ring-wrap">
        <svg width={104} height={104} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={52} cy={52} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={8} />
          <circle cx={52} cy={52} r={r} fill="none" stroke={phase.color} strokeWidth={8}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="timer-center">
          <span className="timer-time" style={{ color: phase.color }}>{mins}:{secs}</span>
          <span className="timer-phase-label">{phase.label}</span>
        </div>
      </div>
      <p className="timer-desc">{phase.desc}</p>
      <div className="timer-controls">
        {!running ? (
          <button className="timer-btn start" onClick={() => setRunning(true)}>
            {timeLeft === phase.duration ? 'Start Timer' : 'Resume'}
          </button>
        ) : (
          <button className="timer-btn pause" onClick={() => setRunning(false)}>Pause</button>
        )}
        <button className="timer-btn reset" onClick={() => { setRunning(false); setPhaseIdx(0); setTimeLeft(PHASES[0].duration); }}>
          Reset
        </button>
      </div>
    </div>
  );
}

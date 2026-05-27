import './ProgressRing.css';

export default function ProgressRing({ practiced = 0, confident = 0, total = 50, size = 140 }) {
  const r = (size / 2) - 12;
  const circ = 2 * Math.PI * r;
  const practicedPct = total > 0 ? practiced / total : 0;
  const confidentPct = total > 0 ? confident / total : 0;
  const combinedPct = Math.min((practiced + confident) / total, 1);

  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--surface-3)" strokeWidth={10}
        />
        {/* Practiced arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--lime-400)"
          strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - practicedPct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease', opacity: 0.6 }}
        />
        {/* Confident arc — layered on top */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="#34d399"
          strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - confidentPct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="progress-ring-center">
        <span className="ring-pct">{Math.round(combinedPct * 100)}%</span>
        <span className="ring-label">Done</span>
      </div>
    </div>
  );
}

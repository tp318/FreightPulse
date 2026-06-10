/** RiskScoreBadge — Animated circular arc gauge showing a shipment's risk score (0–100) */
import { useState, useEffect, useRef } from 'react';

export default function RiskScoreBadge({ score = 0, size = 56 }) {
  const [displayScore, setDisplayScore] = useState(0);
  const prevScoreRef = useRef(0);
  const r = (size / 2) - 6;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  // Animate the score from previous value to new value
  useEffect(() => {
    const startVal = prevScoreRef.current;
    const endVal = Math.min(100, Math.max(0, score));
    const duration = 1500; // ms
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevScoreRef.current = endVal;
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  const getColor = (val) => {
    if (val <= 30) return 'var(--accent-green)';
    if (val <= 60) return 'var(--status-watch)';
    return 'var(--status-critical)';
  };

  const fraction = displayScore / 100;
  const dashOffset = circumference * (1 - fraction);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <defs>
        <linearGradient id={`riskGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-green)" />
          <stop offset="50%" stopColor="var(--status-watch)" />
          <stop offset="100%" stopColor="var(--status-critical)" />
        </linearGradient>
      </defs>

      {/* Background track */}
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="var(--border-accent)"
        strokeWidth="4"
      />

      {/* Score arc */}
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={getColor(displayScore)}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke 0.3s ease' }}
      />

      {/* Score number — rotated back to upright */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--text-primary)"
        fontSize={size * 0.28}
        fontFamily="var(--font-mono)"
        fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {displayScore}
      </text>
    </svg>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getScoreColor } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  label: string;
  countryFlag: string;
  countryName: string;
}

export default function ScoreGauge({
  score,
  label,
  countryFlag,
  countryName,
}: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const color = getScoreColor(score);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const offset = arc - (score / 100) * arc;

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [score]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center"
    >
      <div className="relative w-52 h-52">
        <svg
          className="w-full h-full -rotate-[135deg]"
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeDasharray={`${arc} ${circumference}`}
            strokeLinecap="round"
          />
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={`${arc} ${circumference}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: arc }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-bold"
            style={{ color }}
          >
            {displayScore}
          </span>
          <span className="text-text-light text-sm">/100</span>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className="text-lg font-semibold text-text-dark">{label}</p>
        <p className="text-sm text-text-muted flex items-center justify-center gap-1.5 mt-1">
          <span className="text-base">{countryFlag}</span>
          {countryName}
        </p>
      </div>
    </motion.div>
  );
}

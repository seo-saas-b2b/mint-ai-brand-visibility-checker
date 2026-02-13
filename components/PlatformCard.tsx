'use client';

import { motion } from 'motion/react';
import { getScoreColor } from '@/lib/utils';
import type { PlatformScore } from '@/lib/types';

interface PlatformCardProps {
  platform: PlatformScore;
  index: number;
}

const platformIcons: Record<string, string> = {
  googleAiOverview: '🔍',
  googleAiMode: '✨',
  chatgptSearch: '💬',
};

export default function PlatformCard({ platform, index }: PlatformCardProps) {
  const color = getScoreColor(platform.score);
  const mentionPercent = Math.round(
    (platform.mentionCount / platform.totalPrompts) * 100
  );

  const sentimentColor =
    platform.sentiment === 'positive'
      ? '#10b981'
      : platform.sentiment === 'negative'
        ? '#ef4444'
        : '#f59e0b';

  const sentimentLabel =
    platform.sentiment.charAt(0).toUpperCase() + platform.sentiment.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white border border-border rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">
          {platformIcons[platform.platformId] || '🤖'}
        </span>
        <div>
          <h3 className="font-semibold text-text-dark text-sm">
            {platform.platformName}
          </h3>
          <p className="text-xs text-text-light">
            {platform.mentionCount}/{platform.totalPrompts} prompts
          </p>
        </div>
        <span
          className="ml-auto text-2xl font-bold"
          style={{ color }}
        >
          {platform.score}
        </span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: '0%' }}
          animate={{ width: `${platform.score}%` }}
          transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold text-text-dark">{mentionPercent}%</p>
          <p className="text-xs text-text-light">Mention Rate</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-text-dark">
            {platform.avgPosition > 0 ? `#${platform.avgPosition}` : '—'}
          </p>
          <p className="text-xs text-text-light">Avg Position</p>
        </div>
        <div>
          <p className="text-lg font-semibold" style={{ color: sentimentColor }}>
            {sentimentLabel}
          </p>
          <p className="text-xs text-text-light">Sentiment</p>
        </div>
      </div>
    </motion.div>
  );
}

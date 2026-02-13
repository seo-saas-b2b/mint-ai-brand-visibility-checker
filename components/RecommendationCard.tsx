'use client';

import { motion } from 'motion/react';
import type { Recommendation } from '@/lib/types';

interface RecommendationListProps {
  recommendations: Recommendation[];
  isLocked: boolean;
  onUnlock: () => void;
}

const priorityStyles = {
  critical: {
    border: 'border-danger/30',
    bg: 'bg-danger/5',
    badge: 'bg-danger/10 text-danger',
    label: 'Critical',
  },
  important: {
    border: 'border-warning/30',
    bg: 'bg-warning/5',
    badge: 'bg-warning/10 text-warning',
    label: 'Important',
  },
  opportunity: {
    border: 'border-success/30',
    bg: 'bg-success/5',
    badge: 'bg-success/10 text-success',
    label: 'Opportunity',
  },
};

export default function RecommendationList({
  recommendations,
  isLocked,
  onUnlock,
}: RecommendationListProps) {
  if (isLocked) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
          AI Visibility Action Plan
        </h3>
        <div className="relative">
          <div className="space-y-3 blur-sm pointer-events-none">
            {recommendations.slice(0, 3).map((rec, i) => (
              <div
                key={i}
                className="bg-bg-light border border-border rounded-xl p-4"
              >
                <p className="text-sm text-text-dark font-medium">
                  {rec.icon} {rec.title}
                </p>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={onUnlock}
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Unlock Action Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
        Your AI Visibility Action Plan
      </h3>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const style = priorityStyles[rec.priority];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`border ${style.border} ${style.bg} rounded-xl p-4`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-text-dark">
                      {rec.title}
                    </h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}
                    >
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

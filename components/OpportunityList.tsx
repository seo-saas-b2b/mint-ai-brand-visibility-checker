'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { MissedOpportunity } from '@/lib/types';

interface OpportunityListProps {
  opportunities: MissedOpportunity[];
  isLocked: boolean;
  onUnlock: () => void;
}

const priorityColors = {
  high: { bg: 'bg-danger/10', text: 'text-danger', label: 'High' },
  medium: { bg: 'bg-warning/10', text: 'text-warning', label: 'Medium' },
  low: { bg: 'bg-primary/10', text: 'text-primary', label: 'Low' },
};

export default function OpportunityList({
  opportunities,
  isLocked,
  onUnlock,
}: OpportunityListProps) {
  const [showAll, setShowAll] = useState(false);

  if (opportunities.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
          Great News!
        </h3>
        <p className="text-text-muted text-sm">
          Your brand was mentioned in all queried prompts. No missed
          opportunities found!
        </p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
          Missed Opportunities
          <span className="text-sm font-normal text-danger">
            ({opportunities.length} found)
          </span>
        </h3>
        <div className="relative">
          <div className="space-y-2 blur-sm pointer-events-none">
            {opportunities.slice(0, 3).map((opp, i) => (
              <div
                key={i}
                className="bg-bg-light border border-border rounded-xl p-4"
              >
                <p className="text-sm text-text-dark">{opp.prompt}</p>
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
              See All Missed Opportunities
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visibleOpps = showAll ? opportunities : opportunities.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
        Missed Opportunities
        <span className="text-sm font-normal text-danger">
          ({opportunities.length} found)
        </span>
      </h3>

      <div className="space-y-2">
        {visibleOpps.map((opp, index) => {
          const priority = priorityColors[opp.priority];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-bg-light border border-border rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-dark">{opp.prompt}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${priority.bg} ${priority.text} flex-shrink-0`}
                >
                  {priority.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!showAll && opportunities.length > 5 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm text-primary hover:text-primary-dark transition-colors"
        >
          + Show {opportunities.length - 5} more
        </button>
      )}
    </motion.div>
  );
}

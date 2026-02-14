'use client';

import { motion } from 'motion/react';

type Phase = 'idle' | 'generating-prompts' | 'google-overview' | 'google-mode' | 'chatgpt' | 'done';

interface LoadingAnimationProps {
  brandName: string;
  phase: Phase;
  isComplete: boolean;
}

const steps: { key: Phase; label: string }[] = [
  { key: 'generating-prompts', label: 'Generating search prompts...' },
  { key: 'google-overview', label: 'Scanning Google AI Overview...' },
  { key: 'google-mode', label: 'Analyzing Google AI Mode...' },
  { key: 'chatgpt', label: 'Checking ChatGPT Search...' },
];

const phaseOrder: Phase[] = ['generating-prompts', 'google-overview', 'google-mode', 'chatgpt', 'done'];

function getPhaseIndex(phase: Phase): number {
  return phaseOrder.indexOf(phase);
}

export default function LoadingAnimation({ brandName, phase, isComplete }: LoadingAnimationProps) {
  const currentIdx = getPhaseIndex(phase);
  const progress = isComplete ? 100 : Math.min(95, (currentIdx / 4) * 100);

  if (isComplete) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4"
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-success flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-dark">
            Analysis Complete
          </h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6"
      >
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary flex items-center justify-center">
          <motion.svg
            className="w-7 h-7 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </motion.svg>
        </div>
        <h2 className="text-lg font-semibold text-text-dark mb-1">
          Analyzing &ldquo;{brandName}&rdquo;
        </h2>
      </motion.div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2 text-left">
        {steps.map((s, index) => {
          const stepIdx = getPhaseIndex(s.key);
          const isCompleted = currentIdx > stepIdx;
          const isCurrent = currentIdx === stepIdx;

          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: index <= currentIdx ? 1 : 0.35, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex items-center gap-2.5"
            >
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              ) : isCurrent ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${isCompleted || isCurrent ? 'text-text-dark' : 'text-text-light'}`}>
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

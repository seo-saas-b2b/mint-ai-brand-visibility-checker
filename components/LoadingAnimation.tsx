'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingAnimationProps {
  brandName: string;
}

const steps = [
  { label: 'Generating industry-specific prompts...', duration: 1500 },
  { label: 'Scanning Google AI Overviews...', duration: 2500 },
  { label: 'Analyzing Google AI Mode results...', duration: 2500 },
  { label: 'Checking ChatGPT Search visibility...', duration: 2500 },
  { label: 'Calculating visibility scores...', duration: 1500 },
  { label: 'Generating your visibility report...', duration: 1500 },
];

export default function LoadingAnimation({ brandName }: LoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    function advance(step: number) {
      if (step < steps.length - 1) {
        timeout = setTimeout(() => {
          setCurrentStep(step + 1);
          advance(step + 1);
        }, steps[step].duration);
      }
    }

    advance(0);
    return () => clearTimeout(timeout);
  }, []);

  const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
  const elapsedDuration = steps
    .slice(0, currentStep)
    .reduce((sum, s) => sum + s.duration, 0);
  const progress = Math.min(
    ((elapsedDuration + steps[currentStep].duration * 0.5) / totalDuration) * 100,
    95
  );

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center">
          <motion.svg
            className="w-10 h-10 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </motion.svg>
        </div>
        <h2 className="text-xl font-semibold text-text-dark mb-1">
          Analyzing &ldquo;{brandName}&rdquo;
        </h2>
        <p className="text-text-muted text-sm">
          Querying AI platforms in real-time...
        </p>
      </motion.div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3 text-left">
        <AnimatePresence>
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: index <= currentStep ? 1 : 0.3,
                x: 0,
              }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              {index < currentStep ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-success flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              ) : index === currentStep ? (
                <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-gray-300 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  index <= currentStep ? 'text-text-dark' : 'text-text-light'
                }`}
              >
                {step.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

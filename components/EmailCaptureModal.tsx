'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface EmailCaptureModalProps {
  isOpen: boolean;
  brandName: string;
  onClose: () => void;
  onSubmit: (email: string) => void;
}

export default function EmailCaptureModal({
  isOpen,
  brandName,
  onClose,
  onSubmit,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Store lead in localStorage
    const leads = JSON.parse(localStorage.getItem('aibvc_leads') || '[]');
    leads.push({
      email: email.trim(),
      brandName,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('aibvc_leads', JSON.stringify(leads));
    localStorage.setItem('aibvc_email', email.trim());

    setSubmitted(true);
    setTimeout(() => {
      onSubmit(email.trim());
    }, 1500);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white border border-border rounded-2xl p-6 md:p-8 shadow-xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-light hover:text-text-dark transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {!submitted ? (
              <>
                {/* Icon */}
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h2 className="text-xl font-bold text-text-dark text-center mb-2">
                  See the Full Report by Email
                </h2>
                <p className="text-sm text-text-muted text-center mb-6">
                  Get the complete analysis with all sources, missed
                  opportunities, and your personalized action plan.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 bg-bg-light border border-border rounded-xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      autoFocus
                    />
                    {error && (
                      <p className="mt-1 text-sm text-danger">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark hover:shadow-lg transition-all"
                  >
                    Get Full Report
                  </button>
                </form>

                <p className="text-xs text-text-light text-center mt-4">
                  No spam, ever. Unsubscribe anytime.
                </p>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-success flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h2 className="text-xl font-bold text-text-dark mb-2">
                  Report Unlocked!
                </h2>
                <p className="text-sm text-text-muted">
                  Loading your complete analysis...
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

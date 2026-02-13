'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import BrandInputForm from '@/components/BrandInputForm';
import LoadingAnimation from '@/components/LoadingAnimation';
import ResultsDashboard from '@/components/ResultsDashboard';
import type { BrandInput, AnalysisResult } from '@/lib/types';

type Step = 'input' | 'loading' | 'results';

function HomeContent() {
  const searchParams = useSearchParams();
  const showCta = searchParams.get('cta') === 'true';

  const [step, setStep] = useState<Step>('input');
  const [formData, setFormData] = useState<BrandInput | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('aibvc_email');
    if (saved) setEmailCaptured(true);
  }, []);

  const runAnalysis = useCallback(async (data: BrandInput) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const result: AnalysisResult = await res.json();
      setResults(result);
      setStep('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
      setStep('input');
    }
  }, []);

  function handleSubmit(data: BrandInput) {
    setFormData(data);
    setError(null);
    setStep('loading');
    runAnalysis(data);
  }

  function handleNewAnalysis() {
    setStep('input');
    setResults(null);
    setFormData(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8 md:mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-text-dark mb-3 leading-tight">
                  AI Brand Visibility Checker
                </h1>
                <p className="text-text-muted text-base md:text-lg max-w-2xl mx-auto">
                  See how AI search engines perceive your brand across Google
                  AI Overview, AI Mode &amp; ChatGPT Search.
                </p>
              </div>

              <BrandInputForm onSubmit={handleSubmit} />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-2xl mx-auto mt-4"
                >
                  <div className="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'loading' && formData && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="py-12"
            >
              <LoadingAnimation brandName={formData.brandName} />
            </motion.div>
          )}

          {step === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ResultsDashboard
                results={results}
                emailCaptured={emailCaptured}
                onEmailCaptured={() => setEmailCaptured(true)}
                onNewAnalysis={handleNewAnalysis}
                showCta={showCta}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <HomeContent />
    </Suspense>
  );
}

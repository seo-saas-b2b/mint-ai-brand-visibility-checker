'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ScoreGauge from './ScoreGauge';
import PlatformCard from './PlatformCard';
import PromptResults from './PromptResults';
import OpportunityList from './OpportunityList';
import RecommendationList from './RecommendationCard';
import EmailCaptureModal from './EmailCaptureModal';
import type { AnalysisResult } from '@/lib/types';

interface LoadingPlatforms {
  googleAiOverview: boolean;
  googleAiMode: boolean;
  chatgptSearch: boolean;
}

interface ResultsDashboardProps {
  results: AnalysisResult;
  emailCaptured: boolean;
  onEmailCaptured: () => void;
  onNewAnalysis: () => void;
  showCta: boolean;
  loadingPlatforms?: LoadingPlatforms;
  isComplete?: boolean;
}

const platformOrder = ['googleAiOverview', 'googleAiMode', 'chatgptSearch'] as const;

export default function ResultsDashboard({
  results,
  emailCaptured,
  onEmailCaptured,
  onNewAnalysis,
  showCta,
  loadingPlatforms = { googleAiOverview: false, googleAiMode: false, chatgptSearch: false },
  isComplete = true,
}: ResultsDashboardProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const isLocked = showCta && !emailCaptured;

  function handleUnlock() {
    setShowEmailModal(true);
  }

  function handleEmailSubmit() {
    setShowEmailModal(false);
    onEmailCaptured();
  }

  const hasAnyPlatform = results.platforms.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Overall Score — show partial or final */}
      {hasAnyPlatform && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ScoreGauge
            score={results.overallScore}
            label={isComplete ? results.scoreLabel : 'Analyzing...'}
            countryFlag={results.countryFlag}
            countryName={results.countryName}
          />
          <p className="text-text-muted text-sm mt-4">
            Analysis for <span className="text-text-dark font-medium">{results.brandName}</span>
            {' '}in <span className="text-text-dark font-medium">{results.industry}</span>
          </p>
        </motion.section>
      )}

      {/* Platform Cards — show loaded + loading skeletons */}
      <section>
        <h3 className="text-lg font-semibold text-text-dark mb-4">
          Platform-by-Platform Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platformOrder.map((pid, index) => {
            const platform = results.platforms.find((p) => p.platformId === pid);
            const isLoading = loadingPlatforms[pid];

            if (platform) {
              return (
                <motion.div
                  key={pid}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlatformCard platform={platform} index={index} />
                </motion.div>
              );
            }

            if (isLoading) {
              return (
                <PlatformCardSkeleton key={pid} platformId={pid} />
              );
            }

            // Platform failed — show empty card
            return (
              <PlatformCardSkeleton key={pid} platformId={pid} failed />
            );
          })}
        </div>
      </section>

      {/* Prompt Results — show as data arrives */}
      <AnimatePresence>
        {hasAnyPlatform && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-light border border-border rounded-2xl p-5 md:p-6"
          >
            <PromptResults
              prompts={results.promptResults}
              isLocked={isLocked}
              onUnlock={handleUnlock}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Missed Opportunities — only when complete */}
      <AnimatePresence>
        {isComplete && results.missedOpportunities.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-light border border-border rounded-2xl p-5 md:p-6"
          >
            <OpportunityList
              opportunities={results.missedOpportunities}
              isLocked={isLocked}
              onUnlock={handleUnlock}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Recommendations — only when complete */}
      <AnimatePresence>
        {isComplete && results.recommendations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-light border border-border rounded-2xl p-5 md:p-6"
          >
            <RecommendationList
              recommendations={results.recommendations}
              isLocked={isLocked}
              onUnlock={handleUnlock}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* CTA Section */}
      {isComplete && showCta && !emailCaptured && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 text-center"
        >
          <h3 className="text-xl font-bold text-text-dark mb-2">
            Want the Full Picture?
          </h3>
          <p className="text-text-muted text-sm mb-4 max-w-md mx-auto">
            See the full report with all sources, missed opportunities, and your
            personalized action plan.
          </p>
          <button
            onClick={handleUnlock}
            className="px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark hover:shadow-lg transition-all"
          >
            See Full Report by Email
          </button>
        </motion.section>
      )}

      {/* New Analysis Button */}
      <div className="text-center pt-4 pb-8">
        <button
          onClick={onNewAnalysis}
          className="text-sm text-text-muted hover:text-primary transition-colors underline underline-offset-4"
        >
          Run another analysis
        </button>
      </div>

      {/* Email Modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        brandName={results.brandName}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailSubmit}
      />
    </div>
  );
}

// Skeleton loading card for platforms not yet loaded
function PlatformCardSkeleton({
  platformId,
  failed = false,
}: {
  platformId: string;
  failed?: boolean;
}) {
  const names: Record<string, string> = {
    googleAiOverview: 'Google AI Overview',
    googleAiMode: 'Google AI Mode',
    chatgptSearch: 'ChatGPT Search',
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="text-sm font-medium text-text-dark mb-3">
        {names[platformId] || platformId}
      </div>
      {failed ? (
        <p className="text-xs text-text-light">No data available</p>
      ) : (
        <div className="space-y-2 animate-pulse">
          <div className="h-10 w-16 bg-gray-200 rounded-lg" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      )}
    </div>
  );
}

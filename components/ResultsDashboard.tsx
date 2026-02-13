'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import ScoreGauge from './ScoreGauge';
import PlatformCard from './PlatformCard';
import PromptResults from './PromptResults';
import OpportunityList from './OpportunityList';
import RecommendationList from './RecommendationCard';
import EmailCaptureModal from './EmailCaptureModal';
import type { AnalysisResult } from '@/lib/types';

interface ResultsDashboardProps {
  results: AnalysisResult;
  emailCaptured: boolean;
  onEmailCaptured: () => void;
  onNewAnalysis: () => void;
  showCta: boolean;
}

export default function ResultsDashboard({
  results,
  emailCaptured,
  onEmailCaptured,
  onNewAnalysis,
  showCta,
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Overall Score */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <ScoreGauge
          score={results.overallScore}
          label={results.scoreLabel}
          countryFlag={results.countryFlag}
          countryName={results.countryName}
        />
        <p className="text-text-muted text-sm mt-4">
          Analysis for <span className="text-text-dark font-medium">{results.brandName}</span>
          {' '}in <span className="text-text-dark font-medium">{results.industry}</span>
        </p>
      </motion.section>

      {/* Platform Cards */}
      <section>
        <h3 className="text-lg font-semibold text-text-dark mb-4">
          Platform-by-Platform Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.platforms.map((platform, index) => (
            <PlatformCard
              key={platform.platformId}
              platform={platform}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* Prompt Results with expandable citations */}
      <section className="bg-bg-light border border-border rounded-2xl p-5 md:p-6">
        <PromptResults
          prompts={results.promptResults}
          isLocked={isLocked}
          onUnlock={handleUnlock}
        />
      </section>

      {/* Missed Opportunities (gated if CTA enabled) */}
      <section className="bg-bg-light border border-border rounded-2xl p-5 md:p-6">
        <OpportunityList
          opportunities={results.missedOpportunities}
          isLocked={isLocked}
          onUnlock={handleUnlock}
        />
      </section>

      {/* Recommendations (gated if CTA enabled) */}
      <section className="bg-bg-light border border-border rounded-2xl p-5 md:p-6">
        <RecommendationList
          recommendations={results.recommendations}
          isLocked={isLocked}
          onUnlock={handleUnlock}
        />
      </section>

      {/* CTA Section - only if ?cta=true and email not captured */}
      {showCta && !emailCaptured && (
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

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import BrandInputForm from '@/components/BrandInputForm';
import LoadingAnimation from '@/components/LoadingAnimation';
import ResultsDashboard from '@/components/ResultsDashboard';
import type {
  BrandInput,
  PlatformBatchResponse,
  PromptPlatformResult,
  PromptResult,
  PlatformScore,
  MissedOpportunity,
  Recommendation,
} from '@/lib/types';
import { getScoreLabel, getPlatformName, computePlatformScore } from '@/lib/utils';

type Phase = 'idle' | 'generating-prompts' | 'google-overview' | 'google-mode' | 'chatgpt' | 'done';

interface ProgressiveState {
  phase: Phase;
  brandName: string;
  industry: string;
  countryName: string;
  countryFlag: string;
  prompts: string[];
  platformData: {
    googleAiOverview?: PlatformBatchResponse;
    googleAiMode?: PlatformBatchResponse;
    chatgptSearch?: PlatformBatchResponse;
  };
}

const emptyPlatformResult: PromptPlatformResult = {
  mentioned: false,
  position: null,
  sentiment: null,
  snippet: '',
  fullResponse: '',
};

function buildPartialResults(state: ProgressiveState) {
  const { prompts, platformData, brandName, industry, countryName, countryFlag } = state;
  if (!prompts.length) return null;

  const platformIds = ['googleAiOverview', 'googleAiMode', 'chatgptSearch'] as const;

  // Build prompt results from whatever platform data we have
  const promptResults: PromptResult[] = prompts.map((prompt, i) => {
    const key = `query_${i + 1}`;
    const platforms: PromptResult['platforms'] = {
      googleAiOverview: { ...emptyPlatformResult },
      googleAiMode: { ...emptyPlatformResult },
      chatgptSearch: { ...emptyPlatformResult },
    };

    for (const pid of platformIds) {
      const data = platformData[pid];
      if (data) {
        const analysis = data.analysis[key];
        const fullResponse = data.fullResponses[key] || '';
        if (analysis) {
          platforms[pid] = {
            mentioned: analysis.mentioned,
            position: analysis.mentioned ? analysis.position : null,
            sentiment: analysis.mentioned ? (analysis.sentiment as 'positive' | 'neutral' | 'negative') : null,
            snippet: analysis.snippet || '',
            fullResponse,
          };
        } else {
          platforms[pid] = { ...emptyPlatformResult, fullResponse };
        }
      }
    }

    return { prompt, platforms };
  });

  // Build platform scores for loaded platforms only
  const platformScores: PlatformScore[] = [];
  for (const pid of platformIds) {
    if (!platformData[pid]) continue;
    const mentions = promptResults.filter((pr) => pr.platforms[pid].mentioned);
    const mentionCount = mentions.length;
    const totalPrompts = promptResults.length;
    const positions = mentions
      .map((m) => m.platforms[pid].position)
      .filter((p): p is number => p !== null);
    const avgPosition =
      positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;
    const sentiments = mentions.map((m) => m.platforms[pid].sentiment);
    const positiveRate =
      sentiments.filter((s) => s === 'positive').length / Math.max(1, sentiments.length);
    const negativeRate =
      sentiments.filter((s) => s === 'negative').length / Math.max(1, sentiments.length);
    const dominantSentiment: 'positive' | 'neutral' | 'negative' =
      positiveRate > 0.5 ? 'positive' : negativeRate > 0.3 ? 'negative' : 'neutral';

    platformScores.push({
      platformId: pid,
      platformName: getPlatformName(pid),
      score: computePlatformScore(mentionCount, totalPrompts, avgPosition, positiveRate),
      mentionCount,
      totalPrompts,
      sentiment: dominantSentiment,
      avgPosition: Math.round(avgPosition * 10) / 10,
    });
  }

  // Overall score (only if all 3 loaded)
  let overallScore = 0;
  if (platformScores.length === 3) {
    const overview = platformScores.find((p) => p.platformId === 'googleAiOverview')!;
    const mode = platformScores.find((p) => p.platformId === 'googleAiMode')!;
    const chatgpt = platformScores.find((p) => p.platformId === 'chatgptSearch')!;
    overallScore = Math.round(overview.score * 0.4 + mode.score * 0.3 + chatgpt.score * 0.3);
  } else if (platformScores.length > 0) {
    overallScore = Math.round(
      platformScores.reduce((s, p) => s + p.score, 0) / platformScores.length
    );
  }

  // Missed opportunities + recommendations only when all done
  let missedOpportunities: MissedOpportunity[] = [];
  let recommendations: Recommendation[] = [];

  if (state.phase === 'done') {
    missedOpportunities = promptResults
      .filter(
        (pr) =>
          !pr.platforms.googleAiOverview.mentioned &&
          !pr.platforms.googleAiMode.mentioned &&
          !pr.platforms.chatgptSearch.mentioned
      )
      .map((pr, idx) => ({
        prompt: pr.prompt,
        priority: idx < 2 ? ('high' as const) : idx < 4 ? ('medium' as const) : ('low' as const),
      }));

    recommendations = generateRecommendations(brandName, platformScores, missedOpportunities);
  }

  return {
    brandName,
    industry,
    country: '',
    countryName,
    countryFlag,
    overallScore,
    scoreLabel: getScoreLabel(overallScore),
    platforms: platformScores,
    promptResults,
    missedOpportunities,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

function generateRecommendations(
  brandName: string,
  platforms: PlatformScore[],
  missedOpportunities: MissedOpportunity[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  const totalMentions = platforms.reduce((s, p) => s + p.mentionCount, 0);
  const totalPrompts = platforms.reduce((s, p) => s + p.totalPrompts, 0);
  const overallMentionRate = totalMentions / Math.max(1, totalPrompts);
  const weakestPlatform = platforms.reduce((min, p) => (p.score < min.score ? p : min));

  if (overallMentionRate < 0.3) {
    recs.push({
      title: 'Build Brand Authority Signals',
      description: `${brandName} appears in less than 30% of relevant AI queries. Focus on building authoritative content, earning mentions in industry publications, and creating comprehensive resources that AI models can reference.`,
      priority: 'critical',
      icon: '🔴',
    });
  }

  if (missedOpportunities.length > 3) {
    recs.push({
      title: 'Create Comparison Content',
      description: `You're missing from ${missedOpportunities.length} prompts where you could appear. Create detailed comparison pages, "vs" content, and alternative guides to increase your visibility.`,
      priority: 'critical',
      icon: '🔴',
    });
  }

  if (weakestPlatform.score < 40) {
    recs.push({
      title: `Improve ${getPlatformName(weakestPlatform.platformId)} Presence`,
      description: `Your weakest platform is ${getPlatformName(weakestPlatform.platformId)} with a score of ${weakestPlatform.score}. Focus on structured data, FAQ content, and authoritative backlinks.`,
      priority: 'important',
      icon: '🟡',
    });
  }

  if (platforms.some((p) => p.sentiment === 'negative')) {
    recs.push({
      title: 'Address Negative Brand Perception',
      description: 'AI models are reflecting some negative sentiment about your brand. Review and respond to negative reviews, create positive case studies.',
      priority: 'important',
      icon: '🟡',
    });
  }

  recs.push({
    title: 'Optimize for Conversational Queries',
    description: 'AI search engines favor content that directly answers questions. Create comprehensive FAQ pages, how-to guides, and product comparisons.',
    priority: 'important',
    icon: '🟡',
  });

  recs.push({
    title: 'Get Featured in Industry Roundups',
    description: 'AI results frequently pull from listicle-style articles. Pursue inclusion in "best of" lists, industry awards, and expert recommendations.',
    priority: 'opportunity',
    icon: '🟢',
  });

  return recs.slice(0, 7);
}

function HomeContent() {
  const searchParams = useSearchParams();
  const showCta = searchParams.get('cta') === 'true';

  const [step, setStep] = useState<'input' | 'analyzing' | 'done'>('input');
  const [error, setError] = useState<string | null>(null);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const abortRef = useRef(false);

  const [state, setState] = useState<ProgressiveState>({
    phase: 'idle',
    brandName: '',
    industry: '',
    countryName: '',
    countryFlag: '',
    prompts: [],
    platformData: {},
  });

  useEffect(() => {
    const saved = localStorage.getItem('aibvc_email');
    if (saved) setEmailCaptured(true);
  }, []);

  const runAnalysis = useCallback(async (data: BrandInput) => {
    abortRef.current = false;

    try {
      // Step 1: Generate prompts
      setState((s) => ({ ...s, phase: 'generating-prompts' }));

      const promptsRes = await fetch('/api/analyze/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!promptsRes.ok) {
        const err = await promptsRes.json();
        throw new Error(err.error || 'Failed to generate prompts');
      }

      const promptsData = await promptsRes.json();
      if (abortRef.current) return;

      setState((s) => ({
        ...s,
        brandName: promptsData.brandName,
        industry: promptsData.industry,
        countryName: promptsData.countryName,
        countryFlag: promptsData.countryFlag,
        prompts: promptsData.prompts,
        phase: 'google-overview',
      }));
      setStep('analyzing');

      // Step 2: Google AI Overview
      const overviewRes = await fetch('/api/analyze/google-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: promptsData.prompts, brandName: data.brandName }),
      });

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        if (abortRef.current) return;
        setState((s) => ({
          ...s,
          platformData: { ...s.platformData, googleAiOverview: overviewData },
          phase: 'google-mode',
        }));
      } else {
        setState((s) => ({ ...s, phase: 'google-mode' }));
      }

      // Step 3: Google AI Mode
      const modeRes = await fetch('/api/analyze/google-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: promptsData.prompts, brandName: data.brandName }),
      });

      if (modeRes.ok) {
        const modeData = await modeRes.json();
        if (abortRef.current) return;
        setState((s) => ({
          ...s,
          platformData: { ...s.platformData, googleAiMode: modeData },
          phase: 'chatgpt',
        }));
      } else {
        setState((s) => ({ ...s, phase: 'chatgpt' }));
      }

      // Step 4: ChatGPT Search
      const chatgptRes = await fetch('/api/analyze/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: promptsData.prompts, brandName: data.brandName }),
      });

      if (chatgptRes.ok) {
        const chatgptData = await chatgptRes.json();
        if (abortRef.current) return;
        setState((s) => ({
          ...s,
          platformData: { ...s.platformData, chatgptSearch: chatgptData },
          phase: 'done',
        }));
      } else {
        setState((s) => ({ ...s, phase: 'done' }));
      }

      setStep('done');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('input');
    }
  }, []);

  function handleSubmit(data: BrandInput) {
    setError(null);
    setState({
      phase: 'generating-prompts',
      brandName: data.brandName,
      industry: '',
      countryName: '',
      countryFlag: '',
      prompts: [],
      platformData: {},
    });
    setStep('analyzing');
    runAnalysis(data);
  }

  function handleNewAnalysis() {
    abortRef.current = true;
    setStep('input');
    setError(null);
    setState({
      phase: 'idle',
      brandName: '',
      industry: '',
      countryName: '',
      countryFlag: '',
      prompts: [],
      platformData: {},
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const partialResults = buildPartialResults(state);
  const isAnalyzing = step === 'analyzing' || step === 'done';

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

          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Progress indicator at top */}
              <LoadingAnimation
                brandName={state.brandName}
                phase={state.phase}
                isComplete={state.phase === 'done'}
              />

              {/* Progressive results below */}
              {partialResults && state.prompts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="mt-8"
                >
                  <ResultsDashboard
                    results={partialResults}
                    emailCaptured={emailCaptured}
                    onEmailCaptured={() => setEmailCaptured(true)}
                    onNewAnalysis={handleNewAnalysis}
                    showCta={showCta}
                    loadingPlatforms={{
                      googleAiOverview: !state.platformData.googleAiOverview && state.phase !== 'done',
                      googleAiMode: !state.platformData.googleAiMode && state.phase !== 'done',
                      chatgptSearch: !state.platformData.chatgptSearch && state.phase !== 'done',
                    }}
                    isComplete={state.phase === 'done'}
                  />
                </motion.div>
              )}
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

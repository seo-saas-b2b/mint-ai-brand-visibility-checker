'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PromptResult } from '@/lib/types';

interface PromptResultsProps {
  prompts: PromptResult[];
  isLocked: boolean;
  onUnlock: () => void;
}

const platformLabels: Record<string, { name: string; icon: string }> = {
  googleAiOverview: { name: 'Google AI Overview', icon: '🔍' },
  googleAiMode: { name: 'Google AI Mode', icon: '✨' },
  chatgptSearch: { name: 'ChatGPT Search', icon: '💬' },
};

export default function PromptResults({
  prompts,
  isLocked,
  onUnlock,
}: PromptResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const mentionedPrompts = prompts.filter(
    (p) =>
      p.platforms.googleAiOverview.mentioned ||
      p.platforms.googleAiMode.mentioned ||
      p.platforms.chatgptSearch.mentioned
  );

  // Show only top 3 when locked
  const visiblePrompts = isLocked
    ? mentionedPrompts.slice(0, 3)
    : mentionedPrompts;
  const hiddenCount = mentionedPrompts.length - 3;

  return (
    <div>
      <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center gap-2">
        Where Your Brand Appears
        <span className="text-sm font-normal text-text-muted">
          ({mentionedPrompts.length} prompts)
        </span>
      </h3>

      <div className="space-y-2">
        {visiblePrompts.map((prompt, index) => {
          const platforms = Object.entries(prompt.platforms) as [
            string,
            (typeof prompt.platforms)['googleAiOverview']
          ][];

          // Get top 3 platforms with mentions for citation display
          const mentionedPlatforms = platforms.filter(([, r]) => r.mentioned);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-border rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedIndex(expandedIndex === index ? null : index)
                }
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-bg-light transition-colors"
              >
                <span className="text-sm text-text-dark flex-1 font-medium">
                  {prompt.prompt}
                </span>
                <div className="flex gap-1 flex-shrink-0">
                  {mentionedPlatforms.map(([pid]) => (
                    <span
                      key={pid}
                      className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                      title={platformLabels[pid]?.name}
                    >
                      {platformLabels[pid]?.icon}
                    </span>
                  ))}
                </div>
                <svg
                  className={`w-4 h-4 text-text-light transition-transform flex-shrink-0 ${
                    expandedIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border"
                  >
                    <div className="px-4 py-3 space-y-3">
                      {platforms.map(([pid, result]) => (
                        <div key={pid} className="border border-border rounded-lg p-3 bg-bg-light">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">
                              {platformLabels[pid]?.icon}
                            </span>
                            <span className="text-xs font-medium text-text-dark">
                              {platformLabels[pid]?.name}
                            </span>
                            {result.mentioned ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium ml-auto">
                                Mentioned{result.position ? ` #${result.position}` : ''}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-light ml-auto">
                                Not mentioned
                              </span>
                            )}
                          </div>
                          {result.mentioned && result.snippet && (
                            <p className="text-xs text-text-muted mt-1 leading-relaxed">
                              &ldquo;{result.snippet}&rdquo;
                            </p>
                          )}
                          {result.fullResponse && (
                            <ExpandableResponse response={result.fullResponse} />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {isLocked && hiddenCount > 0 && (
        <button
          onClick={onUnlock}
          className="mt-4 w-full py-3 bg-bg-light border border-dashed border-border rounded-xl text-sm text-text-muted hover:bg-gray-100 hover:border-primary/50 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          See {hiddenCount} more results — Enter your email
        </button>
      )}
    </div>
  );
}

function ExpandableResponse({ response }: { response: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!response.trim()) return null;

  const truncated = response.length > 200
    ? response.slice(0, 200) + '...'
    : response;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
      >
        {expanded ? 'Hide full response' : 'View full AI response'}
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 p-2 bg-white rounded border border-border text-xs text-text-muted leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto"
        >
          {response}
        </motion.div>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCountryByCode } from '@/lib/countries';
import { getIndustryById } from '@/lib/industries';
import {
  getScoreLabel,
  getPlatformName,
} from '@/lib/utils';
import type {
  AnalysisResult,
  PromptResult,
  PromptPlatformResult,
  PlatformScore,
  MissedOpportunity,
  Recommendation,
} from '@/lib/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Rate Limiting (in-memory for MVP)
// ---------------------------------------------------------------------------
const ipRateMap = new Map<string, { count: number; date: string }>();
let globalRequestCount = 0;
let globalRequestDate = '';

function getRateLimitDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function checkRateLimit(ip: string): { allowed: boolean; message: string } {
  const today = getRateLimitDate();

  // Reset global counter if day changed
  if (globalRequestDate !== today) {
    globalRequestDate = today;
    globalRequestCount = 0;
  }

  // Check global limit (100/day)
  if (globalRequestCount >= 100) {
    return {
      allowed: false,
      message: 'Daily analysis limit reached. Please try again tomorrow.',
    };
  }

  // Check per-IP limit (3/day)
  const entry = ipRateMap.get(ip);
  if (entry && entry.date === today && entry.count >= 3) {
    return {
      allowed: false,
      message: 'You have reached your daily limit of 3 analyses. Please try again tomorrow.',
    };
  }

  // Update counters
  globalRequestCount++;
  if (!entry || entry.date !== today) {
    ipRateMap.set(ip, { count: 1, date: today });
  } else {
    entry.count++;
  }

  return { allowed: true, message: '' };
}

// ---------------------------------------------------------------------------
// Step 1: Generate 13 prompts via OpenAI
// ---------------------------------------------------------------------------
async function generatePromptsWithAI(
  industry: string,
  country: string,
  websiteUrl?: string
): Promise<string[]> {
  const websiteContext = websiteUrl
    ? ` The brand's website is ${websiteUrl} — use it for additional context about what they offer.`
    : '';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Generate 13 search queries that a potential customer would use to find brands/companies in the ${industry} industry in ${country}. Include queries about: best tools, comparisons, recommendations, specific use cases, alternatives, reviews.${websiteContext} Format: one query per line, no numbering.`,
      },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const text = res.choices[0]?.message?.content || '';
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((l) => l.length > 5);

  // Ensure exactly 13 prompts; pad or trim
  while (lines.length < 13) {
    lines.push(`Best ${industry} companies in ${country}`);
  }
  return lines.slice(0, 13);
}

// ---------------------------------------------------------------------------
// Gemini API helper with retry on 429
// ---------------------------------------------------------------------------
interface GeminiBatchResult {
  analysis: Record<
    string,
    { mentioned: boolean; position: number | null; sentiment: string; snippet: string }
  >;
  fullResponses: Record<string, string>;
}

async function callGeminiWithRetry(
  body: object,
  retries = 2,
  fallbackDelayMs = 60000
): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  let lastRes: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) return res;

    lastRes = res;

    if (res.status === 429 && attempt < retries) {
      // Try to parse the retryDelay from Gemini's error response
      let delayMs = fallbackDelayMs;
      try {
        const errBody = await res.clone().json();
        const retryInfo = errBody?.error?.details?.find(
          (d: { '@type': string }) => d['@type']?.includes('RetryInfo')
        );
        if (retryInfo?.retryDelay) {
          const seconds = parseFloat(retryInfo.retryDelay);
          if (!isNaN(seconds) && seconds > 0) {
            delayMs = Math.ceil(seconds * 1000) + 2000; // Add 2s buffer
          }
        }
      } catch {
        // Use fallback delay
      }

      console.warn(`Gemini 429 rate-limited, retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    // Non-429 error or exhausted retries
    break;
  }

  return lastRes!;
}

// ---------------------------------------------------------------------------
// Shared helper: extract per-query full responses from AI text
// ---------------------------------------------------------------------------
function extractFullResponses(
  text: string,
  prompts: string[]
): Record<string, string> {
  const fullResponses: Record<string, string> = {};
  const analysisStart = text.indexOf('ANALYSIS_JSON_START');
  const contentText = analysisStart > 0 ? text.slice(0, analysisStart) : text;

  // Strategy 1: Look for "--- QUERY N ---" markers
  let foundMarkers = 0;
  for (let i = 0; i < prompts.length; i++) {
    const marker = `--- QUERY ${i + 1} ---`;
    if (contentText.includes(marker)) foundMarkers++;
  }

  if (foundMarkers >= prompts.length * 0.5) {
    // Use marker-based extraction
    for (let i = 0; i < prompts.length; i++) {
      const key = `query_${i + 1}`;
      const startMarker = `--- QUERY ${i + 1} ---`;
      const endMarker =
        i < prompts.length - 1 ? `--- QUERY ${i + 2} ---` : 'ANALYSIS_JSON_START';

      const startIdx = contentText.indexOf(startMarker);
      const endIdx = contentText.indexOf(endMarker, startIdx + startMarker.length);

      if (startIdx >= 0 && endIdx > startIdx) {
        fullResponses[key] = contentText.slice(startIdx + startMarker.length, endIdx).trim();
      } else if (startIdx >= 0) {
        fullResponses[key] = contentText.slice(startIdx + startMarker.length).trim();
      } else {
        fullResponses[key] = '';
      }
    }
    return fullResponses;
  }

  // Strategy 2: Look for various heading patterns (Query 1:, **Query 1**, ## Query 1, etc.)
  const headingPatterns = [
    /(?:^|\n)\s*\*{0,2}Query\s+(\d+)\*{0,2}\s*[:\.\-]/gim,
    /(?:^|\n)\s*#{1,3}\s*Query\s+(\d+)/gim,
    /(?:^|\n)\s*(?:---\s*)?(?:QUERY|Query)\s+(\d+)/gim,
  ];

  for (const pattern of headingPatterns) {
    const matches = [...contentText.matchAll(pattern)];
    if (matches.length >= prompts.length * 0.5) {
      // Found enough headings, split by them
      for (let i = 0; i < prompts.length; i++) {
        const key = `query_${i + 1}`;
        const match = matches.find((m) => parseInt(m[1]) === i + 1);
        if (match && match.index !== undefined) {
          const startIdx = match.index + match[0].length;
          const nextMatch = matches.find((m) => parseInt(m[1]) === i + 2);
          const endIdx = nextMatch?.index ?? contentText.length;
          fullResponses[key] = contentText.slice(startIdx, endIdx).trim();
        } else {
          fullResponses[key] = '';
        }
      }
      return fullResponses;
    }
  }

  // Strategy 3: Try to match by prompt text appearing in the response
  const promptPositions: { index: number; promptIdx: number }[] = [];
  for (let i = 0; i < prompts.length; i++) {
    // Look for the prompt text (or first 40 chars) in the response
    const searchText = prompts[i].slice(0, 40).toLowerCase();
    const idx = contentText.toLowerCase().indexOf(searchText);
    if (idx >= 0) {
      promptPositions.push({ index: idx, promptIdx: i });
    }
  }
  promptPositions.sort((a, b) => a.index - b.index);

  if (promptPositions.length >= prompts.length * 0.5) {
    for (let j = 0; j < promptPositions.length; j++) {
      const key = `query_${promptPositions[j].promptIdx + 1}`;
      const startIdx = promptPositions[j].index;
      const endIdx =
        j < promptPositions.length - 1 ? promptPositions[j + 1].index : contentText.length;
      fullResponses[key] = contentText.slice(startIdx, endIdx).trim();
    }
    // Fill any missing
    for (let i = 0; i < prompts.length; i++) {
      const key = `query_${i + 1}`;
      if (!fullResponses[key]) fullResponses[key] = '';
    }
    return fullResponses;
  }

  // Strategy 4: Fallback — assign the entire text as one response to all queries
  for (let i = 0; i < prompts.length; i++) {
    fullResponses[`query_${i + 1}`] = contentText.trim();
  }
  return fullResponses;
}

// ---------------------------------------------------------------------------
// Batch Gemini call (one call, all prompts)
// ---------------------------------------------------------------------------
async function batchQueryGemini(
  prompts: string[],
  brandName: string,
  style: 'concise' | 'conversational'
): Promise<GeminiBatchResult> {
  const emptyResult: GeminiBatchResult = { analysis: {}, fullResponses: {} };

  const styleInstruction =
    style === 'concise'
      ? 'Provide concise, to-the-point answers for each query. Use numbered lists when comparing options.'
      : 'Provide detailed, conversational answers with specific recommendations for each query. Be thorough and helpful.';

  const systemPrompt = `You are an AI search assistant. ${styleInstruction}

For each query below, provide a natural answer as if you were an AI search engine. Mention specific brand names and companies by name.

${prompts.map((p, i) => `--- QUERY ${i + 1} ---\n${p}`).join('\n\n')}

After answering ALL queries, output EXACTLY this analysis block (no markdown fences):
ANALYSIS_JSON_START
${JSON.stringify(
  prompts.reduce((acc, _, i) => {
    acc[`query_${i + 1}`] = { mentioned: false, position: null, sentiment: 'neutral', snippet: '' };
    return acc;
  }, {} as Record<string, unknown>)
)}
ANALYSIS_JSON_END

For each query, check if "${brandName}" was specifically named in your answer and set:
- "mentioned": true/false
- "position": the numeric list position (1-10) where ${brandName} appeared, or null
- "sentiment": "positive", "neutral", or "negative" based on how ${brandName} was described
- "snippet": a 1-2 sentence excerpt from your answer that mentions ${brandName}, or ""`;

  try {
    const res = await callGeminiWithRetry({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
    });

    if (!res.ok) {
      console.error('Gemini API error:', res.status, await res.text().catch(() => ''));
      return emptyResult;
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract per-query full responses using shared helper
    const fullResponses = extractFullResponses(text, prompts);

    // Parse the JSON analysis block
    const jsonMatch = text.match(/ANALYSIS_JSON_START\s*([\s\S]*?)\s*ANALYSIS_JSON_END/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return { analysis: parsed, fullResponses };
      } catch {
        // Fall through to text-based fallback
      }
    }

    // Fallback: analyse raw text for brand mentions
    const analysis: GeminiBatchResult['analysis'] = {};
    const brandLower = brandName.toLowerCase();

    for (let i = 0; i < prompts.length; i++) {
      const key = `query_${i + 1}`;
      const section = fullResponses[key] || '';
      const mentioned = section.toLowerCase().includes(brandLower);
      let position: number | null = null;
      let snippet = '';

      if (mentioned) {
        const lines = section.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes(brandLower)) {
            const numMatch = line.match(/^\s*(\d+)[.):\s-]/);
            if (numMatch) position = parseInt(numMatch[1], 10);
            snippet = line.trim().slice(0, 200);
            break;
          }
        }
        if (!position) {
          position =
            Math.ceil(
              (section.toLowerCase().indexOf(brandLower) / Math.max(1, section.length)) * 5
            ) || 1;
        }
      }

      analysis[key] = { mentioned, position, sentiment: 'neutral', snippet };
    }

    return { analysis, fullResponses };
  } catch (error) {
    console.error('Gemini batch query failed:', error);
    return emptyResult;
  }
}

// ---------------------------------------------------------------------------
// Batch ChatGPT call (one call, all prompts)
// ---------------------------------------------------------------------------
interface ChatGPTBatchResult {
  analysis: Record<
    string,
    { mentioned: boolean; position: number | null; sentiment: string; snippet: string }
  >;
  fullResponses: Record<string, string>;
}

async function batchQueryChatGPT(
  prompts: string[],
  brandName: string
): Promise<ChatGPTBatchResult> {
  const emptyResult: ChatGPTBatchResult = { analysis: {}, fullResponses: {} };

  const systemPrompt = `You are a helpful AI search assistant. You will be given multiple search queries. For each query, provide a helpful answer listing specific brand names and companies. Use numbered lists when comparing options.`;

  const userPrompt = `Answer these ${prompts.length} search queries:

${prompts.map((p, i) => `--- QUERY ${i + 1} ---\n${p}`).join('\n\n')}

After all answers, output EXACTLY this JSON block:
ANALYSIS_JSON_START
{${prompts
    .map(
      (_, i) =>
        `"query_${i + 1}": {"mentioned": false, "position": null, "sentiment": "neutral", "snippet": ""}`
    )
    .join(',\n')}}
ANALYSIS_JSON_END

For each query, check if "${brandName}" was specifically named in your answer and set:
- "mentioned": true/false
- "position": numeric list position (1-10) or null
- "sentiment": "positive"/"neutral"/"negative"
- "snippet": 1-2 sentence excerpt mentioning ${brandName}, or ""`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.3,
    });

    const text = res.choices[0]?.message?.content || '';

    // Extract per-query full responses using shared helper
    const fullResponses = extractFullResponses(text, prompts);

    // Parse JSON block
    const jsonMatch = text.match(/ANALYSIS_JSON_START\s*([\s\S]*?)\s*ANALYSIS_JSON_END/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return { analysis: parsed, fullResponses };
      } catch {
        // Fall through to text-based fallback
      }
    }

    // Fallback: analyse raw text
    const analysis: ChatGPTBatchResult['analysis'] = {};
    const brandLower = brandName.toLowerCase();

    for (let i = 0; i < prompts.length; i++) {
      const key = `query_${i + 1}`;
      const section = fullResponses[key] || '';
      const mentioned = section.toLowerCase().includes(brandLower);
      let position: number | null = null;
      let snippet = '';

      if (mentioned) {
        const lines = section.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes(brandLower)) {
            const numMatch = line.match(/^\s*(\d+)[.):\s-]/);
            if (numMatch) position = parseInt(numMatch[1], 10);
            snippet = line.trim().slice(0, 200);
            break;
          }
        }
        if (!position) position = 1;
      }

      analysis[key] = { mentioned, position, sentiment: 'neutral', snippet };
    }

    return { analysis, fullResponses };
  } catch (error) {
    console.error('ChatGPT batch query failed:', error);
    return emptyResult;
  }
}

// ---------------------------------------------------------------------------
// Build per-prompt result with fullResponse
// ---------------------------------------------------------------------------
function buildPromptResult(
  prompt: string,
  geminiOverview: { mentioned: boolean; position: number | null; sentiment: string; snippet: string } | undefined,
  geminiOverviewFull: string,
  geminiMode: { mentioned: boolean; position: number | null; sentiment: string; snippet: string } | undefined,
  geminiModeFull: string,
  chatgpt: { mentioned: boolean; position: number | null; sentiment: string; snippet: string } | undefined,
  chatgptFull: string
): PromptResult {
  const empty: PromptPlatformResult = {
    mentioned: false,
    position: null,
    sentiment: null,
    snippet: '',
    fullResponse: '',
  };

  function toPlatformResult(
    data: { mentioned: boolean; position: number | null; sentiment: string; snippet: string } | undefined,
    fullResponse: string
  ): PromptPlatformResult {
    if (!data) return { ...empty, fullResponse };
    return {
      mentioned: data.mentioned,
      position: data.mentioned ? data.position : null,
      sentiment: data.mentioned ? (data.sentiment as 'positive' | 'neutral' | 'negative') : null,
      snippet: data.snippet || '',
      fullResponse,
    };
  }

  return {
    prompt,
    platforms: {
      googleAiOverview: toPlatformResult(geminiOverview, geminiOverviewFull),
      googleAiMode: toPlatformResult(geminiMode, geminiModeFull),
      chatgptSearch: toPlatformResult(chatgpt, chatgptFull),
    },
  };
}

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------
function computeScore(
  mentionCount: number,
  totalPrompts: number,
  avgPosition: number,
  positiveRate: number
): number {
  const mentionRate = mentionCount / Math.max(1, totalPrompts);
  const positionScore = avgPosition > 0 ? Math.max(0, 1 - (avgPosition - 1) / 5) : 0;
  const sentimentBonus = positiveRate * 0.15;
  const raw = (mentionRate * 0.55 + positionScore * 0.3 + sentimentBonus) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

// ---------------------------------------------------------------------------
// Recommendations (no competitor data)
// ---------------------------------------------------------------------------
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

  if (missedOpportunities.length > 5) {
    recs.push({
      title: 'Create Comparison Content',
      description: `You're missing from ${missedOpportunities.length} prompts where you could appear. Create detailed comparison pages, "vs" content, and alternative guides to increase your visibility in competitive queries.`,
      priority: 'critical',
      icon: '🔴',
    });
  }

  if (weakestPlatform.score < 40) {
    recs.push({
      title: `Improve ${getPlatformName(weakestPlatform.platformId)} Presence`,
      description: `Your weakest platform is ${getPlatformName(weakestPlatform.platformId)} with a score of ${weakestPlatform.score}. Focus on structured data, FAQ content, and authoritative backlinks to improve visibility on this platform.`,
      priority: 'important',
      icon: '🟡',
    });
  }

  const hasNegativeSentiment = platforms.some((p) => p.sentiment === 'negative');
  if (hasNegativeSentiment) {
    recs.push({
      title: 'Address Negative Brand Perception',
      description:
        'AI models are reflecting some negative sentiment about your brand. Review and respond to negative reviews, create positive case studies, and build trust signals.',
      priority: 'important',
      icon: '🟡',
    });
  }

  recs.push({
    title: 'Optimize for Conversational Queries',
    description:
      'AI search engines favor content that directly answers questions. Create comprehensive FAQ pages, how-to guides, and detailed product comparisons that match natural language queries.',
    priority: 'important',
    icon: '🟡',
  });

  recs.push({
    title: 'Build Technical Documentation',
    description:
      'AI models heavily weight structured, authoritative documentation. Create detailed knowledge bases, API docs, and technical resources that AI can easily parse and reference.',
    priority: 'opportunity',
    icon: '🟢',
  });

  recs.push({
    title: 'Get Featured in Industry Roundups',
    description:
      'AI search results frequently pull from listicle-style articles and industry comparisons. Pursue inclusion in "best of" lists, industry awards, and expert recommendation articles.',
    priority: 'opportunity',
    icon: '🟢',
  });

  return recs.slice(0, 7);
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // --- Rate limiting ---
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: rateLimitResult.message }, { status: 429 });
    }

    // --- Parse input ---
    const body = await request.json();
    const { brandName, industry, country, websiteUrl } = body;

    if (!brandName || !industry || !country) {
      return NextResponse.json(
        { error: 'brandName, industry, and country are required' },
        { status: 400 }
      );
    }

    const countryData = getCountryByCode(country);
    const industryData = getIndustryById(industry);
    const countryName = countryData?.name || country;
    const countryFlag = countryData?.flag || '';
    const industryName = industryData?.name || industry;

    // --- Step 1: Generate 13 prompts via AI ---
    const prompts = await generatePromptsWithAI(industryName, countryName, websiteUrl);

    // --- Step 2: Query all 3 platforms ---
    // Stagger Gemini calls to avoid hitting per-minute rate limits.
    // Run Gemini AI Overview + ChatGPT in parallel first, then Gemini AI Mode.
    const [geminiOverviewResult, chatgptResult] = await Promise.allSettled([
      batchQueryGemini(prompts, brandName, 'concise'),
      batchQueryChatGPT(prompts, brandName),
    ]);

    // Small delay before second Gemini call to stay within RPM limits
    await new Promise((r) => setTimeout(r, 5000));

    const [geminiModeResult] = await Promise.allSettled([
      batchQueryGemini(prompts, brandName, 'conversational'),
    ]);

    const overviewData: GeminiBatchResult =
      geminiOverviewResult.status === 'fulfilled'
        ? geminiOverviewResult.value
        : { analysis: {}, fullResponses: {} };
    const modeData: GeminiBatchResult =
      geminiModeResult.status === 'fulfilled'
        ? geminiModeResult.value
        : { analysis: {}, fullResponses: {} };
    const chatgptData: ChatGPTBatchResult =
      chatgptResult.status === 'fulfilled'
        ? chatgptResult.value
        : { analysis: {}, fullResponses: {} };

    // --- Build prompt results ---
    const promptResults: PromptResult[] = prompts.map((prompt, i) => {
      const key = `query_${i + 1}`;
      return buildPromptResult(
        prompt,
        overviewData.analysis[key],
        overviewData.fullResponses[key] || '',
        modeData.analysis[key],
        modeData.fullResponses[key] || '',
        chatgptData.analysis[key],
        chatgptData.fullResponses[key] || ''
      );
    });

    // --- Compute platform scores ---
    const platformIds = ['googleAiOverview', 'googleAiMode', 'chatgptSearch'] as const;

    const platforms: PlatformScore[] = platformIds.map((pid) => {
      const mentions = promptResults.filter((pr) => pr.platforms[pid].mentioned);
      const mentionCount = mentions.length;
      const totalPromptsCount = promptResults.length;
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

      return {
        platformId: pid,
        platformName: getPlatformName(pid),
        score: computeScore(mentionCount, totalPromptsCount, avgPosition, positiveRate),
        mentionCount,
        totalPrompts: totalPromptsCount,
        sentiment: dominantSentiment,
        avgPosition: Math.round(avgPosition * 10) / 10,
      };
    });

    // --- Overall score ---
    const overallScore = Math.round(
      platforms[0].score * 0.4 + platforms[1].score * 0.3 + platforms[2].score * 0.3
    );

    // --- Missed opportunities ---
    const missedOpportunities: MissedOpportunity[] = promptResults
      .filter(
        (pr) =>
          !pr.platforms.googleAiOverview.mentioned &&
          !pr.platforms.googleAiMode.mentioned &&
          !pr.platforms.chatgptSearch.mentioned
      )
      .map((pr, idx) => ({
        prompt: pr.prompt,
        priority: idx < 3 ? ('high' as const) : idx < 6 ? ('medium' as const) : ('low' as const),
      }));

    // --- Recommendations ---
    const recommendations = generateRecommendations(brandName, platforms, missedOpportunities);

    // --- Assemble result ---
    const result: AnalysisResult = {
      brandName,
      industry: industryName,
      country,
      countryName,
      countryFlag,
      overallScore,
      scoreLabel: getScoreLabel(overallScore),
      platforms,
      promptResults,
      missedOpportunities,
      recommendations,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Analysis error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

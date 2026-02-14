import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Rate Limiting (in-memory for MVP)
// ---------------------------------------------------------------------------
const ipRateMap = new Map<string, { count: number; date: string }>();
let globalRequestCount = 0;
let globalRequestDate = '';

function getRateLimitDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkRateLimit(ip: string): { allowed: boolean; message: string } {
  const today = getRateLimitDate();

  if (globalRequestDate !== today) {
    globalRequestDate = today;
    globalRequestCount = 0;
  }

  if (globalRequestCount >= 100) {
    return { allowed: false, message: 'Daily analysis limit reached. Please try again tomorrow.' };
  }

  const entry = ipRateMap.get(ip);
  if (entry && entry.date === today && entry.count >= 3) {
    return { allowed: false, message: 'You have reached your daily limit of 3 analyses. Please try again tomorrow.' };
  }

  globalRequestCount++;
  if (!entry || entry.date !== today) {
    ipRateMap.set(ip, { count: 1, date: today });
  } else {
    entry.count++;
  }

  return { allowed: true, message: '' };
}

// ---------------------------------------------------------------------------
// Generate 6 prompts via OpenAI (2 product/service, 2 brand, 2 vs)
// ---------------------------------------------------------------------------
export async function generatePromptsWithAI(
  brandName: string,
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
        content: `Generate exactly 6 search queries a potential customer would type to find brands in the ${industry} industry in ${country}.${websiteContext}

Structure:
- 2 queries about the product/service category (e.g. "best [product type] for [use case]")
- 2 queries about the brand "${brandName}" specifically (e.g. "${brandName} reviews", "is ${brandName} good")
- 2 comparison/vs queries (e.g. "${brandName} vs [competitor]", "alternatives to [brand]")

Format: one query per line, no numbering, no categories.`,
      },
    ],
    max_tokens: 512,
    temperature: 0.7,
  });

  const text = res.choices[0]?.message?.content || '';
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').trim())
    .filter((l) => l.length > 5);

  // Ensure exactly 6 prompts; pad or trim
  while (lines.length < 6) {
    lines.push(`Best ${industry} companies in ${country}`);
  }
  return lines.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Gemini API helper with retry on 429
// ---------------------------------------------------------------------------
export interface BatchResult {
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
      let delayMs = fallbackDelayMs;
      try {
        const errBody = await res.clone().json();
        const retryInfo = errBody?.error?.details?.find(
          (d: { '@type': string }) => d['@type']?.includes('RetryInfo')
        );
        if (retryInfo?.retryDelay) {
          const seconds = parseFloat(retryInfo.retryDelay);
          if (!isNaN(seconds) && seconds > 0) {
            delayMs = Math.ceil(seconds * 1000) + 2000;
          }
        }
      } catch {
        // Use fallback delay
      }

      console.warn(`Gemini 429 rate-limited, retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

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
    if (contentText.includes(`--- QUERY ${i + 1} ---`)) foundMarkers++;
  }

  if (foundMarkers >= prompts.length * 0.5) {
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

  // Strategy 2: Heading patterns
  const headingPatterns = [
    /(?:^|\n)\s*\*{0,2}Query\s+(\d+)\*{0,2}\s*[:\.\-]/gim,
    /(?:^|\n)\s*#{1,3}\s*Query\s+(\d+)/gim,
    /(?:^|\n)\s*(?:---\s*)?(?:QUERY|Query)\s+(\d+)/gim,
  ];

  for (const pattern of headingPatterns) {
    const matches = [...contentText.matchAll(pattern)];
    if (matches.length >= prompts.length * 0.5) {
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

  // Strategy 3: Match by prompt text
  const promptPositions: { index: number; promptIdx: number }[] = [];
  for (let i = 0; i < prompts.length; i++) {
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
    for (let i = 0; i < prompts.length; i++) {
      if (!fullResponses[`query_${i + 1}`]) fullResponses[`query_${i + 1}`] = '';
    }
    return fullResponses;
  }

  // Strategy 4: Fallback
  for (let i = 0; i < prompts.length; i++) {
    fullResponses[`query_${i + 1}`] = contentText.trim();
  }
  return fullResponses;
}

// ---------------------------------------------------------------------------
// Parse batch result (shared between Gemini and ChatGPT)
// ---------------------------------------------------------------------------
function parseBatchResponse(
  text: string,
  prompts: string[],
  brandName: string
): BatchResult {
  const fullResponses = extractFullResponses(text, prompts);

  // Try JSON block
  const jsonMatch = text.match(/ANALYSIS_JSON_START\s*([\s\S]*?)\s*ANALYSIS_JSON_END/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return { analysis: parsed, fullResponses };
    } catch {
      // Fall through
    }
  }

  // Fallback: text-based analysis
  const analysis: BatchResult['analysis'] = {};
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
}

// ---------------------------------------------------------------------------
// Batch Gemini call
// ---------------------------------------------------------------------------
export async function batchQueryGemini(
  prompts: string[],
  brandName: string,
  style: 'concise' | 'conversational'
): Promise<BatchResult> {
  const emptyResult: BatchResult = { analysis: {}, fullResponses: {} };

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
    return parseBatchResponse(text, prompts, brandName);
  } catch (error) {
    console.error('Gemini batch query failed:', error);
    return emptyResult;
  }
}

// ---------------------------------------------------------------------------
// Batch ChatGPT call
// ---------------------------------------------------------------------------
export async function batchQueryChatGPT(
  prompts: string[],
  brandName: string
): Promise<BatchResult> {
  const emptyResult: BatchResult = { analysis: {}, fullResponses: {} };

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
    return parseBatchResponse(text, prompts, brandName);
  } catch (error) {
    console.error('ChatGPT batch query failed:', error);
    return emptyResult;
  }
}

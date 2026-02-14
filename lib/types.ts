export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface Industry {
  id: string;
  name: string;
  keywords: string[];
}

export interface BrandInput {
  brandName: string;
  industry: string;
  country: string;
  websiteUrl?: string;
}

export interface PromptPlatformResult {
  mentioned: boolean;
  position: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  snippet: string;
  fullResponse: string;
}

export interface PromptResult {
  prompt: string;
  platforms: {
    googleAiOverview: PromptPlatformResult;
    googleAiMode: PromptPlatformResult;
    chatgptSearch: PromptPlatformResult;
  };
}

export interface PlatformScore {
  platformId: 'googleAiOverview' | 'googleAiMode' | 'chatgptSearch';
  platformName: string;
  score: number;
  mentionCount: number;
  totalPrompts: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  avgPosition: number;
}

export interface MissedOpportunity {
  prompt: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'critical' | 'important' | 'opportunity';
  icon: string;
}

export interface AnalysisResult {
  brandName: string;
  industry: string;
  country: string;
  countryName: string;
  countryFlag: string;
  overallScore: number;
  scoreLabel: string;
  platforms: PlatformScore[];
  promptResults: PromptResult[];
  missedOpportunities: MissedOpportunity[];
  recommendations: Recommendation[];
  analyzedAt: string;
}

// Progressive API response types
export interface PromptsResponse {
  prompts: string[];
  brandName: string;
  industry: string;
  countryName: string;
  countryFlag: string;
}

export interface PlatformAnalysisItem {
  mentioned: boolean;
  position: number | null;
  sentiment: string;
  snippet: string;
}

export interface PlatformBatchResponse {
  analysis: Record<string, PlatformAnalysisItem>;
  fullResponses: Record<string, string>;
}

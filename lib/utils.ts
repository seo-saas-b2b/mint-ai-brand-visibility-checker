export function getScoreLabel(score: number): string {
  if (score >= 90) return 'AI Search Leader';
  if (score >= 70) return 'Strong AI Presence';
  if (score >= 50) return 'Growing Visibility';
  if (score >= 30) return 'Emerging Brand';
  return 'Invisible to AI';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00D9A5';
  if (score >= 60) return '#00B4D8';
  if (score >= 40) return '#FFB347';
  if (score >= 20) return '#FF8A8A';
  return '#FF6B6B';
}

export function getSentimentFromText(text: string, brandName: string): 'positive' | 'neutral' | 'negative' {
  const lower = text.toLowerCase();
  const brand = brandName.toLowerCase();

  if (!lower.includes(brand)) return 'neutral';

  const positiveWords = ['best', 'excellent', 'leading', 'top', 'recommended', 'trusted', 'popular', 'innovative', 'reliable', 'great', 'outstanding', 'preferred'];
  const negativeWords = ['poor', 'worst', 'avoid', 'issues', 'problems', 'complaints', 'expensive', 'overpriced', 'lacking', 'limited', 'concern'];

  let positiveCount = 0;
  let negativeCount = 0;

  // Look in the vicinity of the brand mention
  const brandIndex = lower.indexOf(brand);
  const context = lower.slice(Math.max(0, brandIndex - 200), brandIndex + brand.length + 200);

  for (const word of positiveWords) {
    if (context.includes(word)) positiveCount++;
  }
  for (const word of negativeWords) {
    if (context.includes(word)) negativeCount++;
  }

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

export function findBrandPosition(text: string, brandName: string): number | null {
  const lower = text.toLowerCase();
  const brand = brandName.toLowerCase();

  if (!lower.includes(brand)) return null;

  // Try to find numbered list positions
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes(brand)) {
      // Check if the line starts with a number
      const numMatch = line.match(/^\s*(\d+)[.):\s]/);
      if (numMatch) {
        return parseInt(numMatch[1], 10);
      }
      // Check if it's preceded by a numbered line
      if (i > 0) {
        const prevMatch = lines[i - 1].match(/^\s*(\d+)[.):\s]/);
        if (prevMatch) return parseInt(prevMatch[1], 10);
      }
      // Estimate position based on where the brand appears in the text
      const position = Math.ceil((lower.indexOf(brand) / lower.length) * 5);
      return Math.max(1, Math.min(5, position));
    }
  }

  return 1;
}

export function computePlatformScore(
  mentionCount: number,
  totalPrompts: number,
  avgPosition: number,
  sentimentPositiveRate: number
): number {
  const mentionRate = mentionCount / totalPrompts;
  const positionScore = avgPosition > 0 ? Math.max(0, 1 - (avgPosition - 1) / 5) : 0;
  const sentimentBonus = sentimentPositiveRate * 0.15;

  const raw = (mentionRate * 0.55 + positionScore * 0.30 + sentimentBonus) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function getPlatformName(id: string): string {
  switch (id) {
    case 'googleAiOverview': return 'Google AI Overview';
    case 'googleAiMode': return 'Google AI Mode';
    case 'chatgptSearch': return 'ChatGPT Search';
    default: return id;
  }
}

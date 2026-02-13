import { industries } from './industries';

const universalTemplates = [
  'What are the best {keyword} in {year}?',
  'Top {keyword} companies in {country}',
  'Best {keyword} for small businesses',
  'Compare top {keyword} solutions',
  '{keyword} reviews and recommendations {year}',
  'Most trusted {keyword} brands',
  'Best {keyword} for startups in {year}',
  'Affordable {keyword} options for businesses',
  'Enterprise {keyword} solutions comparison',
  'What {keyword} do experts recommend?',
  'Best {keyword} in {country} {year}',
  '{keyword} industry leaders and top companies',
  'Which {keyword} should I choose for my business?',
  'Best rated {keyword} providers',
  'Top 10 {keyword} to consider in {year}',
];

const brandSpecificTemplates = [
  'What is {brand} and is it any good?',
  '{brand} reviews - is it worth it in {year}?',
  '{brand} vs alternatives - which is better?',
  'Is {brand} the best {keyword}?',
  'What do people say about {brand}?',
];

const competitorTemplates = [
  'Alternatives to {competitor} for {keyword}',
  '{competitor} vs other {keyword} - comparison',
  'Best {keyword} similar to {competitor}',
  'Companies like {competitor} in {keyword}',
];

export function generatePrompts(
  brandName: string,
  industryId: string,
  countryName: string,
  competitors: string[]
): string[] {
  const industry = industries.find((i) => i.id === industryId);
  const keywords = industry?.keywords || [industryId];
  const year = new Date().getFullYear().toString();
  const prompts: string[] = [];

  // Pick a keyword for each prompt (cycle through)
  const fillTemplate = (template: string, extraVars?: Record<string, string>) => {
    const keyword = keywords[prompts.length % keywords.length];
    return template
      .replace(/{keyword}/g, keyword)
      .replace(/{brand}/g, brandName)
      .replace(/{country}/g, countryName)
      .replace(/{year}/g, year)
      .replace(/{competitor}/g, extraVars?.competitor || '');
  };

  // Add 8-10 universal prompts
  for (let i = 0; i < Math.min(10, universalTemplates.length); i++) {
    prompts.push(fillTemplate(universalTemplates[i]));
  }

  // Add 3 brand-specific prompts
  for (let i = 0; i < 3; i++) {
    prompts.push(fillTemplate(brandSpecificTemplates[i]));
  }

  // Add competitor-specific prompts if competitors provided
  if (competitors.length > 0) {
    for (const competitor of competitors.slice(0, 3)) {
      prompts.push(
        fillTemplate(competitorTemplates[0], { competitor }),
        fillTemplate(competitorTemplates[1], { competitor })
      );
    }
  }

  return prompts;
}

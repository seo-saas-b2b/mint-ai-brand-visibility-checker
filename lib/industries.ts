import { Industry } from './types';

export const industries: Industry[] = [
  { id: 'saas', name: 'SaaS / Software', keywords: ['software', 'SaaS platform', 'cloud tool', 'app'] },
  { id: 'ecommerce', name: 'E-commerce / Retail', keywords: ['online store', 'e-commerce platform', 'retail', 'shop'] },
  { id: 'marketing', name: 'Marketing Agency', keywords: ['marketing agency', 'digital marketing', 'advertising', 'SEO'] },
  { id: 'fintech', name: 'Fintech / Banking', keywords: ['fintech', 'financial services', 'payments', 'banking'] },
  { id: 'healthcare', name: 'Healthcare / Medical', keywords: ['healthcare', 'medical', 'health tech', 'wellness'] },
  { id: 'legal', name: 'Legal Services', keywords: ['law firm', 'legal services', 'attorney', 'legal tech'] },
  { id: 'realestate', name: 'Real Estate', keywords: ['real estate', 'property', 'real estate agency', 'housing'] },
  { id: 'education', name: 'Education / EdTech', keywords: ['education', 'e-learning', 'EdTech', 'online course'] },
  { id: 'fitness', name: 'Fitness / Wellness', keywords: ['fitness', 'gym', 'wellness', 'personal training'] },
  { id: 'food', name: 'Food & Beverage', keywords: ['restaurant', 'food delivery', 'catering', 'food brand'] },
  { id: 'travel', name: 'Travel & Hospitality', keywords: ['travel', 'hotel', 'booking', 'tourism'] },
  { id: 'automotive', name: 'Automotive', keywords: ['car', 'automotive', 'vehicle', 'auto dealer'] },
  { id: 'cybersecurity', name: 'Cybersecurity', keywords: ['cybersecurity', 'security software', 'data protection', 'infosec'] },
  { id: 'ai', name: 'AI / Machine Learning', keywords: ['AI tool', 'machine learning', 'artificial intelligence', 'AI platform'] },
  { id: 'hr', name: 'HR / Recruiting', keywords: ['HR software', 'recruiting', 'talent management', 'hiring platform'] },
  { id: 'crm', name: 'CRM / Sales', keywords: ['CRM', 'sales tool', 'sales automation', 'customer management'] },
  { id: 'analytics', name: 'Analytics / Data', keywords: ['analytics', 'data analytics', 'business intelligence', 'data platform'] },
  { id: 'design', name: 'Design / Creative', keywords: ['design tool', 'creative agency', 'graphic design', 'UX design'] },
  { id: 'construction', name: 'Construction', keywords: ['construction', 'building', 'contractor', 'construction management'] },
  { id: 'insurance', name: 'Insurance', keywords: ['insurance', 'insurtech', 'insurance provider', 'coverage'] },
  { id: 'logistics', name: 'Logistics / Supply Chain', keywords: ['logistics', 'supply chain', 'shipping', 'freight'] },
  { id: 'media', name: 'Media / Publishing', keywords: ['media', 'publishing', 'content platform', 'news'] },
  { id: 'nonprofit', name: 'Nonprofit / NGO', keywords: ['nonprofit', 'charity', 'NGO', 'social impact'] },
  { id: 'energy', name: 'Energy / CleanTech', keywords: ['energy', 'cleantech', 'renewable energy', 'solar'] },
  { id: 'gaming', name: 'Gaming / Entertainment', keywords: ['gaming', 'video game', 'entertainment', 'game studio'] },
  { id: 'consulting', name: 'Consulting', keywords: ['consulting firm', 'management consulting', 'business consulting', 'advisory'] },
  { id: 'telecom', name: 'Telecom / Communications', keywords: ['telecom', 'communications', 'internet provider', 'mobile'] },
  { id: 'manufacturing', name: 'Manufacturing', keywords: ['manufacturing', 'industrial', 'factory', 'production'] },
];

export function getIndustryById(id: string): Industry | undefined {
  return industries.find((i) => i.id === id);
}

export function getIndustryByName(name: string): Industry | undefined {
  return industries.find((i) => i.name.toLowerCase() === name.toLowerCase());
}

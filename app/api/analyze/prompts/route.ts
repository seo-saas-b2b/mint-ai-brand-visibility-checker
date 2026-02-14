import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, generatePromptsWithAI } from '@/lib/analysis';
import { getCountryByCode } from '@/lib/countries';
import { getIndustryById } from '@/lib/industries';

export async function POST(request: NextRequest) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: rateLimitResult.message }, { status: 429 });
    }

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

    const prompts = await generatePromptsWithAI(brandName, industryName, countryName, websiteUrl);

    return NextResponse.json({
      prompts,
      brandName,
      industry: industryName,
      countryName,
      countryFlag,
    });
  } catch (error: unknown) {
    console.error('Prompt generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate prompts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

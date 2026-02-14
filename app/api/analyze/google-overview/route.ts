import { NextRequest, NextResponse } from 'next/server';
import { batchQueryGemini } from '@/lib/analysis';

export async function POST(request: NextRequest) {
  try {
    const { prompts, brandName } = await request.json();

    if (!prompts || !brandName) {
      return NextResponse.json(
        { error: 'prompts and brandName are required' },
        { status: 400 }
      );
    }

    const result = await batchQueryGemini(prompts, brandName, 'concise');

    return NextResponse.json({
      analysis: result.analysis,
      fullResponses: result.fullResponses,
    });
  } catch (error: unknown) {
    console.error('Google AI Overview error:', error);
    const message = error instanceof Error ? error.message : 'Google AI Overview analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

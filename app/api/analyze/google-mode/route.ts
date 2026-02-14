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

    const result = await batchQueryGemini(prompts, brandName, 'conversational');

    return NextResponse.json({
      analysis: result.analysis,
      fullResponses: result.fullResponses,
    });
  } catch (error: unknown) {
    console.error('Google AI Mode error:', error);
    const message = error instanceof Error ? error.message : 'Google AI Mode analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

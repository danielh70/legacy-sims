import { NextResponse } from 'next/server';

import { runLegacySimulation } from '@/lib/engine/sim-engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runLegacySimulation(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown simulation error.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

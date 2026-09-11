import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Exchange rate service unavailable' }, { status: 502 });
    }

    const data = (await response.json()) as { rates?: { PKR?: number } };
    const usdToPkr = data.rates?.PKR;

    if (!usdToPkr || !Number.isFinite(usdToPkr)) {
      return NextResponse.json({ error: 'Invalid exchange rate response' }, { status: 502 });
    }

    return NextResponse.json({ usdToPkr });
  } catch {
    return NextResponse.json({ error: 'Could not load exchange rate' }, { status: 502 });
  }
}
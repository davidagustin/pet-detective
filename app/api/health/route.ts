import { NextResponse } from 'next/server';

// Vercel runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Pet Detective API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST method is working',
    timestamp: new Date().toISOString()
  });
}

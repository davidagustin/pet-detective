import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test API is working',
    method: 'GET',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'Test API POST is working',
    method: 'POST',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
}

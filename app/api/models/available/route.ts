import { NextResponse } from 'next/server';
import modelsData from '../../../../data/models.json';

export async function GET() {
  try {
    return NextResponse.json(modelsData);
  } catch (error) {
    console.error('Error fetching available models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    );
  }
}

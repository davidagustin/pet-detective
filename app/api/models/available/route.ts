import { NextResponse } from 'next/server';

// Vercel runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Embedded model data (production-compatible)
const getAvailableModels = () => {
  const models = [
    {
      id: 'resnet50',
      name: 'ResNet-50',
      description: 'ResNet-50 - Deep Residual Network',
      accuracy: 0.92,
      inference_time: '~200ms',
      status: 'available',
      file_name: 'resnet50.safetensors',
      file_size: 85.2,
      last_modified: new Date().toISOString(),
      format: 'safetensors'
    },
    {
      id: 'mobilenetv2',
      name: 'MobileNet V2',
      description: 'MobileNet V2 - Mobile-Optimized Network',
      accuracy: 0.88,
      inference_time: '~100ms',
      status: 'available',
      file_name: 'mobilenetv2.safetensors',
      file_size: 12.3,
      last_modified: new Date().toISOString(),
      format: 'safetensors'
    },
    {
      id: 'alexnet',
      name: 'AlexNet',
      description: 'AlexNet - Classic CNN Architecture',
      accuracy: 0.85,
      inference_time: '~150ms',
      status: 'available',
      file_name: 'alexnet.safetensors',
      file_size: 233.1,
      last_modified: new Date().toISOString(),
      format: 'safetensors'
    }
  ];

  return {
    models: models,
    default_model: 'resnet50',
    total_models: models.length,
    scanned_at: new Date().toISOString()
  };
};

export async function GET() {
  try {
    const response = getAvailableModels();
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting available models:', error);
    return NextResponse.json(
      { error: 'Failed to get available models' },
      { status: 500 }
    );
  }
}

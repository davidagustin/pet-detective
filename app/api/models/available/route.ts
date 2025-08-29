import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Since we're using Cloudinary for images and the models are not available in Vercel,
    // we'll return a static list of available models for the frontend
    const availableModels = {
      models: [
        {
          id: 'resnet50',
          name: 'ResNet-50',
          description: 'Deep Residual Network with 50 layers - High accuracy pet classification',
          accuracy: 0.92,
          inference_time: '~200ms',
          status: 'available'
        },
        {
          id: 'mobilenetv2',
          name: 'MobileNet V2',
          description: 'Efficient mobile-optimized model - Fast inference',
          accuracy: 0.88,
          inference_time: '~100ms',
          status: 'available'
        },
        {
          id: 'alexnet',
          name: 'AlexNet',
          description: 'Classic CNN architecture - Balanced performance',
          accuracy: 0.85,
          inference_time: '~150ms',
          status: 'available'
        }
      ],
      default_model: 'resnet50',
      total_models: 3
    };

    return NextResponse.json(availableModels);
  } catch (error) {
    console.error('Error fetching available models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    );
  }
}

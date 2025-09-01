import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    res.status(200).json(availableModels);
  } catch (error) {
    console.error('Error fetching available models:', error);
    res.status(500).json({ error: 'Failed to fetch available models' });
  }
}

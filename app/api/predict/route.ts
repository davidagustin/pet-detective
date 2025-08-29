import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Since we can't run the actual ML models in Vercel's serverless environment,
    // we'll return mock predictions for demonstration purposes
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const model = formData.get('model') as string || 'resnet50';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Mock breeds for random prediction
    const petBreeds = [
      'Abyssinian', 'Bengal', 'British_Shorthair', 'Maine_Coon', 'Persian', 'Ragdoll', 'Siamese',
      'beagle', 'boxer', 'chihuahua', 'german_shepherd', 'golden_retriever', 'labrador_retriever',
      'poodle', 'rottweiler', 'shiba_inu', 'yorkshire_terrier'
    ];

    // Generate mock prediction results
    const predictions = petBreeds
      .sort(() => 0.5 - Math.random())
      .slice(0, 5)
      .map((breed, index) => ({
        breed: breed,
        confidence: Math.random() * (0.9 - 0.1 * index) + 0.1 // Decreasing confidence
      }))
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence desc

    const topPrediction = predictions[0];

    const result = {
      success: true,
      prediction: {
        breed: topPrediction.breed,
        confidence: topPrediction.confidence,
        animal_type: ['Abyssinian', 'Bengal', 'British_Shorthair', 'Maine_Coon', 'Persian', 'Ragdoll', 'Siamese'].includes(topPrediction.breed) ? 'cat' : 'dog'
      },
      top_predictions: predictions,
      model_info: {
        model_name: model,
        model_version: '1.0.0',
        inference_time_ms: Math.floor(Math.random() * 200) + 100,
        preprocessing_time_ms: Math.floor(Math.random() * 50) + 20
      },
      image_info: {
        filename: file.name,
        size_bytes: file.size,
        format: file.type
      },
      message: `Mock prediction using ${model} model. In production, this would use actual ML models.`
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing prediction:', error);
    return NextResponse.json(
      { error: 'Failed to process prediction' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Pet prediction API endpoint',
    methods: ['POST'],
    description: 'Upload an image file to get pet breed predictions',
    note: 'This is a mock API for production deployment. Actual ML inference requires a dedicated backend.'
  });
}

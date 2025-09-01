import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Game start API is working',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model_type = 'resnet50', model_name, game_mode = 'medium', difficulty = 'medium' } = body;
    
    // Use game_mode if provided, otherwise fall back to difficulty
    const gameDifficulty = game_mode || difficulty;

    // Since we don't have the actual Flask API in production, 
    // we'll return mock game data with Cloudinary images
    const mockBreeds = [
      'Abyssinian', 'Bengal', 'British_Shorthair', 'Maine_Coon', 'Persian', 'Ragdoll', 'Siamese',
      'beagle', 'boxer', 'chihuahua', 'german_shepherd', 'golden_retriever', 'labrador_retriever',
      'poodle', 'rottweiler', 'shiba_inu', 'yorkshire_terrier'
    ];

    // Generate random options based on difficulty
    const optionCounts = { easy: 4, medium: 4, hard: 6 };
    const optionCount = optionCounts[gameDifficulty as keyof typeof optionCounts] || 4;

    // Select random correct answer
    const correctAnswer = mockBreeds[Math.floor(Math.random() * mockBreeds.length)];
    
    // Generate wrong options
    const wrongOptions = mockBreeds
      .filter(breed => breed !== correctAnswer)
      .sort(() => 0.5 - Math.random())
      .slice(0, optionCount - 1);

    // Combine and shuffle options
    const options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

    // Generate random image number (1-200)
    const imageNumber = Math.floor(Math.random() * 200) + 1;
    const filename = `${correctAnswer}_${imageNumber}.jpg`;

    // Use Cloudinary URL
    const cloudinaryUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19'}/image/upload/c_fill,w_800,h_600,q_auto/pet-detective/${correctAnswer}_${imageNumber}`;

    const gameData = {
      image: cloudinaryUrl,
      options: options,
      correctAnswer: correctAnswer,
      aiPrediction: correctAnswer, // Mock AI prediction
      aiConfidence: 0.85 + Math.random() * 0.14, // Random confidence between 0.85-0.99
      imageMetadata: {
        animal_type: ['Abyssinian', 'Bengal', 'British_Shorthair', 'Maine_Coon', 'Persian', 'Ragdoll', 'Siamese'].includes(correctAnswer) ? 'cat' : 'dog',
        filename: filename
      }
    };

    return NextResponse.json(gameData);
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load real breed data
const loadBreedData = () => {
  try {
    const breedMappingPath = path.join(process.cwd(), 'api', 'breed_mapping.json');
    const breedData = JSON.parse(fs.readFileSync(breedMappingPath, 'utf8'));
    return breedData;
  } catch (error) {
    console.error('Error loading breed data:', error);
    return null;
  }
};

// Get Cloudinary URL for a breed and image number
const getCloudinaryUrl = (breed: string, imageNumber: number) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19';
  const breedKey = breed.toLowerCase().replace(/\s+/g, '_');
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_800,h_600,q_auto/pet-detective/${breedKey}_${imageNumber}`;
};

// Get animal type for a breed
const getAnimalType = (breed: string, breedData: any): 'cat' | 'dog' => {
  const catBreeds = breedData.breed_types.cats;
  return catBreeds.includes(breed) ? 'cat' : 'dog';
};

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

    // Load real breed data
    const breedData = loadBreedData();
    if (!breedData) {
      return NextResponse.json(
        { error: 'Failed to load breed data' },
        { status: 500 }
      );
    }

    // Get all available breeds
    const allBreeds = [...breedData.breed_types.cats, ...breedData.breed_types.dogs];
    
    // Generate random options based on difficulty
    const optionCounts = { easy: 4, medium: 4, hard: 6 };
    const optionCount = optionCounts[gameDifficulty as keyof typeof optionCounts] || 4;

    // Select random correct answer
    const correctAnswer = allBreeds[Math.floor(Math.random() * allBreeds.length)];
    
    // Get animal type of correct answer
    const correctAnimalType = getAnimalType(correctAnswer, breedData);
    
    // Filter breeds to same animal type for wrong options
    const sameTypeBreeds = allBreeds.filter(breed => 
      breed !== correctAnswer && getAnimalType(breed, breedData) === correctAnimalType
    );
    
    // Generate wrong options from same animal type
    const wrongOptions = sameTypeBreeds
      .sort(() => 0.5 - Math.random())
      .slice(0, optionCount - 1);

    // If not enough same-type breeds, add some from other type
    if (wrongOptions.length < optionCount - 1) {
      const otherTypeBreeds = allBreeds.filter(breed => 
        breed !== correctAnswer && getAnimalType(breed, breedData) !== correctAnimalType
      );
      const additionalNeeded = optionCount - 1 - wrongOptions.length;
      const additionalOptions = otherTypeBreeds
        .sort(() => 0.5 - Math.random())
        .slice(0, additionalNeeded);
      wrongOptions.push(...additionalOptions);
    }

    // Combine and shuffle options
    const options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

    // Generate random image number (1-200 for variety)
    const imageNumber = Math.floor(Math.random() * 200) + 1;
    
    // Get Cloudinary URL for the correct breed
    const cloudinaryUrl = getCloudinaryUrl(correctAnswer, imageNumber);

    const gameData = {
      image: cloudinaryUrl,
      options: options,
      correctAnswer: correctAnswer,
      aiPrediction: correctAnswer, // For now, assume AI is correct
      aiConfidence: 0.85 + Math.random() * 0.14, // Random confidence between 0.85-0.99
      imageMetadata: {
        animal_type: correctAnimalType,
        filename: `${correctAnswer.toLowerCase().replace(/\s+/g, '_')}_${imageNumber}.jpg`,
        breed: correctAnswer,
        total_breeds: allBreeds.length,
        cat_breeds: breedData.breed_types.cats.length,
        dog_breeds: breedData.breed_types.dogs.length
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

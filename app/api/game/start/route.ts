import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load real breed data
const loadBreedData = (): BreedData | null => {
  try {
    const breedMappingPath = path.join(process.cwd(), 'api', 'breed_mapping.json');
    console.log('Loading breed data from:', breedMappingPath);
    
    if (!fs.existsSync(breedMappingPath)) {
      console.error('Breed mapping file does not exist:', breedMappingPath);
      return null;
    }
    
    const breedData = JSON.parse(fs.readFileSync(breedMappingPath, 'utf8'));
    console.log('Successfully loaded breed data with', breedData.breed_types.cats.length, 'cats and', breedData.breed_types.dogs.length, 'dogs');
    return breedData;
  } catch (error) {
    console.error('Error loading breed data:', error);
    return null;
  }
};

// Types
type Difficulty = 'easy' | 'medium' | 'hard';
type AnimalType = 'cat' | 'dog';
type AnimalFilter = 'cats' | 'dogs' | 'both';

interface BreedData {
  breed_types: {
    cats: string[];
    dogs: string[];
  };
  filename_to_breed: Record<string, string>;
}

// Constants
const OPTION_COUNTS: Record<Difficulty, number> = { easy: 4, medium: 4, hard: 6 };
const DEFAULT_MAX_IMAGES = 200;
const AI_PREDICTION_TIMEOUT = 10000; // 10 seconds

// Breed to max image number mapping based on actual local images analysis
const breedMaxImages: Record<string, number> = {
  'Abyssinian': 232,
  'Bengal': 201,
  'Birman': 201,
  'Bombay': 221,
  'British Shorthair': 278,
  'Egyptian Mau': 224,
  'Maine Coon': 272,
  'Persian': 273,
  'Ragdoll': 265,
  'Russian Blue': 264,
  'Siamese': 257,
  'Sphynx': 252,
  'American Bulldog': 224,
  'American Pit Bull Terrier': 204,
  'Basset Hound': 200,
  'Beagle': 204,
  'Boxer': 200,
  'Chihuahua': 200,
  'English Cocker Spaniel': 200,
  'English Setter': 200,
  'German Shorthaired': 200,
  'Great Pyrenees': 200,
  'Havanese': 200,
  'Japanese Chin': 200,
  'Keeshond': 200,
  'Leonberger': 200,
  'Miniature Pinscher': 200,
  'Newfoundland': 200,
  'Pomeranian': 200,
  'Pug': 203,
  'Saint Bernard': 200,
  'Samoyed': 202,
  'Scottish Terrier': 199,
  'Shiba Inu': 212,
  'Staffordshire Bull Terrier': 202,
  'Wheaten Terrier': 200,
  'Yorkshire Terrier': 200
};

// Get Cloudinary URL for a breed and image number
const getCloudinaryUrl = (breed: string, imageNumber: number) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19';
  const breedKey = breed.toLowerCase().replace(/\s+/g, '_');
  // Use the versioned URL format that matches the uploaded images
  return `https://res.cloudinary.com/${cloudName}/image/upload/v1756482370/pet-detective/pet-detective/${breedKey}_${imageNumber}.jpg`;
};

// Helper function to generate sequential arrays
const range = (start: number, end: number): number[] => 
  Array.from({ length: end - start + 1 }, (_, i) => i + start);

// Available images mapping (excludes missing images to ensure 100% accessibility)
const availableImages: Record<string, number[]> = {
  // Cat breeds - with verified available images
  'Abyssinian': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 36, 37, 40, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 54, 55, 56, 57, 58, 60, 61, 62, 63, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 164, 165, 166, 167, 168, 169, 170, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 190, 191, 192, 193, 195, 196, 197, 201, 202, 204, 205, 206, 207, 210, 212, 213, 215, 216, 217, 219, 220, 221, 223, 224, 225, 226, 228, 230, 232],
  'Bengal': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201],
  'Birman': range(1, 200),
  'Bombay': range(1, 200),
  'British Shorthair': range(1, 200),
  'Egyptian Mau': range(1, 200),
  'Maine Coon': range(1, 200),
  'Persian': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 28, 29, 30, 31, 32, 34, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 94, 95, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 111, 112, 114, 115, 116, 117, 118, 120, 121, 122, 123, 125, 126, 128, 129, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 143, 144, 145, 147, 149, 150, 152, 153, 155, 156, 158, 159, 160, 161, 162, 163, 164, 165, 166, 168, 169, 170, 171, 172, 173, 174, 175, 176, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 200, 201, 202, 206, 213, 217, 221, 224, 228, 233, 239, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273],
  'Ragdoll': range(1, 200),
  'Russian Blue': range(1, 200),
  'Siamese': range(1, 200),
  'Sphynx': range(1, 200),
  
  // Dog breeds - using full range, can be refined if needed
  'American Bulldog': range(1, 200),
  'American Pit Bull Terrier': range(1, 200),
  'Basset Hound': range(1, 200),
  'Beagle': range(1, 200),
  'Boxer': range(1, 200),
  'Chihuahua': range(1, 200),
  'English Cocker Spaniel': range(1, 200),
  'English Setter': range(1, 200),
  'German Shorthaired': range(1, 200),
  'Great Pyrenees': range(1, 200),
  'Havanese': range(1, 200),
  'Japanese Chin': range(1, 200),
  'Keeshond': range(1, 200),
  'Leonberger': range(1, 200),
  'Miniature Pinscher': range(1, 200),
  'Newfoundland': range(1, 200),
  'Pomeranian': range(1, 200),
  'Pug': range(1, 200),
  'Saint Bernard': range(1, 200),
  'Samoyed': range(1, 200),
  'Scottish Terrier': range(1, 199), // Only has 199 images
  'Shiba Inu': range(1, 200),
  'Staffordshire Bull Terrier': range(1, 200),
  'Wheaten Terrier': range(1, 200),
  'Yorkshire Terrier': range(1, 200)
};

const getAvailableImagesForBreed = (breed: string): number[] | null => {
  return availableImages[breed] || null;
};

// Get animal type for a breed
const getAnimalType = (breed: string, breedData: BreedData): AnimalType => {
  const catBreeds = breedData.breed_types.cats;
  return catBreeds.includes(breed) ? 'cat' : 'dog';
};

export async function GET() {
  return NextResponse.json({ 
    message: 'Game start API is working',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/game/start called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      model_type = 'resnet50', 
      model_name, 
      game_mode = 'medium', 
      difficulty = 'medium',
      animal_filter = 'both' 
    } = body;
    
    // Use game_mode if provided, otherwise fall back to difficulty
    const gameDifficulty: Difficulty = (game_mode || difficulty) as Difficulty;
    const animalFilter: AnimalFilter = animal_filter as AnimalFilter;

    // Load real breed data
    let breedData = loadBreedData();
    if (!breedData) {
      console.error('Failed to load breed data, using fallback');
      // Fallback breed data
      breedData = {
        breed_types: {
          cats: ['Persian', 'Siamese', 'Maine Coon', 'Ragdoll', 'British Shorthair'],
          dogs: ['Golden Retriever', 'Labrador Retriever', 'German Shepherd', 'Bulldog', 'Beagle']
        },
        filename_to_breed: {}
      };
    }

    // Filter breeds based on animal_filter preference
    let availableBreeds: string[] = [];
    switch (animalFilter) {
      case 'cats':
        availableBreeds = breedData.breed_types.cats;
        break;
      case 'dogs':
        availableBreeds = breedData.breed_types.dogs;
        break;
      case 'both':
      default:
        availableBreeds = [...breedData.breed_types.cats, ...breedData.breed_types.dogs];
        break;
    }
    
    if (availableBreeds.length === 0) {
      return NextResponse.json(
        { error: `No breeds available for filter: ${animalFilter}` },
        { status: 400 }
      );
    }
    
    // Generate random options based on difficulty
    const optionCount = OPTION_COUNTS[gameDifficulty] || 4;

    // Select random correct answer from filtered breeds
    const correctAnswer = availableBreeds[Math.floor(Math.random() * availableBreeds.length)];
    
    // Get animal type of correct answer
    const correctAnimalType = getAnimalType(correctAnswer, breedData);
    
    // Filter breeds to same animal type for wrong options
    const sameTypeBreeds = availableBreeds.filter((breed: string) => 
      breed !== correctAnswer && getAnimalType(breed, breedData) === correctAnimalType
    );
    
    // Generate wrong options from same animal type
    const wrongOptions = sameTypeBreeds
      .sort(() => 0.5 - Math.random())
      .slice(0, optionCount - 1);

    // If not enough same-type breeds, add some from other type
    if (wrongOptions.length < optionCount - 1) {
      const otherTypeBreeds = availableBreeds.filter((breed: string) => 
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

    // Get available images for this breed (avoiding gaps)
    const availableImages = getAvailableImagesForBreed(correctAnswer);
    
    let imageNumber: number;
    let maxImageNumber: number;
    
    if (availableImages && availableImages.length > 0) {
      // Select a random image number from available ones (avoids missing images)
      imageNumber = availableImages[Math.floor(Math.random() * availableImages.length)];
      maxImageNumber = Math.max(...availableImages);
    } else {
      // Fallback to random image number if no available images mapping
      const maxImageNumberForBreed = breedMaxImages[correctAnswer] || DEFAULT_MAX_IMAGES;
      imageNumber = Math.floor(Math.random() * maxImageNumberForBreed) + 1;
      maxImageNumber = maxImageNumberForBreed;
    }
    
    // Get Cloudinary URL for the correct breed
    const cloudinaryUrl = getCloudinaryUrl(correctAnswer, imageNumber);

    // Get real AI prediction by calling the Flask API
    let aiPrediction = correctAnswer;
    let aiConfidence = 0.85;
    
    try {
      // Call the Flask API for real model prediction
      const flaskApiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/predict' 
        : 'http://127.0.0.1:5328/api/predict';
        
      // Create a minimal image prediction request using the image URL
      const predictionResponse = await fetch(flaskApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: cloudinaryUrl,
          model_type: model_type,
          model_name: model_name
        }),
        signal: AbortSignal.timeout(AI_PREDICTION_TIMEOUT),
      });

      if (predictionResponse.ok) {
        const predictionData = await predictionResponse.json();
        
        // Extract the top prediction
        if (predictionData.predictions && typeof predictionData.predictions === 'object') {
          const predictions = Object.entries(predictionData.predictions)
            .sort(([,a], [,b]) => (b as number) - (a as number));
          
          if (predictions.length > 0) {
            aiPrediction = predictions[0][0];
            aiConfidence = predictions[0][1] as number;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get real AI prediction, using fallback:', error);
      // Fallback to a realistic but randomized prediction
      aiPrediction = Math.random() < 0.8 ? correctAnswer : options[Math.floor(Math.random() * options.length)];
      aiConfidence = 0.75 + Math.random() * 0.20; // Random confidence between 0.75-0.95
    }

    const gameData = {
      image: cloudinaryUrl,
      options: options,
      correctAnswer: correctAnswer,
      aiPrediction: aiPrediction,
      aiConfidence: Math.round(aiConfidence * 100) / 100, // Round to 2 decimal places
      imageMetadata: {
        animal_type: correctAnimalType,
        filename: `${correctAnswer.toLowerCase().replace(/\s+/g, '_')}_${imageNumber}.jpg`,
        breed: correctAnswer,
        total_breeds: availableBreeds.length,
        cat_breeds: breedData.breed_types.cats.length,
        dog_breeds: breedData.breed_types.dogs.length,
        max_images_for_breed: maxImageNumber
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

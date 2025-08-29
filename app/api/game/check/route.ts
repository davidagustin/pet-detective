import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      user_answer, 
      correct_answer, 
      user_id, 
      username, 
      model_type = 'resnet50',
      model_name,
      game_mode = 'medium',
      time_taken = 30 
    } = body;

    const isCorrect = user_answer === correct_answer;
    
    // Calculate score based on correctness, time, and difficulty
    let baseScore = isCorrect ? 100 : 0;
    let timeBonus = isCorrect ? Math.max(0, (30 - time_taken) * 2) : 0;
    let difficultyMultiplier = 1;
    
    switch (game_mode) {
      case 'easy':
        difficultyMultiplier = 0.8;
        break;
      case 'hard':
        difficultyMultiplier = 1.5;
        break;
      default: // medium
        difficultyMultiplier = 1.0;
    }

    const finalScore = Math.round((baseScore + timeBonus) * difficultyMultiplier);

    // Mock leaderboard update (in production, this would update a database)
    const result = {
      is_correct: isCorrect,
      score: finalScore,
      time_taken: time_taken,
      user_answer: user_answer,
      correct_answer: correct_answer,
      model_prediction: correct_answer, // Mock: assume AI was correct
      model_confidence: 0.85 + Math.random() * 0.14,
      leaderboard_position: Math.floor(Math.random() * 50) + 1, // Mock position
      total_players: Math.floor(Math.random() * 100) + 50, // Mock total
      message: isCorrect ? 'Correct! Well done!' : `Incorrect. The correct answer was ${correct_answer}.`
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking answer:', error);
    return NextResponse.json(
      { error: 'Failed to check answer' },
      { status: 500 }
    );
  }
}

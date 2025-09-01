import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Calculate score based on correctness, time, difficulty, and streak
const calculateScore = (
  isCorrect: boolean, 
  timeTaken: number, 
  gameMode: string, 
  streak: number = 0
): number => {
  if (!isCorrect) return 0;
  
  const baseScore = 100;
  const timeBonus = Math.max(0, (30 - timeTaken) * 2);
  let difficultyMultiplier = 1;
  const streakBonus = Math.min(streak * 5, 25); // Max 25 points for streak
  
  switch (gameMode) {
    case 'easy':
      difficultyMultiplier = 0.8;
      break;
    case 'hard':
      difficultyMultiplier = 1.5;
      break;
    default: // medium
      difficultyMultiplier = 1.0;
  }

  return Math.round((baseScore + timeBonus + streakBonus) * difficultyMultiplier);
};

// Save score to leaderboard
const saveScoreToLeaderboard = async (scoreData: any) => {
  try {
    const { error } = await supabase
      .from('leaderboard')
      .insert([scoreData])
      .select();

    if (error) {
      console.error('Error saving score:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving score to leaderboard:', error);
    return false;
  }
};

// Get leaderboard position
const getLeaderboardPosition = async (score: number): Promise<{ position: number; total: number }> => {
  try {
    // Count total players
    const { count: total } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true });

    // Count players with higher scores
    const { count: higherScores } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .gt('score', score);

    const position = (higherScores || 0) + 1;
    
    return {
      position,
      total: total || 0
    };
  } catch (error) {
    console.error('Error getting leaderboard position:', error);
    return { position: 999, total: 0 };
  }
};

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
      time_taken = 30,
      streak = 0
    } = body;

    // Validate required fields
    if (!user_answer || !correct_answer) {
      return NextResponse.json(
        { error: 'Missing required fields: user_answer and correct_answer' },
        { status: 400 }
      );
    }

    const isCorrect = user_answer.toLowerCase().trim() === correct_answer.toLowerCase().trim();
    
    // Calculate score
    const finalScore = calculateScore(isCorrect, time_taken, game_mode, streak);

    // Prepare score data for leaderboard
    const scoreData = {
      user_id: user_id || 'anonymous',
      username: username || 'Anonymous Player',
      score: finalScore,
      is_correct: isCorrect,
      model_type: model_type,
      model_name: model_name || null,
      game_mode: game_mode,
      time_taken: time_taken,
      streak: streak,
      correct_answer: correct_answer,
      user_answer: user_answer,
      created_at: new Date().toISOString()
    };

    // Save to leaderboard if user is authenticated
    let leaderboardSaved = false;
    if (user_id && user_id !== 'anonymous') {
      leaderboardSaved = await saveScoreToLeaderboard(scoreData);
    }

    // Get leaderboard position
    const leaderboardInfo = await getLeaderboardPosition(finalScore);

    const result = {
      is_correct: isCorrect,
      score: finalScore,
      time_taken: time_taken,
      user_answer: user_answer,
      correct_answer: correct_answer,
      model_prediction: correct_answer, // For now, assume AI was correct
      model_confidence: 0.85 + Math.random() * 0.14,
      leaderboard_position: leaderboardInfo.position,
      total_players: leaderboardInfo.total,
      leaderboard_saved: leaderboardSaved,
      streak: isCorrect ? streak + 1 : 0,
      message: isCorrect 
        ? `Correct! +${finalScore} points${streak > 0 ? ` (${streak + 1} streak!)` : ''}` 
        : `Incorrect. The correct answer was ${correct_answer}.`
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

export async function GET() {
  return NextResponse.json({ 
    message: 'Game check API is working',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
}

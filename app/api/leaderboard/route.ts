import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get leaderboard data for a specific time period
const getLeaderboardData = async (timeFilter: string) => {
  try {
    let query = supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);

    // Apply time filter
    if (timeFilter === 'daily') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      query = query.gte('created_at', yesterday.toISOString());
    } else if (timeFilter === 'weekly') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      query = query.gte('created_at', lastWeek.toISOString());
    }
    // 'allTime' doesn't need a filter

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${timeFilter} leaderboard:`, error);
      return [];
    }

    // Process and aggregate data
    const aggregatedData = data?.reduce((acc: any, entry: any) => {
      const existing = acc.find((item: any) => item.username === entry.username);
      
      if (existing) {
        existing.score += entry.score;
        existing.games_played += 1;
        existing.correct_answers += entry.is_correct ? 1 : 0;
        existing.total_time += entry.time_taken;
      } else {
        acc.push({
          username: entry.username,
          score: entry.score,
          games_played: 1,
          correct_answers: entry.is_correct ? 1 : 0,
          total_time: entry.time_taken,
          model_used: entry.model_type || 'resnet50'
        });
      }
      
      return acc;
    }, []);

    // Calculate additional stats and sort by score
    return aggregatedData
      ?.map((entry: any) => ({
        rank: 0, // Will be set after sorting
        username: entry.username,
        score: entry.score,
        games_played: entry.games_played,
        accuracy: entry.games_played > 0 ? (entry.correct_answers / entry.games_played).toFixed(2) : '0.00',
        avg_time: entry.games_played > 0 ? Math.round(entry.total_time / entry.games_played) : 0,
        model_used: entry.model_used
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .map((entry: any, index: number) => ({ ...entry, rank: index + 1 })) || [];

  } catch (error) {
    console.error(`Error processing ${timeFilter} leaderboard:`, error);
    return [];
  }
};

// Get global statistics
const getGlobalStats = async () => {
  try {
    const { count: totalPlayers } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true });

    const { count: totalGames } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true });

    const { data: accuracyData } = await supabase
      .from('leaderboard')
      .select('is_correct');

    const totalCorrect = accuracyData?.filter(entry => entry.is_correct).length || 0;
    const avgAccuracy = (totalGames || 0) > 0 ? (totalCorrect / (totalGames || 0)).toFixed(2) : '0.00';

    const { data: modelData } = await supabase
      .from('leaderboard')
      .select('model_type');

    const modelCounts = modelData?.reduce((acc: any, entry: any) => {
      const model = entry.model_type || 'resnet50';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {});

    const mostPopularModel = modelCounts 
      ? Object.entries(modelCounts).sort(([,a]: any, [,b]: any) => b - a)[0]?.[0] || 'resnet50'
      : 'resnet50';

    return {
      total_players: totalPlayers || 0,
      total_games: totalGames || 0,
      avg_accuracy: avgAccuracy,
      most_popular_model: mostPopularModel
    };

  } catch (error) {
    console.error('Error fetching global stats:', error);
    return {
      total_players: 0,
      total_games: 0,
      avg_accuracy: '0.00',
      most_popular_model: 'resnet50'
    };
  }
};

export async function GET() {
  try {
    // Fetch real leaderboard data
    const [daily, weekly, allTime] = await Promise.all([
      getLeaderboardData('daily'),
      getLeaderboardData('weekly'),
      getLeaderboardData('allTime')
    ]);

    // Get global statistics
    const stats = await getGlobalStats();

    const leaderboard = {
      daily,
      weekly,
      allTime,
      stats
    };

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

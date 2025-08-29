import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock leaderboard data since we don't have the database in production
    const mockLeaderboard = {
      daily: Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        username: `Player${Math.floor(Math.random() * 1000)}`,
        score: Math.floor(Math.random() * 5000) + 1000,
        games_played: Math.floor(Math.random() * 50) + 10,
        accuracy: (Math.random() * 0.4 + 0.6).toFixed(2), // 60-100%
        avg_time: Math.floor(Math.random() * 15) + 10, // 10-25 seconds
        model_used: ['resnet50', 'mobilenetv2', 'alexnet'][Math.floor(Math.random() * 3)]
      })),
      weekly: Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        username: `TopPlayer${Math.floor(Math.random() * 500)}`,
        score: Math.floor(Math.random() * 20000) + 5000,
        games_played: Math.floor(Math.random() * 200) + 50,
        accuracy: (Math.random() * 0.3 + 0.7).toFixed(2), // 70-100%
        avg_time: Math.floor(Math.random() * 12) + 8, // 8-20 seconds
        model_used: ['resnet50', 'mobilenetv2', 'alexnet'][Math.floor(Math.random() * 3)]
      })),
      allTime: Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        username: `Legend${Math.floor(Math.random() * 100)}`,
        score: Math.floor(Math.random() * 50000) + 20000,
        games_played: Math.floor(Math.random() * 1000) + 200,
        accuracy: (Math.random() * 0.2 + 0.8).toFixed(2), // 80-100%
        avg_time: Math.floor(Math.random() * 10) + 5, // 5-15 seconds
        model_used: ['resnet50', 'mobilenetv2', 'alexnet'][Math.floor(Math.random() * 3)]
      })),
      stats: {
        total_players: Math.floor(Math.random() * 10000) + 5000,
        total_games: Math.floor(Math.random() * 100000) + 50000,
        avg_accuracy: (Math.random() * 0.2 + 0.75).toFixed(2), // 75-95%
        most_popular_model: 'resnet50'
      }
    };

    return NextResponse.json(mockLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

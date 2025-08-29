'use client'

import { useState, useEffect } from 'react'
import { supabase, LeaderboardEntry } from '@/lib/supabase'

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(20)

      if (error) throw error
      setLeaderboard(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const saveScore = async (score: number, totalQuestions: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const accuracy = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0

      const { error } = await supabase
        .from('leaderboard')
        .insert([
          {
            user_id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0],
            score,
            total_questions: totalQuestions,
            accuracy: Math.round(accuracy * 100) / 100,
          },
        ])

      if (error) throw error
      fetchLeaderboard() // Refresh leaderboard
    } catch (error: any) {
      console.error('Error saving score:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">🏆 Leaderboard</h2>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">🏆 Leaderboard</h2>
        <div className="text-red-600 text-center">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">🏆 Leaderboard</h2>
      
      {leaderboard.length === 0 ? (
        <p className="text-gray-600 text-center">No scores yet. Be the first to play!</p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                index === 1 ? 'bg-gray-50 border border-gray-200' :
                index === 2 ? 'bg-orange-50 border border-orange-200' :
                'bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-400 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-400 text-white' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{entry.username}</p>
                  <p className="text-sm text-gray-500">
                    {entry.total_questions} questions • {entry.accuracy}% accuracy
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">{entry.score}</p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { Leaderboard }

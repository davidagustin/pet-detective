'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)

interface LeaderboardEntry {
  id: string
  user_id: string
  username: string
  score: number
  total_questions: number
  accuracy: number
  created_at: string
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if we have valid Supabase configuration
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
      const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && 
                                   supabaseKey !== 'placeholder-key'
      
      if (!isSupabaseConfigured) {
        // Use sample data when Supabase is not configured
        const sampleData = [
          { id: '1', user_id: '1', username: 'PetExpert', score: 2450, total_questions: 35, accuracy: 92, created_at: new Date().toISOString() },
          { id: '2', user_id: '2', username: 'DogLover123', score: 2100, total_questions: 30, accuracy: 88, created_at: new Date().toISOString() },
          { id: '3', user_id: '3', username: 'CatWhisperer', score: 1950, total_questions: 28, accuracy: 85, created_at: new Date().toISOString() },
          { id: '4', user_id: '4', username: 'AnimalGuru', score: 1800, total_questions: 25, accuracy: 89, created_at: new Date().toISOString() },
          { id: '5', user_id: '5', username: 'BreedMaster', score: 1650, total_questions: 22, accuracy: 86, created_at: new Date().toISOString() },
          { id: '6', user_id: '6', username: 'PetDetective', score: 1500, total_questions: 20, accuracy: 83, created_at: new Date().toISOString() },
          { id: '7', user_id: '7', username: 'FurryFriend', score: 1350, total_questions: 18, accuracy: 81, created_at: new Date().toISOString() },
          { id: '8', user_id: '8', username: 'PawPrint', score: 1200, total_questions: 16, accuracy: 84, created_at: new Date().toISOString() }
        ]
        setLeaderboard(sampleData)
        setLoading(false)
        return
      }

      // Fetch real data from Supabase
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      setLeaderboard(data || [])
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error)
      setError(error.message || 'Failed to fetch leaderboard')
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🏆 Leaderboard</h2>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🏆 Leaderboard</h2>
        <div className="text-red-600 dark:text-red-400 text-center">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🏆 Leaderboard</h2>
      
      {leaderboard.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-center">No scores yet. Be the first to play!</p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                index === 1 ? 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600' :
                index === 2 ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                'bg-gray-50 dark:bg-gray-700'
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
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{entry.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {entry.total_questions} questions • {entry.accuracy}% accuracy
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{entry.score}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { Leaderboard }

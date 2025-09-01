'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import Auth from '../components/Auth'
import Leaderboard from '../components/Leaderboard'
import DynamicModelSelector from '../components/DynamicModelSelector'
import EnhancedPetGame from '../components/EnhancedPetGame'
import Settings from '../components/Settings'
import Snackbar, { useSnackbar } from '../components/Snackbar'
import { apiClient } from '../lib/api-client'
import { config } from '../lib/config'
import { 
  useAccessibility, 
  useLoadingState, 
  useErrorState, 
  useSuccessState,
  accessibilityUtils,
  ScreenReaderOnly 
} from '../lib/accessibility'

const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
)

// Compact Leaderboard Component for Sidebar
function CompactLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLeaderboard()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFromAPI = async () => {
    try {
      const data = await apiClient.getLeaderboard();
      setLeaderboard(data.allTime || []);
    } catch (error) {
      console.error('Error fetching leaderboard from API:', error);
      setLeaderboard([]);
      return false;
    }
    return true;
  }

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if we have valid Supabase configuration
      const isSupabaseConfigured = config.supabase.url !== 'https://placeholder.supabase.co' && 
                                   config.supabase.anonKey !== 'placeholder-key'
      
      if (!isSupabaseConfigured) {
        await fetchFromAPI();
        setLoading(false)
        return
      }

      // Fetch real data from Supabase
      const { data, error: supabaseError } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10)

      if (supabaseError) {
        console.error('Supabase error:', supabaseError)
        const success = await fetchFromAPI();
        if (!success) {
          setError('Error loading leaderboard from all sources')
        }
        setLoading(false)
        return
      }

      setLeaderboard(data || [])
      setLoading(false)
    } catch (error: any) {
      console.error('Leaderboard fetch error:', error)
      const success = await fetchFromAPI();
      if (!success) {
        setError('Error loading leaderboard from all sources')
      }
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">Loading leaderboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm">No scores yet. Be the first to play!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => (
        <div
          key={entry.id}
          className={`flex items-center justify-between p-2 rounded-lg text-sm ${
            index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
            index === 1 ? 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600' :
            index === 2 ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
            'bg-gray-50 dark:bg-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              index === 0 ? 'bg-yellow-400 text-white' :
              index === 1 ? 'bg-gray-400 text-white' :
              index === 2 ? 'bg-orange-400 text-white' :
              'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            }`}>
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{entry.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {entry.accuracy}% accuracy
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-blue-600 dark:text-blue-400">{entry.score}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{entry.total_questions}q</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Pet Detective API
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          API routes are being tested. Check the endpoints below:
        </p>
        <div className="space-y-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <code className="text-sm text-blue-800 dark:text-blue-200">
              GET /api/health
            </code>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
            <code className="text-sm text-green-800 dark:text-green-200">
              POST /api/game/start
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

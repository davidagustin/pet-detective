'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Auth from '../components/Auth'
import Leaderboard from '../components/Leaderboard'
import DynamicModelSelector from '../components/DynamicModelSelector'
import EnhancedPetGame from '../components/EnhancedPetGame'
import ImageSegmentation from '../components/ImageSegmentation'
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
  }, [])

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
  const [user, setUser] = useState<any>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Snackbar hook
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar()

  const [selectedModel, setSelectedModel] = useState('resnet')
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null)
  const [showDynamicModelSelector, setShowDynamicModelSelector] = useState(false)
  const [showSegmentation, setShowSegmentation] = useState(false)
  const [predictions, setPredictions] = useState<{ [key: string]: number } | null>(null)
  const [isLoading, setIsLoading] = useLoadingState(false)
  const [error, setError] = useErrorState()
  const [success, setSuccess] = useSuccessState()
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Accessibility hooks
  const { isDarkMode, toggleDarkMode } = useAccessibility()

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Separate useEffect for handling auth callback messages to avoid infinite loops
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for query parameters
      const urlParams = new URLSearchParams(window.location.search)
      let authSuccess = urlParams.get('success')
      let authError = urlParams.get('error')
      let errorCode = urlParams.get('error_code')
      let errorDescription = urlParams.get('error_description')


      // Check for hash parameters (Supabase often uses hash-based routing)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      if (!authError && hashParams.get('error')) {
        authError = hashParams.get('error')
        errorCode = hashParams.get('error_code')
        errorDescription = hashParams.get('error_description')
      }
      
      // Also check for hash-based success parameters
      if (!authSuccess && hashParams.get('access_token')) {
        authSuccess = 'auth_success'
      }

      // Only process if there are actually parameters to handle
      if (!authSuccess && !authError) {
        return
      }

      if (authSuccess === 'auth_success') {
        showSnackbar('Successfully signed in!', 'success')
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (authSuccess === 'email_confirmed') {
        showSnackbar('Email confirmed successfully! You are now signed in.', 'success')
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (authError) {
        let errorMessage = 'Authentication failed'
        
        if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
          errorMessage = 'Email confirmation link has expired. Please request a new one.'
        } else if (errorCode === 'signup_disabled') {
          errorMessage = 'Account registration is currently disabled.'
        } else if (errorDescription?.includes('Email link is invalid') || errorDescription?.includes('invalid')) {
          errorMessage = 'Invalid email confirmation link. Please request a new one.'
        } else if (authError === 'access_denied') {
          errorMessage = 'Access denied. The email confirmation link may have expired or is invalid.'
        } else if (authError === 'auth_callback_error') {
          errorMessage = errorDescription || 'Failed to confirm email. Please try again or request a new confirmation email.'
        } else if (authError === 'auth_failed') {
          errorMessage = 'Authentication failed. Please try again.'
        } else if (authError === 'no_session') {
          errorMessage = 'No active session found.'
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        }
        
        showSnackbar(errorMessage, 'error')
        // Clean up URL (both search params and hash)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    // Only run once on mount
    handleAuthCallback()
  }, [showSnackbar])



  const handleScoreUpdate = (newScore: number, newTotal: number) => {
    setScore(newScore)
    setTotalQuestions(newTotal)
  }

  const handleDynamicModelSelect = (modelName: string, modelType: string) => {
    setSelectedModelName(modelName)
    setSelectedModel(modelType)
  }



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Global Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
        position="top"
      />

      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🐕 Pet Detective</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* GitHub Link */}
              <a
                href="https://github.com/davidagustin/pet-detective"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                aria-label="View on GitHub"
                title="View source code on GitHub"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              
              {/* Dark Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleDarkMode}
                  className="btn btn-secondary text-xs"
                  aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                  title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                  <ScreenReaderOnly>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</ScreenReaderOnly>
                  <span aria-hidden="true">{isDarkMode ? '☀️' : '🌙'}</span>
                </button>
              </div>
              
              {user ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-300" aria-label={`Welcome, ${user.user_metadata?.username || user.email?.split('@')[0]}`}>
                    Welcome, {user.user_metadata?.username || user.email?.split('@')[0]}!
                  </span>
                  
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                    aria-label="Settings"
                    title="Account Settings"
                  >
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      setUser(null)
                    }}
                    className="btn btn-secondary flex items-center"
                    aria-label="Sign out"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn btn-success"
                  aria-label="Sign in to access additional features"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <Auth 
              onAuthSuccess={() => setShowAuth(false)} 
              onClose={() => setShowAuth(false)}
              onShowSnackbar={showSnackbar}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && user && (
        <Settings 
          user={user} 
          onClose={() => setShowSettings(false)}
          onUserUpdate={(updatedUser) => setUser(updatedUser)}
          onShowSnackbar={showSnackbar}
        />
      )}



      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowSegmentation(false)
                setShowDynamicModelSelector(false)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !showSegmentation && !showDynamicModelSelector
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              🎮 Game & Predictions
            </button>
            <button
              onClick={() => {
                setShowSegmentation(false)
                setShowDynamicModelSelector(true)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showDynamicModelSelector
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              🤖 Model Selection
            </button>
            <button
              onClick={() => {
                setShowSegmentation(true)
                setShowDynamicModelSelector(false)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showSegmentation
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              🔍 Image Segmentation
            </button>
          </div>
        </div>

        {/* Model Selection Section */}
        {showDynamicModelSelector && (
          <div className="mb-8">
            <DynamicModelSelector
              selectedModel={selectedModelName || selectedModel}
              onModelSelect={handleDynamicModelSelect}
            />
          </div>
        )}

        {/* Main Content */}
        {showSegmentation ? (
          /* Segmentation Section */
          <div>
            <ImageSegmentation />
          </div>
        ) : !showDynamicModelSelector ? (
          <div className="max-w-7xl mx-auto">
            {/* Game and Leaderboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Enhanced Game Section */}
              <div className="lg:col-span-2">
                <EnhancedPetGame
                  selectedModel={selectedModel}
                  selectedModelName={selectedModelName}
                  user={user}
                  onScoreUpdate={handleScoreUpdate}
                />
              </div>
              
              {/* Global Leaderboard */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sticky top-4 max-h-[600px] overflow-y-auto">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                    🏆 Global Leaderboard
                  </h2>
                  {config.supabase.url === 'https://placeholder.supabase.co' && (
                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                      <p className="text-blue-800 dark:text-blue-300">
                        📋 Showing demo data. Configure Supabase to enable real leaderboard tracking.
                      </p>
                    </div>
                  )}
                  <CompactLeaderboard />
                </div>
              </div>
            </div>
          </div>
        ) : null}



        {/* Game Stats */}
        {!showSegmentation && !showDynamicModelSelector && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">📊 Game Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{totalQuestions}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Questions Answered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

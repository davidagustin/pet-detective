'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Auth from '@/components/Auth'
import Leaderboard from '@/components/Leaderboard'
import DynamicModelSelector from '@/components/DynamicModelSelector'
import EnhancedPetGame from '@/components/EnhancedPetGame'
import ImageSegmentation from '@/components/ImageSegmentation'
import { apiClient } from '@/lib/api-client'
import { config } from '@/lib/config'
import { 
  useAccessibility, 
  useLoadingState, 
  useErrorState, 
  useSuccessState,
  accessibilityUtils,
  ScreenReaderOnly 
} from '@/lib/accessibility'

const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
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
  const { isHighContrast, isReducedMotion, toggleHighContrast, toggleReducedMotion } = useAccessibility()

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

    // Handle auth callback messages
    const urlParams = new URLSearchParams(window.location.search)
    const authSuccess = urlParams.get('success')
    const authError = urlParams.get('error')

    if (authSuccess === 'auth_success') {
      alert('Successfully signed in!')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (authError) {
      let errorMessage = 'Authentication failed'
      if (authError === 'auth_failed') {
        errorMessage = 'Authentication failed. Please try again.'
      } else if (authError === 'no_session') {
        errorMessage = 'No active session found.'
      }
      alert(errorMessage)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    return () => subscription.unsubscribe()
  }, [])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setPredictions(null)
    setError(null)
    setSuccess(null)

    try {
      const data = await apiClient.predictPetBreed(file, selectedModel, selectedModelName || undefined)
      setPredictions(data)
      setSuccess('Image analyzed successfully!')
      accessibilityUtils.announce('Image analysis completed')
    } catch (error: any) {
      setError(error.message || 'Failed to analyze image')
      accessibilityUtils.announce(`Error: ${error.message}`, 'assertive')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScoreUpdate = (newScore: number, newTotal: number) => {
    setScore(newScore)
    setTotalQuestions(newTotal)
  }

  const handleDynamicModelSelect = (modelName: string, modelType: string) => {
    setSelectedModelName(modelName)
    setSelectedModel(modelType)
  }

  const trainModel = async () => {
    if (!user) {
      setError('Please sign in to train models')
      accessibilityUtils.announce('Authentication required to train models', 'assertive')
      return
    }

    if (!config.features.enableTraining) {
      setError('Model training is not available in production')
      accessibilityUtils.announce('Model training is not available in production', 'assertive')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const trainingParams = {
        epochs: 5,
        batch_size: 32,
        learning_rate: 0.001,
        model_type: selectedModel,
        scheduler_type: 'cosine',
        weight_decay: 1e-4,
        dropout_rate: 0.5,
        early_stopping_patience: 5,
        enable_tuning: false,
        tuning_method: 'optuna',
        n_trials: 10
      }

      const data = await apiClient.trainModel(trainingParams)
      setSuccess('Model training started! Check the models directory for the trained model.')
      accessibilityUtils.announce('Model training started successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to start training')
      accessibilityUtils.announce(`Training error: ${error.message}`, 'assertive')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isHighContrast ? 'high-contrast' : ''} ${isReducedMotion ? 'reduce-motion' : ''}`}>
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🐕 Pet Detective</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Accessibility Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleHighContrast}
                  className="btn btn-secondary text-xs"
                  aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
                  title={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
                >
                  <ScreenReaderOnly>High Contrast</ScreenReaderOnly>
                  <span aria-hidden="true">🎨</span>
                </button>
                <button
                  onClick={toggleReducedMotion}
                  className="btn btn-secondary text-xs"
                  aria-label={`${isReducedMotion ? 'Disable' : 'Enable'} reduced motion`}
                  title={`${isReducedMotion ? 'Disable' : 'Enable'} reduced motion`}
                >
                  <ScreenReaderOnly>Reduced Motion</ScreenReaderOnly>
                  <span aria-hidden="true">🎬</span>
                </button>
              </div>
              
              {user ? (
                <>
                  <span className="text-sm text-gray-600" aria-label={`Welcome, ${user.user_metadata?.username || user.email?.split('@')[0]}`}>
                    Welcome, {user.user_metadata?.username || user.email?.split('@')[0]}!
                  </span>
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="btn btn-primary"
                    aria-expanded={showLeaderboard}
                    aria-controls="leaderboard-section"
                  >
                    {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <Auth onAuthSuccess={() => setShowAuth(false)} onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">🏆 Leaderboard</h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <Leaderboard />
          </div>
        </div>
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
              className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium transition-colors"
            >
              🎮 Game & Predictions
            </button>
            <button
              onClick={() => {
                setShowSegmentation(false)
                setShowDynamicModelSelector(true)
              }}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
            >
              🤖 Model Selection
            </button>
            <button
              onClick={() => {
                setShowSegmentation(true)
                setShowDynamicModelSelector(false)
              }}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
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

        {/* Main Content Grid */}
        {!showSegmentation ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Image Upload Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">🔍 Upload Pet Image</h2>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Choose Image
                  </button>
                  <p className="text-gray-500 mt-2">Upload a pet image to get breed predictions</p>
                </div>

                {isLoading && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Analyzing image...</p>
                  </div>
                )}

                {predictions && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-800">Predictions:</h3>
                    {Object.entries(predictions)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([breed, probability]) => (
                        <div key={breed} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span className="font-medium">{breed}</span>
                          <span className="text-blue-600 font-semibold">
                            {(probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Game Section */}
            <div>
              <EnhancedPetGame
                selectedModel={selectedModel}
                selectedModelName={selectedModelName}
                user={user}
                onScoreUpdate={handleScoreUpdate}
              />
            </div>
          </div>
        ) : (
          /* Segmentation Section */
          <div>
            <ImageSegmentation />
          </div>
        )}

        {/* Model Training Section */}
        {user && !showSegmentation && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">🤖 Train New Model</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Type: {selectedModel.toUpperCase()}
                  </label>
                  <p className="text-sm text-gray-600">
                    Selected Model: {selectedModelName || 'Default'}
                  </p>
                </div>
                <div className="text-right">
                  <button
                    onClick={trainModel}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Train Model
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Training will create a new model in the models directory. This may take several minutes.
              </p>
            </div>
          </div>
        )}

        {/* Game Stats */}
        {!showSegmentation && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">📊 Game Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <div className="text-sm text-gray-600">Total Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{totalQuestions}</div>
                <div className="text-sm text-gray-600">Questions Answered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

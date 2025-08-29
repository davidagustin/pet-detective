'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Auth from '../components/Auth'
import Leaderboard from '../components/Leaderboard'
import DynamicModelSelector from '../components/DynamicModelSelector'
import EnhancedPetGame from '../components/EnhancedPetGame'
import ImageSegmentation from '../components/ImageSegmentation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
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
  const [isLoading, setIsLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setPredictions(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('model_type', selectedModel)
      if (selectedModelName) {
        formData.append('model_name', selectedModelName)
      }

      const response = await fetch('http://localhost:5328/api/predict', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (response.ok) {
        setPredictions(data)
      } else {
        console.error('Prediction failed:', data.error)
        alert('Failed to analyze image: ' + data.error)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image')
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
      alert('Please sign in to train models')
      return
    }

    try {
      const response = await fetch('http://localhost:5328/api/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      })

      const data = await response.json()
      if (response.ok) {
        console.log('Training started:', data)
        alert('Model training started! Check the models directory for the trained model.')
      } else {
        console.error('Training failed:', data.error)
        alert('Failed to start training: ' + data.error)
      }
    } catch (error) {
      console.error('Error starting training:', error)
      alert('Failed to start training')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🐕 Pet Detective</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">
                    Welcome, {user.user_metadata?.username || user.email?.split('@')[0]}!
                  </span>
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      setUser(null)
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Snackbar, { useSnackbar } from '@/components/Snackbar'
import Settings from '@/components/Settings'
import EnhancedPetGame from '@/components/EnhancedPetGame'
import DynamicModelSelector from '@/components/DynamicModelSelector'

export default function Home() {
  const [showSettings, setShowSettings] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Snackbar hook
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar()

  const [selectedModel, setSelectedModel] = useState('resnet')
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null)
  const [showDynamicModelSelector, setShowDynamicModelSelector] = useState(false)
  const [predictions, setPredictions] = useState<{ [key: string]: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)

  // Dark mode functionality
  useEffect(() => {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    
    setIsDarkMode(shouldUseDark)
    
    if (shouldUseDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Handle dynamic model selection
  const handleDynamicModelSelect = (modelType: string, modelName: string | null) => {
    setSelectedModel(modelType)
    setSelectedModelName(modelName)
    setShowDynamicModelSelector(false)
    showSnackbar(`Model updated to ${modelName || modelType}`, 'success')
  }

  // Handle score updates from the game
  const handleScoreUpdate = (newScore: number, newTotalQuestions: number, newCorrectAnswers: number) => {
    setScore(newScore)
    setTotalQuestions(newTotalQuestions)
    setCorrectAnswers(newCorrectAnswers)
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
              {/* About Link */}
              <Link
                href="/about"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                aria-label="About Pet Detective"
                title="Learn about the game"
              >
                About
              </Link>

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
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowDynamicModelSelector(false)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !showDynamicModelSelector
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              🎮 Game & Predictions
            </button>
            <button
              onClick={() => {
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
        {!showDynamicModelSelector ? (
          <div className="max-w-7xl mx-auto">
            {/* Game Section - Full Width */}
            <div className="w-full">
              <EnhancedPetGame
                selectedModel={selectedModel}
                selectedModelName={selectedModelName}
                user={null}
                onScoreUpdate={handleScoreUpdate}
              />
            </div>
          </div>
        ) : null}

        {/* Game Stats */}
        {!showDynamicModelSelector && (
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
                  {totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}%
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

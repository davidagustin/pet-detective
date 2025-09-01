'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { apiClient } from '../lib/api-client'
import type { User } from '@supabase/supabase-js'

interface GameState {
  image: string
  options: string[]
  correctAnswer: string
  aiPrediction: string
  aiConfidence: number
  imageMetadata?: {
    animal_type: 'cat' | 'dog'
    filename: string
  }
}

interface EnhancedPetGameProps {
  selectedModel: string
  selectedModelName: string | null
  user: User | null
  onScoreUpdate: (score: number, total: number, correct: number) => void
}

export default function EnhancedPetGame({ selectedModel, selectedModelName, user, onScoreUpdate }: EnhancedPetGameProps) {
  // Get time limit based on game mode
  const getTimeLimit = (mode: 'easy' | 'medium' | 'hard'): number => {
    switch (mode) {
      case 'easy': return 45  // More time for easy mode
      case 'medium': return 30 // Standard time for medium
      case 'hard': return 20   // Less time for hard mode
      default: return 30
    }
  }

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [streak, setStreak] = useState(0)
  const [gameMode, setGameMode] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [animalFilter, setAnimalFilter] = useState<'cats' | 'dogs' | 'both'>('both')
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15 | 20>(10)
  const [showResults, setShowResults] = useState(false)
  const [timeLeft, setTimeLeft] = useState(getTimeLimit('medium'))
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)



  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isTimerActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (timeLeft === 0 && gameState) {
      handleTimeout()
    }
    return () => clearTimeout(timer)
  }, [timeLeft, isTimerActive, gameState]) // eslint-disable-line react-hooks/exhaustive-deps

  const startNewGame = async () => {
    setIsLoading(true)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setShowResults(false)
    setTimeLeft(getTimeLimit(gameMode))
    setIsTimerActive(false)
    setImageLoading(false)
    setImageError(false)

    try {
      console.log('Starting game with animal filter:', animalFilter)
      const data = await apiClient.startGame(selectedModel, selectedModelName || undefined, gameMode, animalFilter)
      console.log('Game data received:', data.imageMetadata)
      setGameState(data)
      setIsTimerActive(true)
    } catch (error: unknown) {
      console.error('Error starting game:', error)
      alert('Failed to start game: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerSelect = (answer: string) => {
    if (!isTimerActive) return
    setSelectedAnswer(answer)
  }

  const checkAnswer = async () => {
    if (!selectedAnswer || !gameState) return

    setIsTimerActive(false)
    setIsLoading(true)

    try {
      const data = await apiClient.checkGameAnswer(selectedAnswer, {
        correct_answer: gameState.correctAnswer,
        user_id: user?.id,
        username: user?.user_metadata?.username || user?.email?.split('@')[0],
        model_type: selectedModel,
        model_name: selectedModelName || undefined,
        game_mode: gameMode,
        time_taken: getTimeLimit(gameMode) - timeLeft
      })
      
      setIsCorrect(data.is_correct)
      setShowResults(true)
      
      if (data.is_correct) {
        const newStreak = streak + 1
        setStreak(newStreak)
        const points = calculatePoints(data.time_taken, newStreak, gameMode)
        setScore(score + points)
        setCorrectAnswers(correctAnswers + 1)
      } else {
        setStreak(0)
      }
      
      const newTotalQuestions = totalQuestions + 1
      setTotalQuestions(newTotalQuestions)
      onScoreUpdate(score, newTotalQuestions, correctAnswers)
      
      // Check if game should end
      if (newTotalQuestions >= questionCount) {
        // Game completed - show final results
        setTimeout(() => {
          onScoreUpdate(score, newTotalQuestions, correctAnswers)
          // Reset game state for new game
          setGameState(null)
          setSelectedAnswer(null)
          setIsCorrect(null)
          setShowResults(false)
          setIsTimerActive(false)
          setTimeLeft(getTimeLimit(gameMode))
        }, 2000)
      }
    } catch (error: unknown) {
      console.error('Error checking answer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTimeout = () => {
    setIsTimerActive(false)
    setIsCorrect(false)
    setShowResults(true)
    setStreak(0)
    const newTotalQuestions = totalQuestions + 1
    setTotalQuestions(newTotalQuestions)
    onScoreUpdate(score, newTotalQuestions, correctAnswers)
    
    // Check if game should end
    if (newTotalQuestions >= questionCount) {
      // Game completed - show final results
      setTimeout(() => {
        onScoreUpdate(score, newTotalQuestions, correctAnswers)
        // Reset game state for new game
        setGameState(null)
        setSelectedAnswer(null)
        setIsCorrect(null)
        setShowResults(false)
        setIsTimerActive(false)
        setTimeLeft(getTimeLimit(gameMode))
      }, 2000)
    }
  }

  const calculatePoints = (timeTaken: number, currentStreak: number, mode: 'easy' | 'medium' | 'hard') => {
    const basePoints = 10
    const timeLimit = getTimeLimit(mode)
    const timeBonus = Math.max(0, timeLimit - timeTaken) * 0.5
    const streakBonus = Math.min(currentStreak * 2, 10)
    const modeMultiplier = mode === 'easy' ? 0.7 : mode === 'hard' ? 1.5 : 1.0
    
    return Math.round((basePoints + timeBonus + streakBonus) * modeMultiplier)
  }

  const getDifficultyDescription = (mode: 'easy' | 'medium' | 'hard') => {
    const timeLimit = getTimeLimit(mode)
    switch (mode) {
      case 'easy': return `Easy - 4 options, ${timeLimit}s time limit`
      case 'medium': return `Medium - 4 options, ${timeLimit}s time limit`
      case 'hard': return `Hard - 6 options, ${timeLimit}s time limit`
      default: return 'Medium'
    }
  }

  const getTimeColor = () => {
    if (timeLeft > 20) return 'text-green-600'
    if (timeLeft > 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Helper functions for model display
  const getModelDisplayName = (model: string) => {
    switch (model) {
      case 'resnet50':
        return 'ResNet-50'
      case 'mobilenetv2':
        return 'MobileNet V2'
      case 'alexnet':
        return 'AlexNet'
      default:
        return model.toUpperCase()
    }
  }

  const getModelDescription = (model: string) => {
    switch (model) {
      case 'resnet50':
        return 'Deep Residual Network - High Accuracy'
      case 'mobilenetv2':
        return 'Mobile-Optimized - Fast Inference'
      case 'alexnet':
        return 'Classic CNN - Balanced Performance'
      default:
        return 'AI Model'
    }
  }

  const getModelAccuracy = (model: string) => {
    switch (model) {
      case 'resnet50':
        return '92'
      case 'mobilenetv2':
        return '88'
      case 'alexnet':
        return '85'
      default:
        return '85'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">🎮 Pet Detective Game</h2>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">Score: <span className="font-bold text-blue-600">{score}</span></div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Streak: <span className="font-bold text-green-600">{streak}</span></div>
        </div>
      </div>

      {/* Game Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Game Mode:</label>
        <div className="flex space-x-2">
          {(['easy', 'medium', 'hard'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              disabled={gameState !== null || isLoading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                gameMode === mode
                  ? 'bg-blue-500 text-white'
                  : gameState !== null || isLoading
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">{getDifficultyDescription(gameMode)}</p>
      </div>

      {/* Animal Filter Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Animal Type:</label>
        <div className="flex space-x-2">
          {(['cats', 'dogs', 'both'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                console.log('Setting animal filter to:', filter)
                setAnimalFilter(filter)
              }}
              disabled={gameState !== null || isLoading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                animalFilter === filter
                  ? 'bg-green-500 text-white'
                  : gameState !== null || isLoading
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {filter === 'cats' ? '🐱 Cats Only' : filter === 'dogs' ? '🐕 Dogs Only' : '🐾 Both'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {animalFilter === 'cats' ? 'Quiz will only show cat breeds' : 
           animalFilter === 'dogs' ? 'Quiz will only show dog breeds' : 
           'Quiz will show both cats and dogs'}
        </p>
      </div>

      {/* Question Count Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Questions:</label>
        <div className="flex space-x-2">
          {([5, 10, 15, 20] as const).map((count) => (
            <button
              key={count}
              onClick={() => {
                console.log('Setting question count to:', count)
                setQuestionCount(count)
              }}
              disabled={gameState !== null || isLoading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                questionCount === count
                  ? 'bg-purple-500 text-white'
                  : gameState !== null || isLoading
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Game will end after {questionCount} questions (Current state: {questionCount})
        </p>
      </div>

      {/* Game Area */}
      {!gameState ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🐕</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Ready to Play?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Test your pet breed knowledge against our AI!</p>
          
          {/* Model Competition Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-blue-800 dark:text-blue-300">You&apos;ll compete against:</span>
            </div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-1">
              {getModelDisplayName(selectedModel)}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-400 mb-2">
              {getModelDescription(selectedModel)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-300">
              AI Accuracy: {getModelAccuracy(selectedModel)}%
            </div>
          </div>
          
          <button
            onClick={startNewGame}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Start New Game'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timer - Prominent Center Position */}
          <div className="text-center mb-4">
            <div className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-2xl font-bold ${getTimeColor()} bg-white dark:bg-gray-800 shadow-lg border-2 ${
              timeLeft > 20 ? 'border-green-500' : timeLeft > 10 ? 'border-yellow-500' : 'border-red-500'
            }`}>
              ⏱️ {timeLeft}s
            </div>
          </div>

          {/* AI Model Competition Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-4 shadow-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🤖</div>
                <div>
                  <div className="text-sm opacity-90">You&apos;re competing against:</div>
                  <div className="text-lg font-bold">{getModelDisplayName(selectedModel)}</div>
                  <div className="text-xs opacity-75">{getModelDescription(selectedModel)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-75">Accuracy</div>
                <div className="text-lg font-bold">{getModelAccuracy(selectedModel)}%</div>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setGameState(null)
                setSelectedAnswer(null)
                setIsCorrect(null)
                setShowResults(false)
                setIsTimerActive(false)
                setTimeLeft(30)
                // Reset to initial state but keep score and streak
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              title="Back to start screen"
            >
              🏠 Back to Model Selection
            </button>
          </div>

          {/* Game Image */}
          <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg shadow-md overflow-hidden">
            <div className="flex justify-center items-center min-h-[280px] sm:min-h-[320px] max-h-[400px] p-2 sm:p-4">
              {imageLoading && (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading image...</span>
                </div>
              )}
              {imageError && (
                <div className="flex flex-col items-center justify-center space-y-2 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl">🖼️</div>
                  <div className="text-sm">Image could not be loaded</div>
                  <div className="text-xs">Please try again</div>
                </div>
              )}
                            {!imageLoading && !imageError && (
                <img
                  src={gameState.image}
                  alt="Pet to guess"
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    maxHeight: 'min(360px, 60vh)',
                    maxWidth: '100%'
                  }}
                  onLoadStart={() => setImageLoading(true)}
                  onLoad={(e) => {
                    setImageLoading(false)
                    setImageError(false)
                    // Ensure image is properly loaded and visible
                    const img = e.currentTarget
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                      console.warn('Image has zero dimensions:', gameState.image)
                    }
                  }}
                  onError={(e) => {
                    setImageLoading(false)
                    setImageError(true)
                    console.error('Image failed to load:', gameState.image)
                  }}
                />
              )}
            </div>
            {/* Pet Type Indicator */}
            <div className="absolute top-4 left-4 bg-white dark:bg-gray-700 bg-opacity-90 dark:bg-opacity-90 px-3 py-1 rounded-full shadow-md">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {gameState.imageMetadata?.animal_type === 'cat' ? '🐱 Cat Breeds' : '🐕 Dog Breeds'}
              </span>
            </div>
            {showResults && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">
                    {isCorrect ? '✅' : '❌'}
                  </div>
                  <div className="text-xl font-bold">
                    {isCorrect ? 'Correct!' : 'Wrong!'}
                  </div>
                  <div className="text-sm">
                    Correct answer: {gameState.correctAnswer}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Answer Options */}
          {!showResults && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-center">
                What {gameState.imageMetadata?.animal_type || 'pet'} breed is this?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gameState.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={!isTimerActive}
                    className={`p-4 text-left rounded-lg border-2 transition-all text-gray-800 dark:text-gray-200 ${
                      selectedAnswer === option
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 shadow-md'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
                    } ${!isTimerActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!showResults && selectedAnswer && (
              <button
                onClick={checkAnswer}
                disabled={isLoading}
                className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Checking...' : 'Submit Answer'}
              </button>
            )}
            
            {showResults && (
              <button
                onClick={startNewGame}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {totalQuestions >= questionCount ? 'Start New Game' : 'Next Question'}
              </button>
            )}
          </div>

          {/* Results Display */}
          {showResults && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Round Results:</h4>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  vs {getModelDisplayName(selectedModel)} ({getModelAccuracy(selectedModel)}% accuracy)
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Your Answer:</span>
                  <div className="font-medium flex items-center space-x-2">
                    <span className={selectedAnswer === gameState.correctAnswer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {selectedAnswer}
                    </span>
                    <span className={selectedAnswer === gameState.correctAnswer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {selectedAnswer === gameState.correctAnswer ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Correct Answer:</span>
                  <div className="font-medium text-green-600 dark:text-green-400">{gameState.correctAnswer}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">AI Prediction:</span>
                  <div className="font-medium flex items-center space-x-2">
                    <span className={gameState.aiPrediction === gameState.correctAnswer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {gameState.aiPrediction}
                    </span>
                    <span className={gameState.aiPrediction === gameState.correctAnswer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {gameState.aiPrediction === gameState.correctAnswer ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">AI Confidence:</span>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{(gameState.aiConfidence * 100).toFixed(1)}%</div>
                </div>
              </div>
              {/* Competition Result */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Competition Result: </span>
                  <span className={`font-semibold ${
                    selectedAnswer === gameState.correctAnswer && gameState.aiPrediction === gameState.correctAnswer 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : selectedAnswer === gameState.correctAnswer 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {selectedAnswer === gameState.correctAnswer && gameState.aiPrediction === gameState.correctAnswer 
                      ? '🤝 It\'s a tie! Both correct!' 
                      : selectedAnswer === gameState.correctAnswer 
                      ? '✅ You beat the AI!' 
                      : gameState.aiPrediction === gameState.correctAnswer 
                      ? '❌ AI was more accurate' 
                      : '❌ Both wrong - AI wins by default'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Progress */}
      {gameState && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {totalQuestions} / {questionCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((totalQuestions / questionCount) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Game Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Questions</div>
            <div className="font-bold text-gray-800 dark:text-gray-200">{totalQuestions}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Accuracy</div>
            <div className="font-bold text-gray-800 dark:text-gray-200">
              {totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}%
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Total Score</div>
            <div className="font-bold text-gray-800 dark:text-gray-200">{score}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Best Streak</div>
            <div className="font-bold text-gray-800 dark:text-gray-200">{streak}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

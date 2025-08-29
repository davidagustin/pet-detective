'use client'

import { useState, useEffect } from 'react'

interface GameState {
  image: string
  options: string[]
  correctAnswer: string
  aiPrediction: string
  aiConfidence: number
}

interface EnhancedPetGameProps {
  selectedModel: string
  selectedModelName: string | null
  user: any
  onScoreUpdate: (score: number, total: number) => void
}

export default function EnhancedPetGame({ selectedModel, selectedModelName, user, onScoreUpdate }: EnhancedPetGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [streak, setStreak] = useState(0)
  const [gameMode, setGameMode] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [showResults, setShowResults] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerActive, setIsTimerActive] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isTimerActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (timeLeft === 0 && gameState) {
      handleTimeout()
    }
    return () => clearTimeout(timer)
  }, [timeLeft, isTimerActive, gameState])

  const startNewGame = async () => {
    setIsLoading(true)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setShowResults(false)
    setTimeLeft(30)
    setIsTimerActive(false)

    try {
      const response = await fetch('http://localhost:5328/api/game/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_type: selectedModel,
          model_name: selectedModelName,
          game_mode: gameMode
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setGameState(data)
        setIsTimerActive(true)
      } else {
        alert('Failed to start game: ' + data.error)
      }
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Failed to start game')
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
      const response = await fetch('http://localhost:5328/api/game/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_answer: selectedAnswer,
          correct_answer: gameState.correctAnswer,
          user_id: user?.id,
          username: user?.user_metadata?.username || user?.email?.split('@')[0],
          model_type: selectedModel,
          model_name: selectedModelName,
          game_mode: gameMode,
          time_taken: 30 - timeLeft
        }),
      })
      const data = await response.json()
      
      if (response.ok) {
        setIsCorrect(data.is_correct)
        setShowResults(true)
        
        if (data.is_correct) {
          const newStreak = streak + 1
          setStreak(newStreak)
          const points = calculatePoints(data.time_taken, newStreak, gameMode)
          setScore(score + points)
        } else {
          setStreak(0)
        }
        
        setTotalQuestions(totalQuestions + 1)
        onScoreUpdate(score, totalQuestions + 1)
      }
    } catch (error) {
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
    setTotalQuestions(totalQuestions + 1)
    onScoreUpdate(score, totalQuestions + 1)
  }

  const calculatePoints = (timeTaken: number, currentStreak: number, mode: string) => {
    let basePoints = 10
    let timeBonus = Math.max(0, 30 - timeTaken) * 0.5
    let streakBonus = Math.min(currentStreak * 2, 10)
    let modeMultiplier = mode === 'easy' ? 0.7 : mode === 'hard' ? 1.5 : 1.0
    
    return Math.round((basePoints + timeBonus + streakBonus) * modeMultiplier)
  }

  const getDifficultyDescription = (mode: string) => {
    switch (mode) {
      case 'easy': return 'Easy - 4 options, longer time'
      case 'medium': return 'Medium - 4 options, normal time'
      case 'hard': return 'Hard - 6 options, shorter time'
      default: return 'Medium'
    }
  }

  const getTimeColor = () => {
    if (timeLeft > 20) return 'text-green-600'
    if (timeLeft > 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">🎮 Pet Detective Game</h2>
        <div className="text-right">
          <div className="text-sm text-gray-600">Score: <span className="font-bold text-blue-600">{score}</span></div>
          <div className="text-sm text-gray-600">Streak: <span className="font-bold text-green-600">{streak}</span></div>
        </div>
      </div>

      {/* Game Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Game Mode:</label>
        <div className="flex space-x-2">
          {(['easy', 'medium', 'hard'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                gameMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">{getDifficultyDescription(gameMode)}</p>
      </div>

      {/* Game Area */}
      {!gameState ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🐕</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Play?</h3>
          <p className="text-gray-600 mb-6">Test your pet breed knowledge against our AI!</p>
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
          {/* Timer and AI Info */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              AI Model: <span className="font-medium">{selectedModelName || selectedModel.toUpperCase()}</span>
            </div>
            <div className={`text-lg font-bold ${getTimeColor()}`}>
              ⏱️ {timeLeft}s
            </div>
          </div>

          {/* Game Image */}
          <div className="relative">
            <img
              src={gameState.image}
              alt="Pet to guess"
              className="w-full h-80 object-cover rounded-lg shadow-md"
            />
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
              <h3 className="font-semibold text-gray-800 text-center">What breed is this pet?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gameState.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={!isTimerActive}
                    className={`p-4 text-left rounded-lg border-2 transition-all ${
                      selectedAnswer === option
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
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
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Next Question
              </button>
            )}
          </div>

          {/* Results Display */}
          {showResults && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Round Results:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Your Answer:</span>
                  <div className="font-medium">{selectedAnswer}</div>
                </div>
                <div>
                  <span className="text-gray-600">Correct Answer:</span>
                  <div className="font-medium text-green-600">{gameState.correctAnswer}</div>
                </div>
                <div>
                  <span className="text-gray-600">AI Prediction:</span>
                  <div className="font-medium">{gameState.aiPrediction}</div>
                </div>
                <div>
                  <span className="text-gray-600">AI Confidence:</span>
                  <div className="font-medium">{(gameState.aiConfidence * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-gray-600">Questions</div>
            <div className="font-bold text-gray-800">{totalQuestions}</div>
          </div>
          <div>
            <div className="text-gray-600">Accuracy</div>
            <div className="font-bold text-gray-800">
              {totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%
            </div>
          </div>
          <div>
            <div className="text-gray-600">Best Streak</div>
            <div className="font-bold text-gray-800">{streak}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

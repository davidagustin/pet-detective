'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            🐕 About Pet Detective
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Test your pet breed knowledge and compete against AI models in this exciting guessing game!
          </p>
        </div>

        {/* What is Pet Detective */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <span className="mr-3">🎯</span>
            What is Pet Detective?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                Pet Detective is an AI-powered pet breed recognition game that challenges you to identify 
                cat and dog breeds from images. But here's the twist - you're not just playing against 
                yourself, you're competing against real artificial intelligence models!
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Our advanced machine learning models (ResNet-50, MobileNet V2, and AlexNet) have been 
                trained on thousands of pet images and will make their own predictions. Can you beat the AI?
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-3">
                🏆 Key Features
              </h3>
              <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                <li>• Compete against real AI models</li>
                <li>• Multiple difficulty levels</li>
                <li>• Cat and dog breed recognition</li>
                <li>• Global leaderboards</li>
                <li>• Real-time scoring system</li>
                <li>• Mobile-friendly design</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How to Play */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <span className="mr-3">🎮</span>
            How to Play
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Getting Started
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Choose your settings:</strong> Select difficulty level, animal type (cats, dogs, or both), 
                      and number of questions (5, 10, 15, or 20).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Select an AI model:</strong> Choose which AI model you want to compete against 
                      (ResNet-50, MobileNet V2, or AlexNet).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Start the game:</strong> Click "Start New Game" and a pet image will appear.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Make your guess:</strong> Choose the correct breed from the options before time runs out.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Game Mechanics
              </h3>
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">⏱️ Time Limits</h4>
                  <ul className="text-green-700 dark:text-green-300 text-sm space-y-1">
                    <li>• <strong>Easy:</strong> 45 seconds per question</li>
                    <li>• <strong>Medium:</strong> 30 seconds per question</li>
                    <li>• <strong>Hard:</strong> 20 seconds per question</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">🎯 Difficulty Levels</h4>
                  <ul className="text-purple-700 dark:text-purple-300 text-sm space-y-1">
                    <li>• <strong>Easy:</strong> 4 options, longer time</li>
                    <li>• <strong>Medium:</strong> 4 options, standard time</li>
                    <li>• <strong>Hard:</strong> 6 options, shorter time</li>
                  </ul>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">🏆 Scoring System</h4>
                  <ul className="text-orange-700 dark:text-orange-300 text-sm space-y-1">
                    <li>• <strong>Base Points:</strong> 10 points per correct answer</li>
                    <li>• <strong>Time Bonus:</strong> Faster answers earn more points</li>
                    <li>• <strong>Streak Bonus:</strong> Consecutive correct answers multiply points</li>
                    <li>• <strong>Difficulty Multiplier:</strong> Harder modes earn more points</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Competition */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <span className="mr-3">🤖</span>
            AI Competition
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-3">
                🏆 ResNet-50
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                High-accuracy deep learning model with excellent breed recognition capabilities.
              </p>
              <div className="text-xs text-red-600 dark:text-red-400">
                <strong>Best for:</strong> Challenging competition
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-3">
                📱 MobileNet V2
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                Mobile-optimized model with good accuracy and fast inference times.
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <strong>Best for:</strong> Balanced gameplay
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-3">
                🚀 AlexNet
              </h3>
              <p className="text-green-700 dark:text-green-300 text-sm mb-3">
                Classic CNN architecture with proven performance in image classification.
              </p>
              <div className="text-xs text-green-600 dark:text-green-400">
                <strong>Best for:</strong> Beginners
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">🎯 Competition Results</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>🤝 Tie:</strong> Both you and AI get it correct
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>✅ You Win:</strong> You're correct, AI is wrong
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>❌ AI Wins:</strong> AI is correct, you're wrong
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>❌ Both Wrong:</strong> AI wins by default
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Breeds Covered */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <span className="mr-3">🐾</span>
            Breeds Covered
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <span className="mr-2">🐱</span>
                Cat Breeds (12 total)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600 dark:text-gray-300">• Abyssinian</div>
                <div className="text-gray-600 dark:text-gray-300">• Bengal</div>
                <div className="text-gray-600 dark:text-gray-300">• Birman</div>
                <div className="text-gray-600 dark:text-gray-300">• Bombay</div>
                <div className="text-gray-600 dark:text-gray-300">• British Shorthair</div>
                <div className="text-gray-600 dark:text-gray-300">• Egyptian Mau</div>
                <div className="text-gray-600 dark:text-gray-300">• Maine Coon</div>
                <div className="text-gray-600 dark:text-gray-300">• Persian</div>
                <div className="text-gray-600 dark:text-gray-300">• Ragdoll</div>
                <div className="text-gray-600 dark:text-gray-300">• Russian Blue</div>
                <div className="text-gray-600 dark:text-gray-300">• Siamese</div>
                <div className="text-gray-600 dark:text-gray-300">• Sphynx</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <span className="mr-2">🐕</span>
                Dog Breeds (25 total)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600 dark:text-gray-300">• American Bulldog</div>
                <div className="text-gray-600 dark:text-gray-300">• American Pit Bull Terrier</div>
                <div className="text-gray-600 dark:text-gray-300">• Basset Hound</div>
                <div className="text-gray-600 dark:text-gray-300">• Beagle</div>
                <div className="text-gray-600 dark:text-gray-300">• Boxer</div>
                <div className="text-gray-600 dark:text-gray-300">• Chihuahua</div>
                <div className="text-gray-600 dark:text-gray-300">• English Cocker Spaniel</div>
                <div className="text-gray-600 dark:text-gray-300">• English Setter</div>
                <div className="text-gray-600 dark:text-gray-300">• German Shorthaired</div>
                <div className="text-gray-600 dark:text-gray-300">• Great Pyrenees</div>
                <div className="text-gray-600 dark:text-gray-300">• Havanese</div>
                <div className="text-gray-600 dark:text-gray-300">• Japanese Chin</div>
                <div className="text-gray-600 dark:text-gray-300">• Keeshond</div>
                <div className="text-gray-600 dark:text-gray-300">• Leonberger</div>
                <div className="text-gray-600 dark:text-gray-300">• Miniature Pinscher</div>
                <div className="text-gray-600 dark:text-gray-300">• Newfoundland</div>
                <div className="text-gray-600 dark:text-gray-300">• Pomeranian</div>
                <div className="text-gray-600 dark:text-gray-300">• Pug</div>
                <div className="text-gray-600 dark:text-gray-300">• Saint Bernard</div>
                <div className="text-gray-600 dark:text-gray-300">• Samoyed</div>
                <div className="text-gray-600 dark:text-gray-300">• Scottish Terrier</div>
                <div className="text-gray-600 dark:text-gray-300">• Shiba Inu</div>
                <div className="text-gray-600 dark:text-gray-300">• Staffordshire Bull Terrier</div>
                <div className="text-gray-600 dark:text-gray-300">• Wheaten Terrier</div>
                <div className="text-gray-600 dark:text-gray-300">• Yorkshire Terrier</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips & Strategies */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <span className="mr-3">💡</span>
            Tips & Strategies
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                🎯 For Better Performance
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Start with Easy mode to learn the breeds</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Focus on distinctive features like coat patterns and face shapes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Pay attention to ear shapes and tail characteristics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Build streaks for bonus points</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Practice with specific animal types (cats or dogs only)</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                🏆 For High Scores
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Answer quickly to earn time bonuses</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Maintain answer streaks for multipliers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Try Hard mode for higher point multipliers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Compete against stronger AI models for more challenge</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Play regularly to improve your breed recognition skills</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Test Your Pet Knowledge?
            </h2>
            <p className="text-blue-100 mb-6 text-lg">
              Challenge yourself against AI models and see if you can become the ultimate Pet Detective!
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors text-lg"
            >
              Start Playing Now
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>
            Pet Detective uses advanced machine learning models trained on the Oxford-IIIT Pet Dataset.
          </p>
          <p className="mt-2">
            Built with Next.js, TypeScript, Tailwind CSS, and powered by PyTorch.
          </p>
        </div>
      </div>
    </div>
  )
}

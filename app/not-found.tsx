'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Go Back
          </button>
          
          <Link
            href="/"
            className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

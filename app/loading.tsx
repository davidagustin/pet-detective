export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Loading Pet Detective...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Preparing your game experience
        </p>
      </div>
    </div>
  )
}

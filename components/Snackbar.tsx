'use client'

import { useState, useEffect } from 'react'

export type SnackbarType = 'success' | 'error' | 'warning' | 'info'

interface SnackbarProps {
  message: string
  type: SnackbarType
  isVisible: boolean
  onClose: () => void
  duration?: number
  position?: 'top' | 'bottom'
}

export default function Snackbar({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
  position = 'top'
}: SnackbarProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
    }, 300) // Wait for animation to complete
  }

  const getSnackbarStyles = () => {
    const baseStyles = "fixed left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-full mx-4 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ease-in-out"
    
    const positionStyles = position === 'top' 
      ? `top-4 ${isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`
      : `bottom-4 ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`
    
    const typeStyles = {
      success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
      error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
      warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
      info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
    }

    return `${baseStyles} ${positionStyles} ${typeStyles[type]}`
  }

  const getIcon = () => {
    const iconClass = "w-5 h-5 flex-shrink-0"
    
    switch (type) {
      case 'success':
        return (
          <svg className={`${iconClass} text-green-500 dark:text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className={`${iconClass} text-red-500 dark:text-red-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={`${iconClass} text-yellow-500 dark:text-yellow-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className={`${iconClass} text-blue-500 dark:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (!isVisible && !isAnimating) return null

  return (
    <div className={getSnackbarStyles()}>
      <div className="flex items-center space-x-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Hook for managing snackbar state
export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<{
    message: string
    type: SnackbarType
    isVisible: boolean
  }>({
    message: '',
    type: 'info',
    isVisible: false
  })

  const showSnackbar = (message: string, type: SnackbarType = 'info') => {
    setSnackbar({
      message,
      type,
      isVisible: true
    })
  }

  const hideSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      isVisible: false
    }))
  }

  return {
    snackbar,
    showSnackbar,
    hideSnackbar
  }
}

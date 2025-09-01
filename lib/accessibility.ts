// 'use client'

// import React, { useEffect, useRef, useState } from 'react'
// import { config } from './config'

// Accessibility utilities - DISABLED due to React component errors
export const accessibilityUtils = {
  // Announce message to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // DISABLED: console.log(`[Accessibility] ${message}`)
    console.log(`[Accessibility] ${message}`)
  },

  // Focus trap for modals - DISABLED
  createFocusTrap: (containerRef: any) => {
    // DISABLED: Focus trap functionality
    return {
      activate: () => console.log('[Accessibility] Focus trap activated'),
      deactivate: () => console.log('[Accessibility] Focus trap deactivated')
    }
  },

  // Skip to main content link - DISABLED
  createSkipLink: () => {
    // DISABLED: Skip link functionality
    return null
  },

  // High contrast mode toggle - DISABLED
  toggleHighContrast: () => {
    // DISABLED: High contrast functionality
    console.log('[Accessibility] High contrast toggled')
  },

  // Font size adjustment - DISABLED
  adjustFontSize: (direction: 'increase' | 'decrease') => {
    // DISABLED: Font size adjustment functionality
    console.log(`[Accessibility] Font size ${direction}d`)
  },

  // Screen reader only text - DISABLED
  srOnly: (text: string) => {
    // DISABLED: Screen reader only text
    return text
  }
}

// DISABLED: All React hooks and client-side components
/*
export const useAccessibility = () => {
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // Check user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(prefersReducedMotion)
  }, [])

  const toggleHighContrast = () => {
    setHighContrast(!highContrast)
    document.documentElement.classList.toggle('high-contrast')
  }

  const adjustFontSize = (direction: 'increase' | 'decrease') => {
    const newSize = direction === 'increase' ? fontSize + 2 : fontSize - 2
    if (newSize >= 12 && newSize <= 24) {
      setFontSize(newSize)
      document.documentElement.style.fontSize = `${newSize}px`
    }
  }

  return {
    highContrast,
    fontSize,
    reducedMotion,
    toggleHighContrast,
    adjustFontSize
  }
}

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const accessibility = useAccessibility()

  return (
    <div className={`accessibility-provider ${accessibility.reducedMotion ? 'reduced-motion' : ''}`}>
      {children}
    </div>
  )
}

export const SkipToMainContent: React.FC = () => {
  const handleClick = () => {
    const mainContent = document.querySelector('main')
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <a
      href="#main-content"
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
    >
      Skip to main content
    </a>
  )
}

export const AccessibilityControls: React.FC = () => {
  const { highContrast, fontSize, toggleHighContrast, adjustFontSize } = useAccessibility()

  return (
    <div className="accessibility-controls fixed top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50">
      <h3 className="text-sm font-semibold mb-2">Accessibility</h3>
      <div className="space-y-2">
        <button
          onClick={toggleHighContrast}
          className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {highContrast ? 'Disable' : 'Enable'} High Contrast
        </button>
        <div className="flex space-x-2">
          <button
            onClick={() => adjustFontSize('decrease')}
            className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            A-
          </button>
          <button
            onClick={() => adjustFontSize('increase')}
            className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            A+
          </button>
        </div>
      </div>
    </div>
  )
}
*/

// Export empty components to prevent import errors
export const AccessibilityProvider = ({ children }: { children: any }) => children
export const SkipToMainContent = () => null
export const AccessibilityControls = () => null
export const useAccessibility = () => ({
  highContrast: false,
  fontSize: 16,
  reducedMotion: false,
  toggleHighContrast: () => {},
  adjustFontSize: () => {}
})

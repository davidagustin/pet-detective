import React, { useEffect, useRef, useState } from 'react'
import { config } from './config'

// Accessibility utilities
export const accessibilityUtils = {
  // Announce message to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  },

  // Focus trap for modals
  createFocusTrap: (containerRef: React.RefObject<HTMLElement>) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>

      if (!focusableElements.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    return handleKeyDown
  },

  // Skip to main content link
  createSkipLink: () => {
    const skipLink = document.createElement('a')
    skipLink.href = '#main-content'
    skipLink.textContent = 'Skip to main content'
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50'
    
    document.body.insertBefore(skipLink, document.body.firstChild)
    
    return () => {
      if (skipLink.parentNode) {
        skipLink.parentNode.removeChild(skipLink)
      }
    }
  },


}

// Custom hooks for accessibility
export const useAccessibility = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Load dark mode preference from localStorage
    const darkMode = localStorage.getItem('darkMode') === 'true'
    
    setIsDarkMode(darkMode)
    
    if (darkMode) {
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
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
    
    accessibilityUtils.announce(`Dark mode ${newDarkMode ? 'enabled' : 'disabled'}`)
  }

  return {
    isDarkMode,
    toggleDarkMode,
  }
}

// Focus management hook
export const useFocusManagement = () => {
  const focusRef = useRef<HTMLElement>(null)

  const focusElement = () => {
    if (focusRef.current) {
      focusRef.current.focus()
    }
  }

  const trapFocus = (containerRef: React.RefObject<HTMLElement>) => {
    const handleKeyDown = accessibilityUtils.createFocusTrap(containerRef)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }

  return { focusRef, focusElement, trapFocus }
}

// Loading state hook with accessibility
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState)

  useEffect(() => {
    if (isLoading) {
      accessibilityUtils.announce('Loading, please wait')
    }
  }, [isLoading])

  return [isLoading, setIsLoading] as const
}

// Error state hook with accessibility
export const useErrorState = () => {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      accessibilityUtils.announce(`Error: ${error}`, 'assertive')
    }
  }, [error])

  return [error, setError] as const
}

// Success state hook with accessibility
export const useSuccessState = () => {
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (success) {
      accessibilityUtils.announce(success)
    }
  }, [success])

  return [success, setSuccess] as const
}

// Keyboard navigation hook
export const useKeyboardNavigation = (items: any[], onSelect: (item: any) => void) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        onSelect(items[selectedIndex])
        break
      case 'Home':
        event.preventDefault()
        setSelectedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setSelectedIndex(items.length - 1)
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedIndex, onSelect])

  return { selectedIndex, setSelectedIndex }
}

// Screen reader only component
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement('span', { className: 'sr-only' }, children)
}

// Visually hidden component
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement('span', { 
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50'
  }, children)
}

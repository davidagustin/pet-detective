// Secure configuration management
export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NODE_ENV === 'production' 
      ? '' // Use relative URLs in production (same domain)
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5328'),
    timeout: 30000, // 30 seconds
    retries: 3,
  },
  
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
  },
  
  // Security Configuration
  security: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    csrfProtection: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },
  
  // Feature Flags
  features: {
    enableTraining: process.env.NODE_ENV === 'development',
    enableSegmentation: true,
    enableLeaderboard: true,
    enableGoogleAuth: true,
  },
  
  // Accessibility Configuration
  accessibility: {
    enableHighContrast: false,
    enableReducedMotion: false,
    enableScreenReader: true,
  },
} as const

// Type-safe configuration
export type Config = typeof config

// Security utilities
export const securityUtils = {
  // Validate file upload
  validateFile: (file: File): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: 'No file provided' }
    }
    
    if (file.size > config.security.maxFileSize) {
      return { valid: false, error: 'File size too large. Maximum 10MB allowed.' }
    }
    
    if (!config.security.allowedFileTypes.includes(file.type as any)) {
      return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and GIF images are allowed.' }
    }
    
    return { valid: true }
  },
  
  // Sanitize user input
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim()
      .slice(0, 1000) // Limit length
  },
  
  // Generate CSRF token
  generateCSRFToken: (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  },
}

// Error handling utilities
export const errorUtils = {
  // Handle API errors
  handleAPIError: (error: any): string => {
    if (error.response?.status === 401) {
      return 'Authentication required. Please sign in.'
    }
    if (error.response?.status === 403) {
      return 'Access denied. You do not have permission to perform this action.'
    }
    if (error.response?.status === 429) {
      return 'Too many requests. Please try again later.'
    }
    if (error.response?.status >= 500) {
      return 'Server error. Please try again later.'
    }
    return error.message || 'An unexpected error occurred.'
  },
  
  // Log errors securely
  logError: (error: any, context?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context || 'App'}] Error:`, error)
    }
    // In production, you would send to a logging service
  },
}

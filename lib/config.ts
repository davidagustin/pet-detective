// Secure configuration management
export const config = {
  // API Configuration
  api: {
    baseUrl: '', // Use relative URLs (Next.js API routes)
    timeout: 30000, // 30 seconds
    retries: 3,
    pythonApi: {
      url: process.env.NODE_ENV === 'production' 
        ? '/api/predict' 
        : 'http://127.0.0.1:5328/api/predict',
      timeout: 10000, // 10 seconds
    },
  },
  
  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19',
    version: 'v1756482370',
    baseUrl: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19'}`,
  },
  
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
  },
  
  // Game Configuration
  game: {
    difficulties: {
      easy: { optionCount: 4 },
      medium: { optionCount: 4 },
      hard: { optionCount: 6 },
    },
    defaultMaxImages: 200,
    breeds: {
      cats: [
        'Abyssinian', 'Bengal', 'Birman', 'Bombay', 'British Shorthair',
        'Egyptian Mau', 'Maine Coon', 'Persian', 'Ragdoll', 'Russian Blue',
        'Siamese', 'Sphynx'
      ],
      dogs: [
        'American Bulldog', 'American Pit Bull Terrier', 'Basset Hound',
        'Beagle', 'Boxer', 'Chihuahua', 'English Cocker Spaniel',
        'English Setter', 'German Shorthaired', 'Great Pyrenees',
        'Havanese', 'Japanese Chin', 'Keeshond', 'Leonberger',
        'Miniature Pinscher', 'Newfoundland', 'Pomeranian', 'Pug',
        'Saint Bernard', 'Samoyed', 'Scottish Terrier', 'Shiba Inu',
        'Staffordshire Bull Terrier', 'Wheaten Terrier', 'Yorkshire Terrier'
      ],
    },
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

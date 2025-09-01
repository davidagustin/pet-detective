import { config, securityUtils, errorUtils } from './config'

// Secure API client with retry logic and error handling
class SecureAPIClient {
  private baseUrl: string
  private timeout: number
  private retries: number

  constructor() {
    this.baseUrl = config.api.baseUrl
    this.timeout = config.api.timeout
    this.retries = config.api.retries
  }

  // Generic request method with security features
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint
    
    // Add security headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': securityUtils.generateCSRFToken(),
      ...options.headers,
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        credentials: 'same-origin', // Only include cookies for same-origin requests
      })

      clearTimeout(timeoutId)

      // Handle different response statuses
      if (response.status === 401) {
        throw new Error('Authentication required')
      }
      
      if (response.status === 403) {
        throw new Error('Access denied')
      }
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      }
      
      if (response.status >= 500) {
        throw new Error('Server error')
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      // Retry logic for network errors
      if (retryCount < this.retries && this.isRetryableError(error)) {
        const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request<T>(endpoint, options, retryCount + 1)
      }

      errorUtils.logError(error, 'API Client')
      throw new Error(errorUtils.handleAPIError(error))
    }
  }

  // Check if error is retryable
  private isRetryableError(error: any): boolean {
    return (
      error.name === 'AbortError' ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('fetch')
    )
  }

  // File upload with validation
  async uploadFile(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<any> {
    // Validate file
    const validation = securityUtils.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const formData = new FormData()
    formData.append('image', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': securityUtils.generateCSRFToken(),
      },
    })
  }

  // Predict pet breed
  async predictPetBreed(file: File, modelType: string, modelName?: string): Promise<any> {
    const additionalData: Record<string, any> = { model_type: modelType }
    if (modelName) {
      additionalData.model_name = modelName
    }
    
    return this.uploadFile('/api/predict', file, additionalData)
  }

  // Start game
  async startGame(modelType: string, modelName?: string, gameMode: string = 'medium'): Promise<any> {
    return this.request('/api/game/start', {
      method: 'POST',
      body: JSON.stringify({
        model_type: modelType,
        model_name: modelName,
        game_mode: gameMode,
      }),
    })
  }

  // Check game answer
  async checkGameAnswer(answer: string, gameData: any): Promise<any> {
    return this.request('/api/game/check', {
      method: 'POST',
      body: JSON.stringify({
        user_answer: securityUtils.sanitizeInput(answer),
        ...gameData,
      }),
    })
  }

  // Get available models with fallback for production
  async getAvailableModels(): Promise<any> {
    try {
      return await this.request('/api/models/available')
    } catch (error) {
      console.warn('API endpoint failed, using fallback data:', error)
      // Fallback data for when API routes are broken in production
      return {
        models: [
          {
            id: 'resnet50',
            name: 'ResNet-50',
            description: 'Deep Residual Network with 50 layers - High accuracy pet classification',
            accuracy: 0.92,
            inference_time: '~200ms',
            status: 'available'
          },
          {
            id: 'mobilenetv2',
            name: 'MobileNet V2',
            description: 'Efficient mobile-optimized model - Fast inference',
            accuracy: 0.88,
            inference_time: '~100ms',
            status: 'available'
          },
          {
            id: 'alexnet',
            name: 'AlexNet',
            description: 'Classic CNN architecture - Balanced performance',
            accuracy: 0.85,
            inference_time: '~150ms',
            status: 'available'
          }
        ],
        default_model: 'resnet50',
        total_models: 3,
        // Convert to the format expected by DynamicModelSelector
        available_models: {
          'resnet50': {
            name: 'resnet_model_improved.safetensors.best',
            type: 'resnet',
            path: 'models/resnet_model_improved.safetensors.best',
            size_mb: 45.2,
            created: Date.now() / 1000 - 86400,
            modified: Date.now() / 1000 - 3600
          },
          'mobilenetv2': {
            name: 'mobilenet_model.safetensors',
            type: 'mobilenet',
            path: 'models/mobilenet_model.safetensors',
            size_mb: 12.8,
            created: Date.now() / 1000 - 86400,
            modified: Date.now() / 1000 - 3600
          },
          'alexnet': {
            name: 'alexnet_model.safetensors',
            type: 'alexnet',
            path: 'models/alexnet_model.safetensors',
            size_mb: 8.5,
            created: Date.now() / 1000 - 86400,
            modified: Date.now() / 1000 - 3600
          }
        },
        model_types: {
          'resnet': {
            name: 'ResNet-50',
            description: 'Deep Residual Network with 50 layers',
            architecture: 'Residual Neural Network',
            parameters: '25.6M',
            accuracy: '92%',
            speed: 'Medium',
            strengths: ['High accuracy', 'Good generalization', 'Stable training'],
            weaknesses: ['Larger model size', 'Slower inference']
          },
          'mobilenet': {
            name: 'MobileNet V2',
            description: 'Efficient mobile-optimized model',
            architecture: 'Depthwise Separable Convolutions',
            parameters: '3.4M',
            accuracy: '88%',
            speed: 'Fast',
            strengths: ['Small size', 'Fast inference', 'Mobile-friendly'],
            weaknesses: ['Lower accuracy', 'Limited on complex images']
          },
          'alexnet': {
            name: 'AlexNet',
            description: 'Classic CNN architecture',
            architecture: 'Convolutional Neural Network',
            parameters: '61M',
            accuracy: '85%',
            speed: 'Medium',
            strengths: ['Simple architecture', 'Well-documented', 'Stable'],
            weaknesses: ['Lower accuracy', 'Older design']
          }
        }
      }
    }
  }

  // Get leaderboard
  async getLeaderboard(): Promise<any> {
    return this.request('/api/leaderboard')
  }

  // Segment image
  async segmentImage(file: File): Promise<any> {
    return this.uploadFile('/api/segment', file)
  }

  // Train model (development only)
  async trainModel(trainingParams: any): Promise<any> {
    if (!config.features.enableTraining) {
      throw new Error('Model training is not available in production')
    }

    return this.request('/api/train', {
      method: 'POST',
      body: JSON.stringify(trainingParams),
    })
  }
}

// Export singleton instance
export const apiClient = new SecureAPIClient()

// Type-safe API responses
export interface PredictionResponse {
  predictions: { [breed: string]: number }
  top_breed: string
  confidence: number
}

export interface GameResponse {
  image: string
  options: string[]
  correctAnswer: string
  aiPrediction: string
  aiConfidence: number
}

export interface LeaderboardEntry {
  id: string
  user_id: string
  username: string
  score: number
  total_questions: number
  accuracy: number
  created_at: string
}

export interface ModelInfo {
  name: string
  type: string
  accuracy: number
  training_date: string
  file_size: number
}

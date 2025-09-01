'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Snackbar, { useSnackbar } from './Snackbar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)

interface PasswordStrengthResult {
  score: number
  feedback: string[]
  isValid: boolean
}

interface AuthProps {
  onAuthSuccess?: () => void
  onClose?: () => void
  onShowSnackbar?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export default function Auth({ onAuthSuccess, onClose, onShowSnackbar }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [lockoutTime, setLockoutTime] = useState<number | null>(null)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  
  // Snackbar hook
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar()

  // Input sanitization functions
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    return usernameRegex.test(username)
  }

  // Rate limiting check
  const isRateLimited = (): boolean => {
    if (lockoutTime && Date.now() < lockoutTime) {
      return true
    }
    return attemptCount >= 5
  }

  const handleFailedAttempt = () => {
    const newCount = attemptCount + 1
    setAttemptCount(newCount)
    
    if (newCount >= 5) {
      const lockout = Date.now() + (15 * 60 * 1000) // 15 minutes lockout
      setLockoutTime(lockout)
      setError('Too many failed attempts. Please try again in 15 minutes.')
    }
  }

  const resetAttempts = () => {
    setAttemptCount(0)
    setLockoutTime(null)
  }

  // Password strength checker
  const checkPasswordStrength = (password: string): PasswordStrengthResult => {
    const feedback: string[] = []
    let score = 0

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long')
    } else {
      score += 1
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('Include at least one lowercase letter')
    } else {
      score += 1
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Include at least one uppercase letter')
    } else {
      score += 1
    }

    if (!/\d/.test(password)) {
      feedback.push('Include at least one number')
    } else {
      score += 1
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Include at least one special character')
    } else {
      score += 1
    }

    const isValid = score >= 4 && password.length >= 8

    return { score, feedback, isValid }
  }

  const passwordStrength = checkPasswordStrength(password)

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500'
    if (score <= 2) return 'bg-orange-500'
    if (score <= 3) return 'bg-yellow-500'
    if (score <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return 'Very Weak'
    if (score <= 2) return 'Weak'
    if (score <= 3) return 'Fair'
    if (score <= 4) return 'Good'
    return 'Strong'
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check rate limiting
    if (isRateLimited()) {
      if (lockoutTime && Date.now() < lockoutTime) {
        const remainingTime = Math.ceil((lockoutTime - Date.now()) / (60 * 1000))
        setError(`Account temporarily locked. Try again in ${remainingTime} minutes.`)
      } else {
        setError('Too many failed attempts. Please wait before trying again.')
      }
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.toLowerCase())
      const sanitizedUsername = sanitizeInput(username)

      // Validate inputs
      if (!validateEmail(sanitizedEmail)) {
        setError('Please enter a valid email address')
        handleFailedAttempt()
        setLoading(false)
        return
      }

      if (!isLogin) {
        // Additional validation for signup
        if (!validateUsername(sanitizedUsername)) {
          setError('Username must be 3-20 characters long and contain only letters, numbers, hyphens, and underscores')
          setLoading(false)
          return
        }

        if (!passwordStrength.isValid) {
          setError('Password does not meet security requirements')
          setLoading(false)
          return
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }

        // Check if username already exists
        const { data: existingUsers, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', sanitizedUsername)

        if (checkError) {
          console.error('Error checking username:', checkError)
        }

        if (existingUsers && existingUsers.length > 0) {
          setError('Username already exists. Please choose a different one.')
          setLoading(false)
          return
        }
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        })
        if (error) throw error
        resetAttempts() // Reset on successful login
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            data: {
              username: sanitizedUsername,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          },
        })
        
        // Handle the case where user already exists (possibly deleted account)
        if (error && (error.message.includes('User already registered') || 
                     error.message.includes('already been registered') ||
                     error.message.includes('email address is already registered'))) {
          // Try to resend confirmation email for existing user
          try {
            const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: sanitizedEmail,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`
              }
            })
            
            if (resendError) throw resendError
            
            // Show success message for resent confirmation
            if (onShowSnackbar) {
              onShowSnackbar(
                'A confirmation email has been resent to your email address. Please check your inbox.',
                'success'
              )
            } else {
              showSnackbar(
                'A confirmation email has been resent to your email address. Please check your inbox.',
                'success'
              )
            }
            
            setTimeout(() => {
              onAuthSuccess?.()
              onClose?.()
            }, 500)
            
          } catch (resendError: any) {
            // If resend fails, show appropriate error
            throw new Error('This email is already registered. Please try signing in instead, or use the "Forgot Password" option if you need to reset your password.')
          }
        } else if (error) {
          throw error
        } else {
          // Normal signup flow
          // Show confirmation snackbar for new signups
          if (data.user && !data.session) {
            // Use parent snackbar if available, otherwise use local one
            if (onShowSnackbar) {
              onShowSnackbar(
                'Account created successfully! Please check your email to confirm your account before signing in.',
                'success'
              )
              // Delay closing the modal to ensure snackbar is visible
              setTimeout(() => {
                onAuthSuccess?.()
                onClose?.()
              }, 500)
            } else {
              showSnackbar(
                'Account created successfully! Please check your email to confirm your account before signing in.',
                'success'
              )
              // Delay closing the modal to ensure snackbar is visible
              setTimeout(() => {
                onAuthSuccess?.()
                onClose?.()
              }, 500)
            }
          } else {
            // For immediate login (no email confirmation needed)
            onAuthSuccess?.()
            onClose?.()
          }
        }
        
        resetAttempts() // Reset on successful signup
      }
      
      // For login - only call these if it's not signup
      if (isLogin) {
        onAuthSuccess?.()
        onClose?.()
      }
    } catch (error: any) {
      handleFailedAttempt()
      setError(error.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Sanitize email input
    const sanitizedEmail = sanitizeInput(email.toLowerCase())
    
    if (!validateEmail(sanitizedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password?email=${encodeURIComponent(sanitizedEmail)}`
      })

      if (error) throw error

      setSuccess('Password reset email sent! Check your inbox and follow the link to reset your password.')
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Sanitize email input
    const sanitizedEmail = sanitizeInput(email.toLowerCase())
    
    if (!validateEmail(sanitizedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: sanitizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      setSuccess('Confirmation email resent! Please check your inbox and follow the link to confirm your account.')
    } catch (error: any) {
      setError(error.message || 'Failed to resend confirmation email')
    } finally {
      setLoading(false)
    }
  }



  return (
    <>
      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
        position="top"
      />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {showForgotPassword ? 'Reset Password' : showResendConfirmation ? 'Resend Confirmation' : (isLogin ? 'Welcome Back!' : 'Join Pet Detective')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {showForgotPassword ? 'Enter your email to receive reset instructions' : 
           showResendConfirmation ? 'Enter your email to resend confirmation' :
           (isLogin ? 'Sign in to your account to continue' : 'Create your account to get started')}
        </p>
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={showForgotPassword ? handleForgotPassword : showResendConfirmation ? handleResendConfirmation : handleAuth} className="space-y-6">
        {!isLogin && !showForgotPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(sanitizeInput(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(sanitizeInput(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
          </div>
        </div>
        
        {!showForgotPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Strength Meter for Signup */}
            {!isLogin && password && (
              <div className="mt-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score <= 2 ? 'text-red-600' : 
                    passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {getPasswordStrengthText(passwordStrength.score)}
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {passwordStrength.feedback.map((item, index) => (
                      <li key={index} className="flex items-center space-x-1">
                        <span className="text-red-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Forgot Password Link */}
            {isLogin && (
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>
        )}

        {/* Confirm Password Field for Signup */}
        {!isLogin && !showForgotPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(sanitizeInput(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && password && (
              <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
            )}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || 
                   isRateLimited() ||
                   (!isLogin && !showForgotPassword && (!passwordStrength.isValid || password !== confirmPassword)) ||
                   (!isLogin && !showForgotPassword && !validateUsername(username)) ||
                   (!validateEmail(email))}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {showForgotPassword ? 'Sending Email...' : showResendConfirmation ? 'Resending Email...' : (isLogin ? 'Signing In...' : 'Creating Account...')}
            </div>
          ) : (
            showForgotPassword ? 'Send Reset Email' : showResendConfirmation ? 'Resend Confirmation Email' : (isLogin ? 'Sign In' : 'Create Account')
          )}
        </button>


      </form>

      {/* Toggle between login and signup */}
      <div className="mt-6 text-center">
        {showForgotPassword ? (
          <button
            onClick={() => {
              setShowForgotPassword(false)
              setError('')
              setSuccess('')
            }}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            ← Back to Sign In
          </button>
        ) : showResendConfirmation ? (
          <button
            onClick={() => {
              setShowResendConfirmation(false)
              setError('')
              setSuccess('')
            }}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            ← Back to Sign In
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setSuccess('')
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                  setUsername('')
                }}
                className="ml-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            {isLogin && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Didn't receive confirmation email?
                <button
                  onClick={() => {
                    setShowResendConfirmation(true)
                    setError('')
                    setSuccess('')
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Resend confirmation
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
    </>
  )
}

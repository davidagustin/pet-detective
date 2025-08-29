'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { config } from '../lib/config'

const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
)

interface PasswordStrengthResult {
  score: number
  feedback: string[]
  isValid: boolean
}

interface SettingsProps {
  user: any
  onClose: () => void
  onUserUpdate?: (user: any) => void
  onShowSnackbar?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export default function Settings({ user, onClose, onUserUpdate, onShowSnackbar }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'account'>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile form state
  const [newUsername, setNewUsername] = useState(user?.user_metadata?.username || '')
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  
  // Input sanitization
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    return usernameRegex.test(username)
  }
  
  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const passwordStrength = checkPasswordStrength(newPassword)

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

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Sanitize and validate input
      const sanitizedUsername = sanitizeInput(newUsername)
      
      if (!validateUsername(sanitizedUsername)) {
        setError('Username must be 3-20 characters long and contain only letters, numbers, hyphens, and underscores')
        return
      }

      // Check if username already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', sanitizedUsername)
        .neq('id', user.id)

      if (checkError) {
        console.error('Error checking username:', checkError)
      }

      if (existingUsers && existingUsers.length > 0) {
        setError('Username already exists. Please choose a different one.')
        return
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { username: sanitizedUsername }
      })

      if (updateError) throw updateError

      // Update profiles table if it exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          username: sanitizedUsername,
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Profile update error:', profileError)
      }

      setSuccess('Username updated successfully!')
      setNewUsername(sanitizedUsername)
      onUserUpdate?.(user)
    } catch (error: any) {
      setError(error.message || 'Failed to update username')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!passwordStrength.isValid) {
      setError('Password does not meet security requirements')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setError(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Try to use the delete_user_account RPC function first (most complete deletion)
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user_account')
      
      if (rpcError) {
        console.error('RPC delete_user_account error:', rpcError)
        
        // If RPC function doesn't exist, fall back to manual deletion
        if (rpcError.message?.includes('function delete_user_account') || 
            rpcError.message?.includes('does not exist')) {
          
          console.log('RPC function not found, attempting manual deletion...')
          
          // Manual deletion fallback - delete from custom tables first
          try {
            const { error: leaderboardError } = await supabase
              .from('leaderboard')
              .delete()
              .eq('user_id', user.id)

            if (leaderboardError && 
                !leaderboardError.message?.includes('does not exist') && 
                !leaderboardError.message?.includes('schema cache')) {
              console.error('Error deleting leaderboard data:', leaderboardError)
            }
          } catch (e) {
            console.log('Leaderboard table not found, skipping...')
          }

          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .delete()
              .eq('id', user.id)

            if (profileError && 
                !profileError.message?.includes('does not exist') && 
                !profileError.message?.includes('schema cache')) {
              console.error('Error deleting profile data:', profileError)
            }
          } catch (e) {
            console.log('Profiles table not found, skipping...')
          }

          // Sign out the user since we can't delete from auth.users without the RPC function
          const { error: signOutError } = await supabase.auth.signOut()
          
          if (signOutError) {
            throw new Error(`Failed to sign out: ${signOutError.message}`)
          }
          
          if (onShowSnackbar) {
            onShowSnackbar('Account signed out successfully. Complete account deletion requires database setup (see README.md).', 'warning')
          }
        } else {
          throw new Error(`Account deletion failed: ${rpcError.message}`)
        }
      } else {
        // RPC function succeeded - complete deletion including auth.users
        console.log('Account deletion successful:', rpcData)
        
        // Sign out the user after successful deletion
        const { error: signOutError } = await supabase.auth.signOut()
        
        if (signOutError) {
          console.error('Sign out error after deletion:', signOutError)
          // Don't throw error here since the account was already deleted
        }
        
        if (onShowSnackbar) {
          onShowSnackbar('Account deleted successfully! All your data has been removed.', 'success')
        }
      }
      
      onClose()
      window.location.reload()
      
    } catch (error: any) {
      console.error('Account deletion error:', error)
      setError(error.message || 'Failed to delete account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password?email=${encodeURIComponent(user.email)}`
      })

      if (error) throw error

      setSuccess('Password reset email sent! Check your inbox and follow the link to reset your password.')
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            🔒 Password
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'account'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            🗑️ Account
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
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

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Profile Information</h3>
                
                <form onSubmit={handleUpdateUsername} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(sanitizeInput(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your username"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || 
                             newUsername === (user?.user_metadata?.username || '') ||
                             !validateUsername(newUsername)}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Username'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Change Password</h3>
                  <button
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Forgot Password?
                  </button>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPasswords ? (
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPasswords ? (
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

                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="mt-2">
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPasswords ? (
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
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword && newPassword === confirmPassword && newPassword && (
                      <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showPasswords"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showPasswords" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      Show passwords
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !passwordStrength.isValid || newPassword !== confirmPassword}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Danger Zone</h3>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="ml-3">
                      <h4 className="text-red-800 dark:text-red-400 font-semibold">Delete Account</h4>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Delete Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Please type <strong>DELETE</strong> to confirm:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(sanitizeInput(e.target.value))}
                          className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Type DELETE to confirm"
                        />
                        <div className="flex space-x-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={loading || deleteConfirmation !== 'DELETE'}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            {loading ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false)
                              setDeleteConfirmation('')
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

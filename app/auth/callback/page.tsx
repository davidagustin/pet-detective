'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')

        // Handle error cases first
        if (error) {
          console.error('Auth callback error:', error, errorDescription)
          const errorParam = encodeURIComponent(error)
          const descParam = errorDescription ? `&error_description=${encodeURIComponent(errorDescription)}` : ''
          router.push(`/?error=${errorParam}${descParam}`)
          return
        }

        // Handle code exchange for email confirmation
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            router.push('/?error=auth_callback_error&error_description=' + encodeURIComponent(exchangeError.message))
            return
          }

          if (data.session) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Email confirmation successful:', data.session.user.email)
            }
            router.push('/?success=email_confirmed')
            return
          }
        }

        // Fallback: check for existing session
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session check error:', sessionError)
          router.push('/?error=auth_failed')
          return
        }

        if (data.session) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Authentication successful:', data.session.user.email)
          }
          router.push('/?success=auth_success')
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('No session found')
          }
          router.push('/?error=no_session')
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        router.push('/?error=auth_failed&error_description=' + encodeURIComponent(error.message || 'Authentication failed'))
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-blue-600">
            <svg className="animate-spin h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Confirming Your Email...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we confirm your email address and sign you in.
          </p>
        </div>
      </div>
    </div>
  )
}

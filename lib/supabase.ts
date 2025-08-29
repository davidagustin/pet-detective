import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface LeaderboardEntry {
  id: string
  user_id: string
  username: string
  score: number
  total_questions: number
  accuracy: number
  created_at: string
}

export interface User {
  id: string
  email: string
  username?: string
  created_at: string
}

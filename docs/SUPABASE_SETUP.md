# Supabase Setup Guide for Pet Detective

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be set up

## 2. Get Your Project Credentials

1. Go to your project dashboard
2. Navigate to Settings > API
3. Copy the following values:
   - Project URL
   - Anon public key
   - Service role key (keep this secret!)

## 3. Set Up Environment Variables

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Configuration (optional)
POSTGRES_URL=your_postgres_url_here
POSTGRES_USER=your_postgres_user_here
POSTGRES_HOST=your_postgres_host_here
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_DATABASE=your_postgres_database_here
```

## 4. Set Up the Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `supabase_setup.sql`

Or copy and paste this SQL:

```sql
-- Create leaderboard table for Pet Detective game
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to leaderboard" ON leaderboard
    FOR SELECT USING (true);

CREATE POLICY "Allow users to insert their own scores" ON leaderboard
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own scores" ON leaderboard
    FOR UPDATE USING (auth.uid() = user_id);
```

## 5. Configure Authentication

1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your site URL (e.g., `http://localhost:3000` for development)
3. Add any additional redirect URLs if needed

## 6. Test the Setup

1. Start your development server: `npm run dev`
2. Try signing up/signing in
3. Play the game and check if scores are saved to the leaderboard

## 7. Deploy to Vercel

When deploying to Vercel, add your environment variables in the Vercel dashboard:

1. Go to your project settings in Vercel
2. Navigate to Environment Variables
3. Add all the environment variables from your `.env.local` file

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your site URL is configured correctly in Supabase
2. **Authentication Errors**: Check that your API keys are correct
3. **Database Errors**: Ensure the leaderboard table was created successfully
4. **RLS Policy Errors**: Verify that the Row Level Security policies are set up correctly

### Useful Commands:

```bash
# Check if environment variables are loaded
echo $NEXT_PUBLIC_SUPABASE_URL

# Test database connection
psql $POSTGRES_URL -c "SELECT * FROM leaderboard LIMIT 5;"
```

## Security Notes

- Never commit your `.env.local` file to version control
- The service role key has admin privileges - keep it secure
- Use Row Level Security (RLS) policies to protect user data
- Regularly rotate your API keys

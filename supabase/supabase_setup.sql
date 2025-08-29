-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to delete their own profile" ON profiles;

-- Allow users to read all profiles (for username checking)
CREATE POLICY "Allow public read access to profiles" ON profiles
    FOR SELECT USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Allow users to insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Allow users to delete their own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create leaderboard table for Pet Detective game
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
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
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Allow users to insert their own scores" ON leaderboard;
DROP POLICY IF EXISTS "Allow users to update their own scores" ON leaderboard;

-- Allow users to read all leaderboard entries
CREATE POLICY "Allow public read access to leaderboard" ON leaderboard
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own scores
CREATE POLICY "Allow users to insert their own scores" ON leaderboard
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own scores
CREATE POLICY "Allow users to update their own scores" ON leaderboard
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard;
CREATE TRIGGER update_leaderboard_updated_at 
    BEFORE UPDATE ON leaderboard 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional)
-- Clear existing sample data first, then insert new data
DELETE FROM leaderboard WHERE user_id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005'
);

INSERT INTO leaderboard (user_id, username, score, total_questions, accuracy) VALUES
    ('00000000-0000-0000-0000-000000000001', 'PetMaster', 2500, 20, 75.00),
    ('00000000-0000-0000-0000-000000000002', 'DogLover', 2100, 15, 80.00),
    ('00000000-0000-0000-0000-000000000003', 'CatWhisperer', 1950, 25, 72.00),
    ('00000000-0000-0000-0000-000000000004', 'BreedExpert', 1800, 30, 73.33),
    ('00000000-0000-0000-0000-000000000005', 'AnimalFriend', 1650, 12, 66.67);

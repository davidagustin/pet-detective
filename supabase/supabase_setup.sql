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
CREATE TRIGGER update_leaderboard_updated_at 
    BEFORE UPDATE ON leaderboard 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional)
INSERT INTO leaderboard (user_id, username, score, total_questions, accuracy) VALUES
    ('00000000-0000-0000-0000-000000000001', 'PetMaster', 15, 20, 75.00),
    ('00000000-0000-0000-0000-000000000002', 'DogLover', 12, 15, 80.00),
    ('00000000-0000-0000-0000-000000000003', 'CatWhisperer', 18, 25, 72.00),
    ('00000000-0000-0000-0000-000000000004', 'BreedExpert', 22, 30, 73.33),
    ('00000000-0000-0000-0000-000000000005', 'AnimalFriend', 8, 12, 66.67)
ON CONFLICT (user_id) DO NOTHING;

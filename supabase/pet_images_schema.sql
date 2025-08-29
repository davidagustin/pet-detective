-- Create pet_images table for storing image metadata
CREATE TABLE IF NOT EXISTS pet_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    breed TEXT NOT NULL,
    animal_type TEXT NOT NULL CHECK (animal_type IN ('dog', 'cat')),
    blob_url TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pet_images_breed ON pet_images(breed);
CREATE INDEX IF NOT EXISTS idx_pet_images_animal_type ON pet_images(animal_type);
CREATE INDEX IF NOT EXISTS idx_pet_images_active ON pet_images(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE pet_images ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to pet images" ON pet_images;
DROP POLICY IF EXISTS "Allow authenticated users to insert pet images" ON pet_images;
DROP POLICY IF EXISTS "Allow authenticated users to update pet images" ON pet_images;

-- Allow public read access to active pet images
CREATE POLICY "Allow public read access to pet images" ON pet_images
    FOR SELECT USING (is_active = true);

-- Allow authenticated users to insert pet images
CREATE POLICY "Allow authenticated users to insert pet images" ON pet_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update pet images
CREATE POLICY "Allow authenticated users to update pet images" ON pet_images
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pet_images_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_pet_images_updated_at ON pet_images;
CREATE TRIGGER update_pet_images_updated_at 
    BEFORE UPDATE ON pet_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_pet_images_updated_at_column();

-- Insert some sample data with blob URLs (you'll need to replace these with actual blob URLs after uploading)
INSERT INTO pet_images (filename, breed, animal_type, blob_url) VALUES
    ('german_shorthaired_1.jpg', 'German Shorthaired Pointer', 'dog', 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/german_shorthaired_1.jpg'),
    ('beagle_1.jpg', 'Beagle', 'dog', 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/beagle_1.jpg'),
    ('siamese_1.jpg', 'Siamese', 'cat', 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/siamese_1.jpg'),
    ('pug_1.jpg', 'Pug', 'dog', 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/pug_1.jpg'),
    ('maine_coon_1.jpg', 'Maine Coon', 'cat', 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com/maine_coon_1.jpg')
ON CONFLICT (filename) DO NOTHING;

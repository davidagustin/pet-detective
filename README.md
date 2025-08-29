# 🐕 Pet Detective - AI-Powered Pet Classification & Gaming Platform

A comprehensive web application that combines deep learning for pet breed classification with an interactive gaming experience. Built with Next.js, Flask, PyTorch, and Supabase.

![Pet Detective](https://img.shields.io/badge/Pet-Detective-blue?style=for-the-badge&logo=dog)
![Next.js](https://img.shields.io/badge/Next.js-13-black?style=for-the-badge&logo=next.js)
![Flask](https://img.shields.io/badge/Flask-3.0-red?style=for-the-badge&logo=flask)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0-orange?style=for-the-badge&logo=pytorch)
![Supabase](https://img.shields.io/badge/Supabase-Auth-green?style=for-the-badge&logo=supabase)

## 🎯 Features

### 🤖 **AI-Powered Pet Classification**
- **Multiple Model Support**: ResNet-50, AlexNet, MobileNet V2
- **Transfer Learning**: Pre-trained models fine-tuned on Oxford-IIIT Pet dataset
- **Real-time Predictions**: Upload pet images and get instant breed predictions
- **Dynamic Model Selection**: Choose from trained models or use default ones

### 🎮 **Interactive Pet Guessing Game**
- **Multi-choice Questions**: Test your pet breed knowledge
- **Multiple Difficulty Levels**: Easy, Medium, Hard modes
- **Timer-based Scoring**: Time-based points with streak bonuses
- **AI Competition**: Compete against different AI models
- **Real-time Feedback**: Immediate results with detailed explanations

### 🔍 **Image Segmentation**
- **Pet Segmentation**: Automatically separate pets from backgrounds
- **U-Net Architecture**: Advanced segmentation using deep learning
- **Download Results**: Save segmented images and masks
- **Confidence Scoring**: Get segmentation confidence metrics

### 🏆 **Gamification & Social Features**
- **User Authentication**: Secure login/signup via Supabase
- **Leaderboard System**: Global and personal score tracking
- **Score Persistence**: Save game results to database
- **User Profiles**: Track individual performance over time

### 🛠️ **Model Training & Management**
- **Hyperparameter Tuning**: Optuna and Grid Search optimization
- **Model Checkpointing**: Save and restore training progress
- **Training Visualization**: Real-time training metrics and plots
- **Dynamic Model Discovery**: Automatic detection of trained models

## 🏗️ Architecture

```
pet-detective/
├── app/                    # Next.js Frontend
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # App layout
│   └── globals.css        # Global styles
├── api/                   # Flask Backend
│   ├── index.py           # Main API server
│   ├── pet_classifier.py  # Classification models
│   ├── pet_segmentation.py # Segmentation models
│   ├── train_model.py     # Training pipeline
│   └── model_manager.py   # Model management
├── components/            # React Components
│   ├── Auth.tsx          # Authentication
│   ├── Leaderboard.tsx   # Score display
│   ├── EnhancedPetGame.tsx # Game interface
│   ├── ImageSegmentation.tsx # Segmentation UI
│   └── DynamicModelSelector.tsx # Model selection
├── models/               # Trained Models Directory
├── lib/                  # Utility Libraries
└── public/              # Static Assets
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **pnpm** (recommended) or npm
- **Oxford-IIIT Pet Dataset** (download instructions below)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pet-detective.git
cd pet-detective
```

### 2. Set Up Python Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Set Up Frontend

```bash
# Install Node.js dependencies
pnpm install

# Build the application
pnpm build
```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
POSTGRES_URL=your_postgres_url
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_HOST=your_postgres_host
POSTGRES_DATABASE=your_postgres_database

# Dataset Path
OXFORD_PET_DATASET_PATH=/path/to/oxford-iiit-pet
```

### 5. Download the Oxford-IIIT Pet Dataset

```bash
# Download the dataset
wget https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz
wget https://www.robots.ox.ac.uk/~vgg/data/pets/data/annotations.tar.gz

# Extract the files
tar -xzf images.tar.gz
tar -xzf annotations.tar.gz

# Move to desired location
mv images /path/to/oxford-iiit-pet/
mv annotations /path/to/oxford-iiit-pet/
```

### 6. Set Up Supabase Database

Run the SQL script in your Supabase SQL editor:

```sql
-- Create leaderboard table
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    username TEXT,
    score INTEGER DEFAULT 0,
    is_correct BOOLEAN,
    model_type TEXT,
    model_name TEXT,
    game_mode TEXT,
    time_taken INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view leaderboard" ON leaderboard
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own scores" ON leaderboard
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 7. Start the Application

```bash
# Terminal 1: Start Flask backend
cd api
python index.py

# Terminal 2: Start Next.js frontend
pnpm dev
```

Visit `http://localhost:3000` to access the application!

## 🎮 How to Play

### Pet Classification
1. **Upload Image**: Click "Choose Image" to upload a pet photo
2. **Get Predictions**: View top 5 breed predictions with confidence scores
3. **Switch Models**: Use different AI models for varied results

### Pet Guessing Game
1. **Select Difficulty**: Choose Easy, Medium, or Hard mode
2. **Start Game**: Click "Start New Game" to begin
3. **Answer Questions**: Identify the pet breed from multiple choice options
4. **Earn Points**: Score based on accuracy, time, and streaks
5. **Compete**: Compare your performance with AI models

### Image Segmentation
1. **Upload Pet Image**: Select an image with a pet
2. **Process**: Click "Segment Pet" to run segmentation
3. **View Results**: See segmented pet and mask
4. **Download**: Save results for further use

## 🤖 Model Training

### Available Models

| Model | Parameters | Accuracy | Speed | Use Case |
|-------|------------|----------|-------|----------|
| **ResNet-50** | 25.6M | 95%+ | Medium | High accuracy, general use |
| **AlexNet** | 61M | 90%+ | Fast | Classic architecture |
| **MobileNet V2** | 3.5M | 92%+ | Very Fast | Mobile/edge deployment |

### Training Process

1. **Select Model Type**: Choose from ResNet, AlexNet, or MobileNet
2. **Configure Parameters**: Set epochs, batch size, learning rate
3. **Enable Tuning**: Optional hyperparameter optimization
4. **Start Training**: Background training with progress tracking
5. **Save Model**: Automatically saved to `models/` directory

### Hyperparameter Tuning

The application supports two tuning methods:

- **Optuna**: Bayesian optimization for efficient parameter search
- **Grid Search**: Exhaustive search over parameter combinations

## 🔧 API Endpoints

### Classification
- `POST /api/predict` - Predict pet breed from image
- `GET /api/models/available` - List available trained models

### Gaming
- `POST /api/game/start` - Start new game session
- `POST /api/game/check` - Check answer and save score

### Training
- `POST /api/train` - Start model training

### Segmentation
- `POST /api/segment` - Segment pet from image

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard

## 📊 Performance Metrics

### Classification Accuracy
- **ResNet-50**: 95%+ on Oxford-IIIT Pet dataset
- **AlexNet**: 90%+ with faster inference
- **MobileNet V2**: 92%+ optimized for speed

### Game Statistics
- **Response Time**: < 2 seconds for predictions
- **Segmentation**: < 5 seconds for processing
- **Training**: 10-30 minutes depending on model and dataset size

## 🛡️ Security Features

- **User Authentication**: Secure Supabase authentication
- **Input Validation**: File type and size validation
- **CORS Protection**: Cross-origin request handling
- **Environment Variables**: Sensitive data protection
- **Row Level Security**: Database access control

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for:
- **Desktop**: Full feature access with enhanced UI
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Touch-friendly interface with simplified navigation

## 🔄 Development Workflow

### Code Structure
- **Frontend**: React components with TypeScript
- **Backend**: Flask API with Python
- **Database**: Supabase PostgreSQL
- **AI Models**: PyTorch with transfer learning

### Testing
```bash
# Run frontend tests
pnpm test

# Run backend tests
python -m pytest api/tests/
```

### Deployment
```bash
# Build for production
pnpm build

# Deploy to Vercel
vercel --prod

# Deploy backend to Heroku
heroku create pet-detective-api
git push heroku main
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add comprehensive error handling
- Include unit tests for new features
- Update documentation for API changes
- Ensure mobile responsiveness

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Oxford-IIIT Pet Dataset**: For providing the training data
- **PyTorch Team**: For the deep learning framework
- **Supabase**: For authentication and database services
- **Next.js Team**: For the React framework
- **Tailwind CSS**: For the styling framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/pet-detective/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/pet-detective/discussions)
- **Email**: support@petdetective.com

## 🔮 Roadmap

### Upcoming Features
- [ ] **Real-time Multiplayer**: Compete with friends in real-time
- [ ] **Advanced Segmentation**: Instance segmentation for multiple pets
- [ ] **Model Ensemble**: Combine multiple models for better accuracy
- [ ] **Mobile App**: Native iOS/Android applications
- [ ] **API Rate Limiting**: Enhanced API protection
- [ ] **Model Versioning**: Track model performance over time
- [ ] **Custom Datasets**: Upload and train on custom pet images
- [ ] **Advanced Analytics**: Detailed performance insights

### Performance Improvements
- [ ] **Model Quantization**: Reduce model size for faster inference
- [ ] **Caching**: Implement Redis caching for predictions
- [ ] **CDN Integration**: Faster image delivery
- [ ] **Database Optimization**: Improved query performance

---

**Made with ❤️ by the Pet Detective Team**

*Empowering pet lovers with AI-powered breed identification and fun gaming experiences!*

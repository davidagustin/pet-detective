# 🐕 Pet Detective - AI-Powered Pet Classification & Gaming Platform

<div align="center">

![Pet Detective](https://img.shields.io/badge/Pet-Detective-blue?style=for-the-badge&logo=github)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18+-blue?style=for-the-badge&logo=react)
![Next.js](https://img.shields.io/badge/Next.js-13+-black?style=for-the-badge&logo=next.js)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-red?style=for-the-badge&logo=pytorch)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)

**An intelligent pet classification system with interactive gaming, powered by deep learning and modern web technologies.**

[🚀 Quick Start](#-quick-start) • [🎮 Features](#-features) • [🛠️ Setup](#️-setup) • [🗄️ Database Setup](#️-database-setup) • [📚 Documentation](#-documentation) • [🤝 Contributing](#-contributing)

</div>

---

## 🎯 Overview

Pet Detective is a comprehensive AI-powered platform that combines deep learning pet classification with an interactive guessing game. Built with modern technologies including PyTorch, Next.js, and Supabase, it offers:

- **🤖 Advanced AI Models**: ResNet-50, AlexNet, and MobileNet V2 for pet classification
- **🎮 Interactive Gaming**: Compete against AI models in a pet guessing game
- **📊 Model Training**: Hyperparameter tuning and advanced training features
- **👥 Social Features**: Global leaderboards and user authentication
- **📱 Mobile-First Design**: Responsive, touch-optimized interface

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm/pnpm
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pet-detective.git
   cd pet-detective
   ```

2. **Set up Python environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up Node.js dependencies**
   ```bash
   pnpm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1: Start Flask API
   cd api && python index.py
   
   # Terminal 2: Start Next.js frontend
   pnpm dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` to start using Pet Detective!

---

## 🎮 Features

### 🤖 Deep Learning Pet Classification
- **Multiple Model Architectures**: ResNet-50, AlexNet, MobileNet V2
- **Transfer Learning**: Fine-tuned pre-trained models on Oxford-IIIT Pet dataset
- **Real-time Prediction**: Upload pet images and get instant breed predictions
- **Confidence Scores**: View prediction probabilities for each breed

### 🎯 Interactive Pet Guessing Game
- **AI vs Human Competition**: Challenge AI models in a guessing game
- **Multiple Difficulty Levels**: Choose from different AI models with varying accuracy
- **Score Tracking**: Keep track of your performance against each AI model
- **Leaderboard Integration**: Compare scores with other players globally
- **Same Pet Type Logic**: Questions focus on either cat breeds or dog breeds for better learning

### 🧠 Advanced Model Training
- **Hyperparameter Tuning**: 
  - Optuna-based Bayesian optimization
  - Grid search for systematic parameter exploration
  - Automatic best parameter selection
- **Training Features**:
  - Learning rate scheduling (Cosine, Plateau, Step)
  - Early stopping to prevent overfitting
  - Data augmentation (Random crops, flips, rotations, color jitter)
  - Weight decay and dropout for regularization
  - Detailed training logs and progress tracking

### 📊 Model Management System
- **Comprehensive Model Registry**: Track all trained models with metadata
- **Performance Analytics**: Detailed metrics and training history
- **Model Comparison**: Compare multiple models side-by-side
- **Training Visualization**: Automatic generation of training plots
- **Model Download**: Export trained models for external use

### 👥 User Authentication & Social Features
- **Supabase Integration**: Secure user authentication
- **Google OAuth**: Easy sign-in with Google accounts
- **User Profiles**: Personalized experience with saved preferences
- **Global Leaderboard**: Compete with users worldwide
- **Score Persistence**: Track your progress over time

### 📱 Mobile-First Design
- **Touch-Optimized Interface**: Large buttons and touch-friendly controls
- **Responsive Grid Layouts**: Adapts to all screen sizes
- **Mobile Navigation**: Intuitive mobile navigation patterns
- **Fast Loading**: Optimized for mobile network conditions
- **Progressive Web App**: Works offline and can be installed on mobile devices

---

## 🛠️ Setup

### Supabase Configuration

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and sign up/login
   - Create a new project and wait for setup

2. **Get Your Project Credentials**
   - Go to Settings > API in your project dashboard
   - Copy: Project URL, Anon public key, Service role key

3. **Set Up Environment Variables**
   Create `.env.local` in your project root:
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

4. **Configure Google OAuth (Optional)**
   - Create Google OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google provider in Supabase Authentication > Providers
   - Add redirect URIs for your domain

5. **Set Up Database Schema**
   See the [Database Setup](#-database-setup) section below for comprehensive database configuration.

### Pet Images Setup

The quiz uses images from the `images/` folder at the project root. Images should follow this naming convention:

**Format**: `{breed_name}_{number}.{extension}`

**Examples**:
- `abyssinian_1.jpg`
- `beagle_2.png`
- `persian_3.jpeg`

**Supported Breeds**:

🐱 **Cat Breeds (12 total)**:
- Abyssinian, Bengal, Birman, Bombay, British Shorthair, Egyptian Mau, Maine Coon, Persian, Ragdoll, Russian Blue, Siamese, Sphynx

🐕 **Dog Breeds (25 total)**:
- American Bulldog, American Pit Bull Terrier, Basset Hound, Beagle, Boxer, Chihuahua, English Cocker Spaniel, English Setter, German Shorthaired, Great Pyrenees, Havanese, Japanese Chin, Keeshond, Leonberger, Miniature Pinscher, Newfoundland, Pomeranian, Pug, Saint Bernard, Samoyed, Scottish Terrier, Shiba Inu, Staffordshire Bull Terrier, Wheaten Terrier, Yorkshire Terrier

---

## 🗄️ Database Setup

This section explains how to set up the required database tables and functions for the Pet Detective application.

### Required SQL Files

Execute these SQL files in your Supabase dashboard in the following order:

#### 1. Main Database Setup
**File**: `supabase/supabase_setup.sql`

This creates:
- `profiles` table for user management
- `leaderboard` table for game scores
- Row Level Security (RLS) policies
- Triggers for automatic profile creation

#### 2. Pet Images Schema
**File**: `supabase/pet_images_schema.sql`

This creates:
- `pet_images` table for storing pet image metadata
- Indexes for faster queries
- RLS policies for image access

#### 3. User Deletion Function
**File**: `supabase/delete_user_function.sql`

This creates:
- `delete_user_account()` function with elevated privileges
- Proper permissions for authenticated users
- Complete user data deletion capability

### How to Execute SQL Files

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to "SQL Editor"

2. **Execute Each File**
   - Copy the contents of each SQL file
   - Paste into the SQL editor
   - Click "Run" to execute
   - **Note**: Files can be run multiple times safely (they handle existing objects)

3. **Verify Setup**
   - Check "Table Editor" to see the created tables
   - Verify RLS policies are enabled
   - Test the delete function works

### Safe Re-execution

All SQL files are designed to be **idempotent** - they can be run multiple times without errors:

- **Tables**: Use `CREATE TABLE IF NOT EXISTS`
- **Policies**: Drop existing policies before creating new ones
- **Functions**: Use `CREATE OR REPLACE FUNCTION`
- **Triggers**: Drop existing triggers before creating new ones
- **Sample Data**: Clear and re-insert sample data for consistency

### Features Enabled After Setup

#### ✅ With Database Setup:
- Complete user profiles with usernames
- Game leaderboard functionality
- Proper account deletion (removes all data)
- Username uniqueness validation
- Row-level security for data protection

#### ⚠️ Without Database Setup:
- Basic authentication still works
- Account "deletion" only signs out user
- No persistent user profiles
- No leaderboard functionality
- Limited data validation

### Troubleshooting

#### "Table does not exist" errors:
- Execute `supabase/supabase_setup.sql`
- Check table creation was successful

#### "Function does not exist" errors:
- Execute `supabase/delete_user_function.sql`
- Verify function permissions are granted

#### RLS policy errors:
- Ensure RLS is enabled on all tables
- Check policy definitions match user permissions

### Development vs Production

#### Development:
- Can run without full database setup
- Limited functionality but app won't crash
- Graceful degradation for missing features

#### Production:
- **Must** execute all SQL files
- Full functionality requires complete database setup
- Users expect all features to work properly

### Security Notes

- The `delete_user_account()` function uses `SECURITY DEFINER`
- This allows it to delete from `auth.users` table
- Only authenticated users can execute the function
- Function validates user identity before deletion

---

## 📚 Documentation

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predict` | POST | Predict pet breed from uploaded image |
| `/api/game/start` | POST | Start new pet guessing game |
| `/api/game/check` | POST | Check game answer and save score |
| `/api/train` | POST | Train new model with hyperparameters |
| `/api/models/available` | GET | Get list of available trained models |
| `/api/leaderboard` | GET | Get global leaderboard |
| `/api/segment` | POST | Perform image segmentation |

### Model Training

**Supported Model Types**:
- `resnet`: ResNet-50 architecture (high accuracy, medium speed)
- `alexnet`: AlexNet architecture (medium accuracy, fast speed)
- `mobilenet`: MobileNet V2 architecture (lower accuracy, very fast speed)

**Training Types**:
- `standard`: Models trained with default hyperparameters
- `tuned`: Models trained with hyperparameter optimization

**Model File Naming**:
- Format: `{model_type}_{training_type}_{timestamp}.pth`
- Examples:
  - `resnet_standard_1703123456.pth`
  - `alexnet_tuned_1703123457.pth`
  - `mobilenet_standard_1703123458.pth`

**Model Storage**:
- Location: `models/` directory
- Size estimates:
  - ResNet models: ~100-200 MB
  - AlexNet models: ~200-300 MB
  - MobileNet models: ~20-50 MB

### Game Mechanics

**Difficulty Levels**:
- **Easy**: 2 wrong options, similar difficulty
- **Medium**: 3 wrong options, mix of easy and hard
- **Hard**: 3 wrong options, more challenging

**Scoring System**:
- Correct answer: 10 points
- Speed bonuses for quick responses
- Streak multipliers for consecutive correct answers
- Global rankings and leaderboards

**Pet Type Logic**:
- Questions focus on either cat breeds OR dog breeds
- All wrong options are the same pet type as the correct answer
- Visual indicators show whether it's a "Cat Breeds" or "Dog Breeds" question

---

## 🏗️ Architecture

### Backend (Flask API)
- **RESTful API Design**: Clean, scalable API endpoints
- **Model Serving**: Efficient model loading and inference
- **Background Training**: Asynchronous model training
- **File Management**: Secure file upload and storage
- **Error Handling**: Comprehensive error handling and logging

### Frontend (Next.js)
- **React Components**: Modular, reusable component architecture
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first responsive styling
- **State Management**: Efficient client-side state management
- **Real-time Updates**: Live updates for training progress

### Database (Supabase)
- **PostgreSQL**: Robust relational database
- **Row Level Security**: Secure data access
- **Real-time Subscriptions**: Live leaderboard updates
- **User Management**: Built-in authentication and authorization

---

## 🚀 Deployment

### Production Deployment

1. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Set Environment Variables**:
   Add all environment variables from `.env.local` to your Vercel project settings

3. **Configure Supabase**:
   - Update site URL in Supabase Authentication settings
   - Add production redirect URLs

### Docker Deployment

```bash
# Build and run with Docker
docker build -t pet-detective .
docker run -p 3000:3000 pet-detective
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Oxford-IIIT Pet Dataset** for providing the training data
- **PyTorch** for the deep learning framework
- **Supabase** for the backend-as-a-service platform
- **Next.js** for the React framework
- **Tailwind CSS** for the styling framework

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/pet-detective/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/pet-detective/discussions)
- **Email**: support@petdetective.com

---

<div align="center">

**Made with ❤️ by the Pet Detective Team**

[⬆️ Back to Top](#-pet-detective---ai-powered-pet-classification--gaming-platform)

</div>

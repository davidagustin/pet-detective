# 🐕 Pet Detective - AI-Powered Pet Breed Recognition Game

[![Next.js](https://img.shields.io/badge/Next.js-14.2.32-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Image_CDN-3448C5?style=flat-square&logo=cloudinary)](https://cloudinary.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square&logo=vercel)](https://vercel.com/)

> **Compete against AI models in real-time pet breed recognition!** Test your knowledge of cat and dog breeds while competing against state-of-the-art machine learning models.

## 🎮 Live Demo

**[Play Pet Detective Now](https://pet-detective.vercel.app/)**

## ✨ Features

### 🎯 **Core Gameplay**
- **Multi-Difficulty Levels**: Easy (45s), Medium (30s), Hard (20s) time limits
- **Flexible Question Counts**: Choose 5, 10, 15, or 20 questions per game
- **Animal Type Filtering**: Play with cats only, dogs only, or both
- **Real-Time Progress Tracking**: Visual progress bar and question counter
- **Streak System**: Build and maintain answer streaks for bonus points

### 🤖 **AI Competition**
- **Multiple AI Models**: Compete against ResNet-50, MobileNet V2, and AlexNet
- **Real Predictions**: AI models make actual breed classifications
- **Accuracy Comparison**: See how you perform against AI accuracy rates
- **Competition Results**: Detailed comparison of your answers vs AI predictions

### 🏆 **Leaderboard & Scoring**
- **Real-Time Leaderboard**: Live rankings with Supabase integration
- **Dynamic Scoring**: Points based on accuracy, speed, difficulty, and streaks
- **Global Statistics**: Track your performance across multiple games
- **Achievement System**: Compete for high scores and streaks

### 🎨 **User Experience**
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark/Light Mode**: Automatic theme switching with system preferences
- **Accessibility**: Full keyboard navigation and screen reader support
- **Smooth Animations**: Polished UI with smooth transitions and feedback

### 🔐 **Authentication**
- **Secure Login**: Supabase authentication with email confirmation
- **Password Reset**: Secure password recovery system
- **User Profiles**: Personalized gaming experience
- **Session Management**: Persistent login across browser sessions

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 14.2.32** - React framework with App Router
- **TypeScript 5.0** - Type-safe development
- **Tailwind CSS 3.3** - Utility-first CSS framework
- **React Hooks** - Modern state management

### **Backend & APIs**
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - Real-time database and authentication
- **Cloudinary** - Image hosting and optimization
- **Vercel** - Deployment and hosting platform

### **AI & Machine Learning**
- **PyTorch Models** - Pre-trained pet breed classification models
- **ResNet-50** - High-accuracy deep learning model
- **MobileNet V2** - Mobile-optimized model
- **AlexNet** - Classic CNN architecture

### **Data & Storage**
- **Supabase PostgreSQL** - Real-time database
- **Cloudinary CDN** - Global image delivery
- **JSON Data** - Breed mapping and metadata

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18.17.0 or higher
- pnpm package manager
- Supabase account
- Cloudinary account

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/davidagustin/pet-detective.git
   cd pet-detective
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Cloudinary Configuration
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Database Setup**
   ```sql
   -- Run the Supabase schema setup
   -- See supabase/supabase_setup.sql for details
   ```

5. **Start Development Server**
   ```bash
   pnpm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🎯 How to Play

### **Getting Started**
1. **Choose Your Settings**:
   - Select difficulty level (Easy/Medium/Hard)
   - Choose animal type (Cats/Dogs/Both)
   - Pick number of questions (5/10/15/20)
   - Select AI model to compete against

2. **Start the Game**:
   - Click "Start New Game"
   - A pet image will appear
   - Choose the correct breed from the options
   - Submit your answer before time runs out

3. **Track Your Progress**:
   - Watch the progress bar fill up
   - Monitor your streak and score
   - Compare your answers with AI predictions

4. **Complete the Game**:
   - Answer all questions in your selected count
   - View final results and leaderboard position
   - Start a new game or try different settings

### **Scoring System**
- **Base Points**: 10 points per correct answer
- **Time Bonus**: Faster answers earn more points
- **Streak Bonus**: Consecutive correct answers multiply points
- **Difficulty Multiplier**: Harder modes earn more points
- **AI Competition**: Beat the AI for additional bonuses

## 📁 Project Structure

```
pet-detective/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── Auth.tsx          # Authentication component
│   ├── EnhancedPetGame.tsx # Main game component
│   ├── Leaderboard.tsx   # Leaderboard display
│   └── ...               # Other components
├── lib/                   # Utility libraries
│   ├── api-client.ts     # API client
│   ├── cloudinary.ts     # Cloudinary integration
│   ├── config.ts         # Configuration
│   └── supabase.ts       # Supabase client
├── models/               # AI model files
├── api/                  # Python API (legacy)
├── supabase/            # Database schemas
└── public/              # Static assets
```

## 🔧 API Endpoints

### **Game Management**
- `POST /api/game/start` - Start a new game
- `POST /api/game/check` - Check answer and update score
- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/models/available` - Get available AI models

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/reset-password` - Password reset

## 🎨 Customization

### **Adding New Breeds**
1. Update `api/breed_mapping.json` with new breed data
2. Add corresponding images to Cloudinary
3. Update the AI model training data

### **Modifying Game Settings**
- Edit `components/EnhancedPetGame.tsx` for game logic
- Update `lib/config.ts` for configuration changes
- Modify `app/api/game/start/route.ts` for API changes

### **Styling Changes**
- Use Tailwind CSS classes for styling
- Modify `app/globals.css` for global styles
- Update component-specific styles in individual files

## 🚀 Deployment

### **Vercel Deployment**
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Environment Variables**
Ensure all required environment variables are set in your deployment platform:
- Supabase configuration
- Cloudinary credentials
- API keys and secrets

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Development Guidelines**
- Follow TypeScript best practices
- Use conventional commit messages
- Ensure all tests pass
- Update documentation as needed

## 📊 Performance

### **Optimizations**
- **Image Optimization**: Cloudinary CDN with automatic optimization
- **Code Splitting**: Next.js automatic code splitting
- **Static Generation**: Optimized static page generation
- **Caching**: Efficient caching strategies

### **Metrics**
- **Lighthouse Score**: 95+ across all categories
- **Core Web Vitals**: Optimized for performance
- **Accessibility**: WCAG 2.1 AA compliant
- **SEO**: Fully optimized for search engines

## 🐛 Troubleshooting

### **Common Issues**

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
pnpm run build
```

**API Connection Issues**
- Verify environment variables are set correctly
- Check Supabase and Cloudinary credentials
- Ensure API endpoints are accessible

**Image Loading Problems**
- Verify Cloudinary configuration
- Check image URLs in browser network tab
- Ensure breed mapping data is correct

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* pnpm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Oxford-IIIT Pet Dataset** - Pet breed images and data
- **PyTorch** - Machine learning framework
- **Supabase** - Backend-as-a-Service
- **Cloudinary** - Image management platform
- **Vercel** - Deployment platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/davidagustin/pet-detective/issues)
- **Discussions**: [GitHub Discussions](https://github.com/davidagustin/pet-detective/discussions)
- **Email**: [Contact Support](mailto:support@pet-detective.com)

---

**Made with ❤️ by the Pet Detective Team**

*Challenge your pet knowledge and compete against AI!*

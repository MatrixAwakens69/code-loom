#!/bin/bash

echo "🚀 Installing Firebase dependencies for CodeLoom..."

echo "📦 Installing client dependencies..."
cd client
npm install firebase@^10.7.1
cd ..

echo "📦 Installing server dependencies..."
cd server
npm install firebase-admin@^12.0.0
npm uninstall passport passport-google-oauth20 express-session
cd ..

echo "✅ Firebase dependencies installed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Set up Firebase project and get your config"
echo "2. Download service account key from Firebase Console"
echo "3. Update your .env files with Firebase configuration"
echo "4. Run 'npm run dev' to start development"
echo ""
echo "📚 See SETUP.md for detailed Firebase setup instructions"

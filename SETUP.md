# CodeLoom Setup Guide

This guide will help you set up CodeLoom for local development and production deployment.

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd code-loom
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables** (see sections below)

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 🔥 Firebase Setup (Authentication)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `codeloom` (or your preferred name)
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In the left sidebar, click "Authentication"
2. Click "Get started" or "Sign-in method" tab
3. Click on "Google" provider
4. Toggle "Enable" to turn it on
5. Choose your project support email
6. Click "Save"

### Step 3: Get Firebase Config

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click "Add app" and choose web (</>)
5. Register your app with a nickname (e.g., "CodeLoom Web")
6. Copy the config object

### Step 4: Get Service Account Key

1. In Project settings, go to "Service accounts" tab
2. Click "Generate new private key"
3. Download the JSON file
4. **Keep this file secure** - it contains sensitive credentials

## 🗄️ MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new project

### Step 2: Create Cluster

1. Click "Build a Database"
2. Choose "FREE" tier (M0)
3. Select your preferred cloud provider and region
4. Click "Create"

### Step 3: Set Up Database Access

1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username and password
5. Set privileges to "Read and write to any database"
6. Click "Add User"

### Step 4: Set Up Network Access

1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your specific IP addresses
5. Click "Confirm"

### Step 5: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `codeloom`

## 📁 Environment Variables

### Client (.env)

Create `client/.env`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your_app_id

# Server URL
VITE_SERVER_URL=http://localhost:5000
```

### Server (.env)

Create `server/.env`:

```bash
# MongoDB Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/codeloom?retryWrites=true&w=majority

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your_project","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# JWT Secret (for any additional JWT needs)
JWT_SECRET=your_random_jwt_secret_here
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Install Dependencies

```bash
# Install all dependencies (client + server)
npm run install:all

# Or install separately:
npm install                    # Root dependencies
cd client && npm install      # Client dependencies
cd ../server && npm install   # Server dependencies
```

### Start Development Servers

```bash
# Start both client and server
npm run dev

# Or start separately:
cd server && npm run dev      # Backend (port 5000)
cd ../client && npm run dev   # Frontend (port 5173)
```

### Build for Production

```bash
# Build both client and server
npm run build

# Or build separately:
cd client && npm run build    # Frontend build
cd ../server && npm run build # Backend build
```

## 🚀 Production Deployment

### Frontend (GitHub Pages)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/docs" folder
   - Click "Save"

3. **Update Environment Variables**
   - Update `VITE_SERVER_URL` to your production backend URL
   - Update Firebase config for production domain

### Backend (Render)

1. **Create Render Account**
   - Go to [Render](https://render.com/)
   - Sign up with GitHub

2. **Deploy Backend**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: `codeloom-backend`
     - Environment: `Node`
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
     - Plan: Free

3. **Set Environment Variables**
   - Add all variables from `server/.env`
   - Update URLs to production values

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete

## 🔧 Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**
   - Verify Firebase config in client
   - Check service account key in server
   - Ensure domains are whitelisted in Firebase

2. **MongoDB Connection Issues**
   - Verify connection string format
   - Check network access settings
   - Ensure database user has correct permissions

3. **CORS Errors**
   - Verify `CLIENT_URL` in server environment
   - Check CORS configuration in server code

4. **Build Errors**
   - Clear `node_modules` and reinstall
   - Check TypeScript configuration
   - Verify all environment variables are set

### Development Tips

- Use browser dev tools to debug frontend issues
- Check server logs for backend errors
- Use MongoDB Compass for database debugging
- Test Firebase auth in incognito mode

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [React Documentation](https://reactjs.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Socket.IO Documentation](https://socket.io/docs/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review environment variable configuration
3. Check server and client console logs
4. Verify all dependencies are installed correctly
5. Ensure ports 5000 and 5173 are available

For additional help, please check the project's GitHub issues or create a new one.

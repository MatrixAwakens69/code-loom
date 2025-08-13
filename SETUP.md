# CodeLoom Setup Guide

This guide will help you set up and deploy CodeLoom, a real-time collaborative code editor with voice chat.

## Prerequisites

- Node.js 18 or higher
- MongoDB (local or cloud)
- Google OAuth credentials
- Git

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/code-loom.git
cd code-loom
```

### 2. Install Dependencies

```bash
# Install root dependencies (for parallel development)
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration

#### Server Environment Variables

Create `server/.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/codeloom

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT & Session Secrets (generate random strings)
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
SESSION_SECRET=your_session_secret_here_minimum_32_characters

# Frontend URL
CLIENT_URL=http://localhost:3000

# Server Configuration
PORT=5000
NODE_ENV=development
```

#### Client Environment Variables

Create `client/.env` file:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - For local development: `http://localhost:5000/api/auth/google/callback`
   - For production: `https://your-backend-domain.com/api/auth/google/callback`
7. Copy Client ID and Client Secret to your `.env` file

### 5. MongoDB Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB (varies by OS)
# Ubuntu/Debian:
sudo apt-get install mongodb

# macOS with Homebrew:
brew install mongodb/brew/mongodb-community

# Start MongoDB
sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free account and cluster
3. Get connection string
4. Add to `MONGODB_URI` in `.env`

### 6. Start Development Servers

```bash
# Start both frontend and backend (from root directory)
npm run dev

# Or start individually:
# Backend only
cd server && npm run dev

# Frontend only
cd client && npm run dev
```

Visit `http://localhost:3000` to see the application.

## Production Deployment

### Frontend Deployment (GitHub Pages)

1. **Repository Setup**
   ```bash
   # Make sure your code is pushed to GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Configure GitHub Secrets**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Add these secrets:
     - `VITE_API_URL`: Your backend URL (e.g., `https://your-app.onrender.com`)
     - `CUSTOM_DOMAIN` (optional): Custom domain if you have one

3. **Enable GitHub Pages**
   - Repository Settings → Pages
   - Source: "GitHub Actions"

4. **Update Vite Config**
   Update `client/vite.config.ts` base path:
   ```typescript
   export default defineConfig({
     plugins: [react()],
     base: '/code-loom/', // Replace with your repository name
     // ... rest of config
   })
   ```

5. **Deploy**
   - Push to main branch
   - GitHub Actions will automatically build and deploy
   - Access at: `https://your-username.github.io/code-loom/`

### Backend Deployment (Render)

1. **Create Render Account**
   - Go to [Render](https://render.com)
   - Sign up with GitHub

2. **Create MongoDB Database**
   - In Render dashboard: "New" → "PostgreSQL" → "MongoDB"
   - Choose free tier
   - Note the connection string

3. **Deploy Backend**
   - "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Root Directory**: `server`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Node Version**: 18

4. **Environment Variables**
   Add these in Render dashboard:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   JWT_SECRET=your_jwt_secret_32_plus_characters
   SESSION_SECRET=your_session_secret_32_plus_characters
   CLIENT_URL=https://your-username.github.io/code-loom
   ```

5. **Update Google OAuth**
   - Add production callback URL to Google OAuth:
   - `https://your-app.onrender.com/api/auth/google/callback`

### Alternative: Docker Deployment

1. **Build Docker Image**
   ```bash
   cd server
   docker build -t codeloom-backend .
   ```

2. **Run with Docker Compose**
   Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     backend:
       build: ./server
       ports:
         - "5000:5000"
       environment:
         - NODE_ENV=production
         - MONGODB_URI=mongodb://mongo:27017/codeloom
         - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
         - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
         - JWT_SECRET=${JWT_SECRET}
         - SESSION_SECRET=${SESSION_SECRET}
         - CLIENT_URL=${CLIENT_URL}
       depends_on:
         - mongo
     
     mongo:
       image: mongo:latest
       ports:
         - "27017:27017"
       volumes:
         - mongo_data:/data/db
   
   volumes:
     mongo_data:
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

## Troubleshooting

### Common Issues

1. **OAuth Errors**
   - Check Google OAuth redirect URIs
   - Verify CLIENT_URL matches your frontend domain
   - Ensure GOOGLE_CLIENT_ID and SECRET are correct

2. **Database Connection**
   - Verify MONGODB_URI format
   - Check MongoDB server is running
   - For Atlas: check IP whitelist

3. **CORS Issues**
   - Verify CLIENT_URL in backend .env
   - Check frontend API_URL points to correct backend

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all environment variables are set

### Performance Optimization

1. **Frontend**
   - Enable gzip compression
   - Use CDN for static assets
   - Implement code splitting

2. **Backend**
   - Use Redis for session storage
   - Implement database indexing
   - Use connection pooling

### Security Considerations

1. **Secrets Management**
   - Never commit .env files
   - Use strong, unique secrets
   - Rotate secrets regularly

2. **HTTPS**
   - Always use HTTPS in production
   - Update OAuth redirect URIs accordingly

3. **Rate Limiting**
   - Implement API rate limiting
   - Add DDOS protection

## Support

For issues and questions:
1. Check this setup guide
2. Review the troubleshooting section
3. Check GitHub issues
4. Create a new issue with detailed information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

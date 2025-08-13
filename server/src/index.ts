import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import { setupCollaboration } from './collaboration/yjs-server';

dotenv.config();

console.log('Environment check:', {
  hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
  firebaseKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0
});

// Initialize Firebase Admin after environment variables are loaded
import './config/firebase-admin';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
connectDatabase();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Setup Y.js collaboration server
setupCollaboration(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

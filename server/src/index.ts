import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

// Import configurations and models
import { connectDatabase } from './config/database'
import { configurePassport } from './config/passport'
import { User } from './models/User'
import { Project } from './models/Project'

// Import routes
import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'

// Import Y.js collaboration
import { setupCollaboration } from './collaboration/yjs-server'

dotenv.config()

const app = express()
const server = createServer(app)

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

// Initialize passport
app.use(passport.initialize())
app.use(passport.session())
configurePassport()

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)

// Socket.IO setup
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
})

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('No token provided'))
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return next(new Error('JWT secret not configured'))
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    const user = await User.findById(decoded.userId)

    if (!user) {
      return next(new Error('User not found'))
    }

    socket.data.user = user
    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

// Setup Y.js collaboration
setupCollaboration(io)

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.data.user.name} connected: ${socket.id}`)

  // Join project room
  socket.on('join-project', async (projectId: string) => {
    try {
      const userId = socket.data.user._id

      // Verify user has access to project
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: userId },
          { 'members.user': userId },
          { isPublic: true }
        ]
      })

      if (!project) {
        socket.emit('error', 'Project not found or access denied')
        return
      }

      // Join room
      socket.join(`project:${projectId}`)
      
      // Notify others in the room
      socket.to(`project:${projectId}`).emit('user-joined', {
        user: {
          id: socket.data.user._id,
          name: socket.data.user.name,
          avatar: socket.data.user.avatar
        }
      })

      // Send current active users in the room
      const room = io.sockets.adapter.rooms.get(`project:${projectId}`)
      const activeUsers: any[] = []
      
      if (room) {
        for (const socketId of room) {
          const userSocket = io.sockets.sockets.get(socketId)
          if (userSocket && userSocket.data.user) {
            activeUsers.push({
              id: userSocket.data.user._id,
              name: userSocket.data.user.name,
              avatar: userSocket.data.user.avatar
            })
          }
        }
      }

      socket.emit('active-users', activeUsers)
      
      console.log(`User ${socket.data.user.name} joined project ${projectId}`)
    } catch (error) {
      console.error('Join project error:', error)
      socket.emit('error', 'Failed to join project')
    }
  })

  // Leave project room
  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`)
    socket.to(`project:${projectId}`).emit('user-left', {
      user: {
        id: socket.data.user._id,
        name: socket.data.user.name,
        avatar: socket.data.user.avatar
      }
    })
    console.log(`User ${socket.data.user.name} left project ${projectId}`)
  })

  // File changes
  socket.on('file-change', (data: { projectId: string, filePath: string, content: string }) => {
    socket.to(`project:${data.projectId}`).emit('file-changed', {
      filePath: data.filePath,
      content: data.content,
      user: {
        id: socket.data.user._id,
        name: socket.data.user.name
      }
    })
  })

  // Cursor position updates
  socket.on('cursor-position', (data: { projectId: string, filePath: string, position: any }) => {
    socket.to(`project:${data.projectId}`).emit('cursor-updated', {
      filePath: data.filePath,
      position: data.position,
      user: {
        id: socket.data.user._id,
        name: socket.data.user.name,
        avatar: socket.data.user.avatar
      }
    })
  })

  // WebRTC signaling for voice chat
  socket.on('webrtc-offer', (data: { projectId: string, to: string, offer: any }) => {
    socket.to(data.to).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer
    })
  })

  socket.on('webrtc-answer', (data: { to: string, answer: any }) => {
    socket.to(data.to).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer
    })
  })

  socket.on('webrtc-ice-candidate', (data: { to: string, candidate: any }) => {
    socket.to(data.to).emit('webrtc-ice-candidate', {
      from: socket.id,
      candidate: data.candidate
    })
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.data.user.name} disconnected: ${socket.id}`)
    // Notify all rooms this user was in
    socket.rooms.forEach(room => {
      if (room.startsWith('project:')) {
        socket.to(room).emit('user-left', {
          user: {
            id: socket.data.user._id,
            name: socket.data.user.name,
            avatar: socket.data.user.avatar
          }
        })
      }
    })
  })
})

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await connectDatabase()
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User, IUser } from '../models/User'

export interface AuthRequest extends Request {
  user?: IUser
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      res.status(401).json({ error: 'Access token required' })
      return
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      res.status(500).json({ error: 'JWT secret not configured' })
      return
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    const user = await User.findById(decoded.userId)

    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(403).json({ error: 'Invalid token' })
  }
}

export const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT secret not configured')
  }
  
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' })
}

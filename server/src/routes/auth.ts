import express from 'express'
import passport from 'passport'
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth'

const router = express.Router()

// Google OAuth login
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      const user = req.user as any
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`)
      }

      const token = generateToken(user._id.toString())
      res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`)
    } catch (error) {
      console.error('OAuth callback error:', error)
      res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`)
    }
  }
)

// Get current user
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({
    success: true,
    user: {
      id: req.user!._id,
      email: req.user!.email,
      name: req.user!.name,
      avatar: req.user!.avatar,
      googleId: req.user!.googleId
    }
  })
})

// Logout
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  res.json({ success: true, message: 'Logged out successfully' })
})

export default router

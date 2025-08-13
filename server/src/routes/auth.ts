import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get current user
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find or create user in our database
    let user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user) {
      // Create new user if they don't exist
      user = new User({
        firebaseUid: req.user.uid,
        email: req.user.email,
        name: req.user.name || req.user.email?.split('@')[0] || 'User',
        avatar: req.user.picture,
      });
      await user.save();
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout (client-side Firebase handles this, but we can clear server-side data if needed)
router.post('/logout', auth, async (req: AuthRequest, res: Response) => {
  try {
    // Firebase handles logout on the client side
    // Here you can add any server-side cleanup if needed
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

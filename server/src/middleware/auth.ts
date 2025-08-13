import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../config/firebase-admin';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify the Firebase ID token
      const adminAuth = getAdminAuth();
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

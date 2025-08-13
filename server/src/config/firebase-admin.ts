import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminAuth: any = null;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      const serviceAccount = JSON.parse(serviceAccountKey);
      
      if (!serviceAccount.project_id) {
        throw new Error('Service account JSON is missing project_id');
      }

      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw error;
    }
  }
  
  if (!adminAuth) {
    adminAuth = getAuth();
  }
  
  return adminAuth;
}

export function getAdminAuth() {
  return initializeFirebaseAdmin();
}

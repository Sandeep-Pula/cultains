import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { dashboardService } from '../dashboard/services/dashboardService';

const requireAuth = () => {
  if (!auth) {
    throw new Error('Firebase authentication is not configured yet. Add the required VITE_FIREBASE_* variables and reload the app.');
  }

  return auth;
};

export const authService = {
  async signUp(email: string, password: string, name: string) {
    const authInstance = requireAuth();
    await setPersistence(authInstance, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(authInstance, email, password);

    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    await dashboardService.ensureUserProfile(credential.user, name.trim());
    return credential.user;
  },

  async signIn(email: string, password: string) {
    const authInstance = requireAuth();
    await setPersistence(authInstance, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(authInstance, email, password);
    await dashboardService.ensureUserProfile(credential.user);
    return credential.user;
  },

  async requestPasswordReset(email: string) {
    const authInstance = requireAuth();
    await sendPasswordResetEmail(authInstance, email);
  },

  async logout() {
    const authInstance = requireAuth();
    await signOut(authInstance);
  },
};

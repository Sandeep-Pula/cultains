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

export const authService = {
  async signUp(email: string, password: string, name: string) {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    await dashboardService.ensureUserProfile(credential.user, name.trim());
    return credential.user;
  },

  async signIn(email: string, password: string) {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await dashboardService.ensureUserProfile(credential.user);
    return credential.user;
  },

  async requestPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  },

  async logout() {
    await signOut(auth);
  },
};

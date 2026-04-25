import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  setPersistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import { auth, firebaseConfig } from './firebase';
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

    const profile = await dashboardService.getExistingUserProfile(credential.user.uid);
    if (!profile) {
      await signOut(authInstance);
      throw new Error('This login is not linked to an active business workspace. Ask the business owner to create or restore your team access.');
    }

    if (profile.accountType === 'team_member') {
      const ownerUserId = profile.workspaceOwnerId;
      const linkedTeamMemberId = profile.linkedTeamMemberId;

      if (!ownerUserId || !linkedTeamMemberId) {
        await signOut(authInstance);
        throw new Error('This staff login is incomplete. Ask the business owner to restore your team access.');
      }

      const teamAccess = await dashboardService.getTeamMemberAccess(ownerUserId, linkedTeamMemberId);
      if (!teamAccess?.loginEnabled) {
        await signOut(authInstance);
        throw new Error('This staff login has been removed or disabled by the business owner.');
      }
    }

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

  async createTeamMemberAccount(email: string, password: string, name: string) {
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
      throw new Error('Firebase authentication is not configured yet. Add the required VITE_FIREBASE_* variables and reload the app.');
    }

    const secondaryApp = initializeApp(firebaseConfig, `team-member-${crypto.randomUUID()}`);
    try {
      const secondaryAuth = getAuth(secondaryApp);
      let credential;

      try {
        credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      } catch (error) {
        const code = error instanceof Error && 'code' in error ? String(error.code) : '';
        if (code === 'auth/email-already-in-use') {
          credential = await signInWithEmailAndPassword(secondaryAuth, email, password);
        } else {
          throw error;
        }
      }

      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
      await signOut(secondaryAuth);
      return credential.user;
    } finally {
      await deleteApp(secondaryApp).catch(() => undefined);
    }
  },
};

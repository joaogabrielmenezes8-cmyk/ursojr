import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

// Notify backend about active token so WhatsApp AI agent can use Google Calendar & Tasks
export const syncTokenWithBackend = async (token: string, email?: string) => {
  try {
    await fetch('/api/google/sync-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    });
  } catch (err) {
    console.warn('Failed to sync Google token with backend:', err);
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        await syncTokenWithBackend(cachedAccessToken, user.email || undefined);
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to get token from server if already synced
        try {
          const res = await fetch('/api/google/status');
          const data = await res.json();
          if (data.connected && data.hasToken) {
            cachedAccessToken = 'SERVER_SESSION';
            if (onAuthSuccess) onAuthSuccess(user, 'SERVER_SESSION');
            return;
          }
        } catch (_) {}
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter access token do Google');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    await syncTokenWithBackend(cachedAccessToken, result.user.email || undefined);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const reconnectGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  return googleSignIn();
};

export const disconnectGoogle = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
    cachedUser = null;
    await fetch('/api/google/disconnect', { method: 'POST' });
  } catch (err) {
    console.error('Error disconnecting Google:', err);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return cachedUser;
};

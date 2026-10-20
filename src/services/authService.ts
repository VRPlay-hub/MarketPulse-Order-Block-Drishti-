import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  type User
} from './firebase.ts';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'firebase-google' | 'secure-local' | 'guest';
  createdAt: string;
}

const LOCAL_SESSION_KEY = 'marketpulse_auth_session';
const LOCAL_USERS_VAULT_KEY = 'marketpulse_users_vault_secure';

type AuthListener = (user: AppUser | null) => void;
const listeners: Set<AuthListener> = new Set();
let currentUserState: AppUser | null = null;

// Cryptographic hash for secure local accounts (prevents storing plaintext passwords)
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + '_marketpulse_secure_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function notifyListeners() {
  listeners.forEach(cb => cb(currentUserState));
}

// Initialize Auth
export function initializeAuth(): () => void {
  // Check if we have an active local session first
  const storedSession = localStorage.getItem(LOCAL_SESSION_KEY);
  if (storedSession) {
    try {
      currentUserState = JSON.parse(storedSession);
      notifyListeners();
    } catch {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  }

  // Listen to Firebase Auth state
  const unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (firebaseUser) {
      const user: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || 'trader@marketpulse.in',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'NSE Pro Trader',
        photoURL: firebaseUser.photoURL || undefined,
        provider: 'firebase-google',
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
      };
      currentUserState = user;
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
      notifyListeners();
    } else if (currentUserState?.provider === 'firebase-google') {
      currentUserState = null;
      localStorage.removeItem(LOCAL_SESSION_KEY);
      notifyListeners();
    }
  });

  return () => {
    unsubscribeFirebase();
  };
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  listener(currentUserState);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentUser(): AppUser | null {
  return currentUserState;
}

/**
 * Sign in using Firebase Google Authentication
 */
export async function signInWithGoogle(): Promise<AppUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    const user: AppUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || 'trader@marketpulse.in',
      displayName: firebaseUser.displayName || 'NSE Pro Trader',
      photoURL: firebaseUser.photoURL || undefined,
      provider: 'firebase-google',
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
    };
    currentUserState = user;
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    notifyListeners();
    return user;
  } catch (error) {
    console.error('Google Auth Failed, error:', error);
    throw error;
  }
}

/**
 * Secure account registration with client-side SHA-256 password hashing
 * Never stores plaintext passwords.
 */
export async function registerSecureAccount(
  email: string,
  passwordClear: string,
  displayName: string
): Promise<AppUser> {
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!passwordClear || passwordClear.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(passwordClear, salt);

  const vaultRaw = localStorage.getItem(LOCAL_USERS_VAULT_KEY);
  const vault: Record<string, { uid: string; email: string; displayName: string; salt: string; passwordHash: string; createdAt: string }> =
    vaultRaw ? JSON.parse(vaultRaw) : {};

  const normalizedEmail = email.trim().toLowerCase();
  if (vault[normalizedEmail]) {
    throw new Error('An account with this email already exists. Please sign in.');
  }

  const uid = 'usr_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();

  vault[normalizedEmail] = {
    uid,
    email: normalizedEmail,
    displayName: displayName.trim() || normalizedEmail.split('@')[0],
    salt,
    passwordHash,
    createdAt: now
  };

  localStorage.setItem(LOCAL_USERS_VAULT_KEY, JSON.stringify(vault));

  const user: AppUser = {
    uid,
    email: normalizedEmail,
    displayName: displayName.trim() || normalizedEmail.split('@')[0],
    provider: 'secure-local',
    createdAt: now
  };

  currentUserState = user;
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  notifyListeners();
  return user;
}

/**
 * Secure account login with password hash comparison
 */
export async function loginSecureAccount(
  email: string,
  passwordClear: string
): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const vaultRaw = localStorage.getItem(LOCAL_USERS_VAULT_KEY);
  const vault: Record<string, { uid: string; email: string; displayName: string; salt: string; passwordHash: string; createdAt: string }> =
    vaultRaw ? JSON.parse(vaultRaw) : {};

  const record = vault[normalizedEmail];
  if (!record) {
    throw new Error('Invalid email or password. Please verify your credentials or register a new account.');
  }

  const candidateHash = await hashPassword(passwordClear, record.salt);
  if (candidateHash !== record.passwordHash) {
    throw new Error('Invalid email or password.');
  }

  const user: AppUser = {
    uid: record.uid,
    email: record.email,
    displayName: record.displayName,
    provider: 'secure-local',
    createdAt: record.createdAt
  };

  currentUserState = user;
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  notifyListeners();
  return user;
}

/**
 * Switch to a verified test trader profile (e.g., Trader Alice vs Trader Bob)
 * for testing user data isolation and authorization.
 */
export async function switchTestTrader(name: 'Alice' | 'Bob'): Promise<AppUser> {
  const email = name === 'Alice' ? 'alice.trader@marketpulse.in' : 'bob.swing@marketpulse.in';
  const uid = name === 'Alice' ? 'test_user_alice_8492' : 'test_user_bob_1947';
  const displayName = name === 'Alice' ? 'Alice Trader (Nifty Scalper)' : 'Bob Swing (BankNifty Momentum)';

  const user: AppUser = {
    uid,
    email,
    displayName,
    provider: 'secure-local',
    createdAt: new Date().toISOString()
  };

  currentUserState = user;
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  notifyListeners();
  return user;
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  if (currentUserState?.provider === 'firebase-google') {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout warning:', e);
    }
  }
  currentUserState = null;
  localStorage.removeItem(LOCAL_SESSION_KEY);
  notifyListeners();
}

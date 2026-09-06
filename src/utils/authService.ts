import { UserProfile } from '../types';
export type { UserProfile };

export interface WhatsappOtpChallenge {
  whatsappNumber: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  purpose: 'signin' | 'signup' | 'reset';
  associatedEmail?: string;
  associatedName?: string;
}

const STORAGE_KEY_USER = 'circuitforge_current_user';
const STORAGE_KEY_USERS = 'circuitforge_registered_users';
const STORAGE_KEY_CHALLENGE = 'circuitforge_active_otp_challenge';

// Default demo user if none exists
const DEFAULT_DEMO_USER: UserProfile = {
  id: 'usr_demo_101',
  name: 'Alex Rivera (Demo)',
  email: 'alex.rivera@circuitforge.io',
  whatsappNumber: '+1 555-019-2834',
  isWhatsappVerified: true,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  role: 'engineer',
  createdAt: new Date().toISOString(),
  savedCircuitsCount: 4,
  customComponentsCount: 7,
};

// Listeners for auth state changes
const authListeners = new Set<(user: UserProfile | null) => void>();

export function subscribeToAuthChanges(callback: (user: UserProfile | null) => void): () => void {
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
}

function notifyAuthListeners(user: UserProfile | null) {
  authListeners.forEach((cb) => cb(user));
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (e) {
    console.warn('Failed to save current user to localStorage', e);
  }
  notifyAuthListeners(user);
}

export function logoutUser() {
  setCurrentUser(null);
}

// Get all registered users from persistence
function getRegisteredUsers(): Array<UserProfile & { passwordHash?: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      const initial = [
        {
          ...DEFAULT_DEMO_USER,
          passwordHash: 'Password123!',
        },
      ];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users: Array<UserProfile & { passwordHash?: string }>) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to persist users list', e);
  }
}

// Format and normalize phone numbers
export function normalizeWhatsappNumber(num: string): string {
  const cleaned = num.trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  return cleaned;
}

// 1. Request OTP via WhatsApp (works for Sign In, Sign Up, or Password Reset)
export function requestWhatsappOtp(
  whatsappNumber: string,
  purpose: 'signin' | 'signup' | 'reset',
  associatedData?: { name?: string; email?: string }
): {
  success: boolean;
  message: string;
  code: string;
  challenge: WhatsappOtpChallenge;
  whatsappLink: string;
} {
  const normNumber = normalizeWhatsappNumber(whatsappNumber);
  if (normNumber.length < 8) {
    throw new Error('Please enter a valid WhatsApp phone number with country code (e.g. +1 555 123 4567).');
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const challenge: WhatsappOtpChallenge = {
    whatsappNumber: normNumber,
    code,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes validity
    purpose,
    associatedEmail: associatedData?.email,
    associatedName: associatedData?.name,
  };

  try {
    localStorage.setItem(STORAGE_KEY_CHALLENGE, JSON.stringify(challenge));
  } catch (e) {
    console.warn('Failed to save OTP challenge', e);
  }

  // Direct WhatsApp deep link so the user or test runner can verify via WhatsApp immediately
  const msgText = `CircuitForge EDA Verification Code: *${code}*\n\nDo not share this OTP with anyone. Valid for 10 minutes.`;
  const cleanDigits = normNumber.replace(/[^\d]/g, '');
  const whatsappLink = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(msgText)}`;

  return {
    success: true,
    message: `A 6-digit verification code has been created for WhatsApp (${normNumber}).`,
    code,
    challenge,
    whatsappLink,
  };
}

export function getActiveOtpChallenge(): WhatsappOtpChallenge | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHALLENGE);
    if (!raw) return null;
    const challenge: WhatsappOtpChallenge = JSON.parse(raw);
    if (Date.now() > challenge.expiresAt) {
      localStorage.removeItem(STORAGE_KEY_CHALLENGE);
      return null;
    }
    return challenge;
  } catch {
    return null;
  }
}

// 2. Verify WhatsApp OTP
export function verifyWhatsappOtp(
  whatsappNumber: string,
  enteredCode: string
): { success: boolean; user: UserProfile; message: string } {
  const challenge = getActiveOtpChallenge();
  const normInput = normalizeWhatsappNumber(whatsappNumber);

  if (!challenge) {
    throw new Error('No active verification code found or code has expired. Please request a new code.');
  }

  if (Date.now() > challenge.expiresAt) {
    throw new Error('This verification code has expired. Please request a new OTP.');
  }

  if (challenge.code !== enteredCode.trim()) {
    throw new Error('Incorrect WhatsApp verification code. Please check the 6-digit code and try again.');
  }

  const users = getRegisteredUsers();
  let existingUser = users.find(
    (u) =>
      u.whatsappNumber &&
      normalizeWhatsappNumber(u.whatsappNumber) === normInput
  );

  if (!existingUser && challenge.associatedEmail) {
    existingUser = users.find(
      (u) => u.email.toLowerCase() === challenge.associatedEmail?.toLowerCase()
    );
  }

  let finalUser: UserProfile;

  if (existingUser) {
    // Update verification status if needed
    existingUser.isWhatsappVerified = true;
    if (!existingUser.whatsappNumber) {
      existingUser.whatsappNumber = normInput;
    }
    saveRegisteredUsers(users);
    finalUser = existingUser;
  } else {
    // Auto-create user profile from WhatsApp verification
    const newId = `usr_${Date.now().toString(36)}`;
    const name = challenge.associatedName || `Engineer (${normInput.slice(-4)})`;
    const email = challenge.associatedEmail || `user_${cleanPhone(normInput)}@circuitforge.user`;

    finalUser = {
      id: newId,
      name,
      email,
      whatsappNumber: normInput,
      isWhatsappVerified: true,
      role: 'engineer',
      createdAt: new Date().toISOString(),
      savedCircuitsCount: 1,
      customComponentsCount: 0,
    };

    users.push({ ...finalUser, passwordHash: 'whatsapp_verified' });
    saveRegisteredUsers(users);
  }

  // Clear used challenge
  localStorage.removeItem(STORAGE_KEY_CHALLENGE);
  setCurrentUser(finalUser);

  return {
    success: true,
    user: finalUser,
    message: 'WhatsApp OTP verified successfully! Welcome to CircuitForge EDA.',
  };
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

// 3. Traditional Email + Password Sign In
export function loginWithPassword(email: string, password: string): UserProfile {
  const users = getRegisteredUsers();
  const cleanEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    throw new Error('No account found with this email address. Please check or Sign Up.');
  }

  if (user.passwordHash && user.passwordHash !== password) {
    throw new Error('Incorrect password. Please try again or use WhatsApp OTP reset.');
  }

  const { passwordHash, ...profile } = user;
  setCurrentUser(profile);
  return profile;
}

// 4. Sign Up with Email, Password & WhatsApp Number
export function registerUser(data: {
  name: string;
  email: string;
  password: string;
  whatsappNumber: string;
}): UserProfile {
  const users = getRegisteredUsers();
  const cleanEmail = data.email.trim().toLowerCase();
  const normPhone = normalizeWhatsappNumber(data.whatsappNumber);

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email already exists. Please sign in.');
  }

  const newProfile: UserProfile = {
    id: `usr_${Date.now().toString(36)}`,
    name: data.name.trim(),
    email: cleanEmail,
    whatsappNumber: normPhone,
    isWhatsappVerified: false,
    role: 'engineer',
    createdAt: new Date().toISOString(),
    savedCircuitsCount: 0,
    customComponentsCount: 0,
  };

  users.push({
    ...newProfile,
    passwordHash: data.password,
  });

  saveRegisteredUsers(users);
  setCurrentUser(newProfile);
  return newProfile;
}

// 5. Password Reset using WhatsApp OTP
export function resetPasswordWithWhatsappOtp(
  whatsappNumber: string,
  enteredCode: string,
  newPassword: string
): { success: boolean; message: string } {
  const challenge = getActiveOtpChallenge();
  const normInput = normalizeWhatsappNumber(whatsappNumber);

  if (!challenge || challenge.purpose !== 'reset') {
    throw new Error('No active password reset OTP challenge found. Please request a new code.');
  }

  if (challenge.code !== enteredCode.trim()) {
    throw new Error('Incorrect verification code. Please check your WhatsApp message.');
  }

  const users = getRegisteredUsers();
  const user = users.find(
    (u) =>
      (u.whatsappNumber && normalizeWhatsappNumber(u.whatsappNumber) === normInput) ||
      (challenge.associatedEmail && u.email.toLowerCase() === challenge.associatedEmail.toLowerCase())
  );

  if (!user) {
    throw new Error('No account linked to this WhatsApp number was found.');
  }

  user.passwordHash = newPassword;
  user.isWhatsappVerified = true;
  saveRegisteredUsers(users);
  localStorage.removeItem(STORAGE_KEY_CHALLENGE);

  return {
    success: true,
    message: 'Your password has been successfully reset! You can now sign in.',
  };
}

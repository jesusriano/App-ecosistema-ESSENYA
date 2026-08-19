import { PasswordRequirements, PasswordStrengthResult } from '../types/auth';

export const validateEmail = (email: string): boolean => {
  const trimmed = email.trim();
  if (!trimmed) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
};

export const validatePasswordStrength = (password: string): PasswordStrengthResult => {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password),
  };

  let score = 0;
  if (requirements.minLength) score += 1;
  if (requirements.hasUppercase && requirements.hasLowercase) score += 1;
  if (requirements.hasNumber) score += 1;
  if (requirements.hasSpecialChar) score += 1;

  let label: PasswordStrengthResult['label'] = 'Muy Débil';
  let color = 'bg-red-500';

  if (score === 1) {
    label = 'Débil';
    color = 'bg-orange-500';
  } else if (score === 2) {
    label = 'Media';
    color = 'bg-amber-500';
  } else if (score === 3) {
    label = 'Fuerte';
    color = 'bg-emerald-500';
  } else if (score === 4) {
    label = 'Excelente';
    color = 'bg-emerald-600';
  }

  const isValid = requirements.minLength && 
                  requirements.hasUppercase && 
                  requirements.hasLowercase && 
                  requirements.hasNumber && 
                  requirements.hasSpecialChar;

  return {
    score,
    label,
    color,
    requirements,
    isValid
  };
};

// Brute force lockout helper
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const getLockoutKey = (portal: string, email: string): string => {
  return `essenya_lockout_${portal}_${email.trim().toLowerCase()}`;
};

export const getLockoutInfo = (portal: string, email: string) => {
  if (!email) return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
  const key = getLockoutKey(portal, email);
  const raw = localStorage.getItem(key);
  if (!raw) return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };

  try {
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.lockoutUntil && now < data.lockoutUntil) {
      const remainingSeconds = Math.ceil((data.lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attemptsCount: data.attempts || MAX_ATTEMPTS };
    }
    // Lockout expired
    if (data.lockoutUntil && now >= data.lockoutUntil) {
      localStorage.removeItem(key);
      return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
    }
    return { isLocked: false, remainingSeconds: 0, attemptsCount: data.attempts || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
  }
};

export const registerFailedAttempt = (portal: string, email: string): { isLocked: boolean; remainingSeconds: number; attemptsCount: number } => {
  if (!email) return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
  const key = getLockoutKey(portal, email);
  const current = getLockoutInfo(portal, email);
  const newAttempts = current.attemptsCount + 1;

  if (newAttempts >= MAX_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(key, JSON.stringify({ attempts: newAttempts, lockoutUntil }));
    return { isLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000), attemptsCount: newAttempts };
  } else {
    localStorage.setItem(key, JSON.stringify({ attempts: newAttempts }));
    return { isLocked: false, remainingSeconds: 0, attemptsCount: newAttempts };
  }
};

export const clearFailedAttempts = (portal: string, email: string) => {
  if (!email) return;
  const key = getLockoutKey(portal, email);
  localStorage.removeItem(key);
};

// Friendly Spanish error messages
export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  
  const msg = typeof error === 'string' ? error : error.message || error.code || '';
  
  if (msg.includes('auth/invalid-email') || msg.includes('email-invalid')) {
    return 'El formato del correo electrónico ingresado no es válido.';
  }
  if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
    return 'El correo o la contraseña ingresada es incorrecta, o la cuenta no existe.';
  }
  if (msg.includes('auth/wrong-password')) {
    return 'La contraseña ingresada es incorrecta.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'La contraseña proporcionada es demasiado débil. Cumple con los requisitos de seguridad.';
  }
  if (msg.includes('auth/too-many-requests') || msg.includes('too-many-requests')) {
    return 'Demasiados intentos fallidos. Por seguridad, el acceso ha sido bloqueado temporalmente.';
  }
  if (msg.includes('auth/network-request-failed') || msg.includes('network-error') || !navigator.onLine) {
    return 'No hay conexión a Internet. Por favor verifica tu red e inténtalo nuevamente.';
  }
  if (msg.includes('auth/user-disabled')) {
    return 'Esta cuenta ha sido deshabilitada temporalmente por un administrador.';
  }
  if (msg.includes('auth/session-expired') || msg.includes('token-expired')) {
    return 'Tu sesión ha expirado por seguridad. Ingresa tus credenciales nuevamente.';
  }

  // Custom friendly fallback
  return 'No fue posible completar la solicitud. Por favor verifica tus datos e inténtalo nuevamente.';
};

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

export const isTransientNetworkError = (error: any): boolean => {
  if (!error) return false;
  const errorCode = (error.code || '').toLowerCase();
  const errorMsg = (error.message || '').toLowerCase();
  const combined = (errorCode + ' ' + errorMsg);

  return (
    combined.includes('unavailable') ||
    combined.includes('service-is-currently-unavailable') ||
    combined.includes('overloaded') ||
    combined.includes('network-request-failed') ||
    combined.includes('network-error') ||
    combined.includes('timeout') ||
    combined.includes('deadline-exceeded') ||
    combined.includes('client is offline') ||
    !navigator.onLine
  );
};

export const getLockoutKey = (portal: string, email: string): string => {
  const normalized = email.trim().toLowerCase();
  // Simple non-reversible hash to avoid plain-text PII in localStorage keys
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `essenya_lockout_${portal}_${Math.abs(hash)}`;
};

export const getLockoutInfo = (portal: string, email: string) => {
  if (!email) return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
  const normalized = email.trim().toLowerCase();
  // Bypass lockout for master administrator
  if (normalized === 'essenya222@gmail.com') {
    return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
  }

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
  const normalized = email.trim().toLowerCase();
  if (normalized === 'essenya222@gmail.com') {
    return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
  }

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
  
  const errorCode = error.code || '';
  const errorMsg = error.message || '';
  const combinedMsg = (errorCode + ' ' + errorMsg).toLowerCase();
  
  // Specific Firebase Auth Errors
  if (combinedMsg.includes('auth/invalid-email') || combinedMsg.includes('email-invalid')) {
    return 'El formato del correo electrónico ingresado no es válido. Asegúrate de incluir el "@" y un dominio válido.';
  }
  if (combinedMsg.includes('auth/user-not-found') || combinedMsg.includes('auth/invalid-credential')) {
    return 'El correo o la contraseña ingresada es incorrecta, o la cuenta no existe. Si acabas de registrarte, espera un momento.';
  }
  if (combinedMsg.includes('auth/wrong-password')) {
    return 'La contraseña ingresada es incorrecta. Por favor verifica que no tengas activado el bloqueo de mayúsculas.';
  }
  if (combinedMsg.includes('auth/email-already-in-use')) {
    return 'Ya existe una cuenta registrada con este correo electrónico. Intenta iniciar sesión en su lugar.';
  }
  if (
    combinedMsg.includes('auth/password-does-not-meet-requirements') ||
    combinedMsg.includes('missing password requirements') ||
    combinedMsg.includes('non-alphanumeric character') ||
    combinedMsg.includes('auth/weak-password')
  ) {
    return 'La contraseña no cumple con los requisitos de seguridad de Firebase. Debe contener al menos 8 caracteres, incluir letras mayúsculas, minúsculas, números y al menos un carácter especial (ej. !, @, #, $, %, etc.).';
  }
  if (combinedMsg.includes('auth/too-many-requests') || combinedMsg.includes('too-many-requests')) {
    return 'Demasiados intentos fallidos. Por seguridad, el acceso ha sido bloqueado temporalmente. Inténtalo en 15 minutos.';
  }
  if (combinedMsg.includes('auth/network-request-failed') || combinedMsg.includes('network-error') || !navigator.onLine) {
    return 'No hay conexión a Internet o el servidor de autenticación no responde. Por favor verifica tu red.';
  }
  if (combinedMsg.includes('auth/user-disabled')) {
    return 'Esta cuenta ha sido deshabilitada por un administrador. Si crees que es un error, contáctanos.';
  }
  if (combinedMsg.includes('auth/configuration-not-found')) {
    return 'Firebase Authentication no está inicializado o configurado en este proyecto (essenya-ecosistema). Ve a la Consola de Firebase > Authentication > pestaña "Sign-in method" y habilita el proveedor "Correo electrónico/contraseña".';
  }
  if (combinedMsg.includes('auth/operation-not-allowed')) {
    return 'El método de autenticación por correo/contraseña no está habilitado en la consola de Firebase. Debes activarlo en Authentication > Sign-in method > Correo electrónico/contraseña.';
  }
  if (combinedMsg.includes('has been suspended') || (combinedMsg.includes('consumer') && combinedMsg.includes('suspended'))) {
    return 'El proyecto de Google Cloud / Firebase o su API Key ha sido suspendido. Revisa la Consola de Google Cloud para reactivarlo.';
  }
  if (combinedMsg.includes('auth/popup-blocked')) {
    return 'El navegador bloqueó la ventana emergente de autenticación. Por favor permite las ventanas emergentes para este sitio.';
  }
  if (combinedMsg.includes('permission-denied') || combinedMsg.includes('insufficient permissions')) {
    return 'Error de base de datos: No tienes permisos para realizar esta acción. Verifica las Reglas de Firestore.';
  }
  if (
    combinedMsg.includes('unavailable') || 
    combinedMsg.includes('service-is-currently-unavailable') ||
    combinedMsg.includes('overloaded') ||
    errorCode === 'unavailable'
  ) {
    return 'El servicio de Firebase se encuentra temporalmente ocupado o reconectando. No es un error en tus datos. Por favor espera unos segundos e inténtalo nuevamente.';
  }

  // System error detail for debugging
  const systemDetail = errorCode ? ` (Error: ${errorCode})` : (errorMsg ? ` (${errorMsg})` : '');
  
  // Custom friendly fallback
  const fallback = 'No fue posible completar la solicitud. Por favor verifica tus datos e inténtalo nuevamente.';
  return systemDetail ? `${fallback}${systemDetail}` : fallback;
};

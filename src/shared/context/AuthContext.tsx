import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { UserAuthProfile, UserRole, AccountStatus, PortalClaimVerificationResult } from '../types/auth';
import { 
  getFriendlyErrorMessage, 
  getLockoutInfo, 
  registerFailedAttempt, 
  clearFailedAttempts,
  validateEmail,
  validatePasswordStrength,
  isTransientNetworkError
} from '../utils/authValidations';
import { handleFirestoreError, OperationType } from '../utils/firestoreDebug';
import { checkIsAdminInFirestore, AdminVerificationResult } from '../services/adminAuthService';

interface AuthSessions {
  cliente: UserAuthProfile | null;
  terapeuta: UserAuthProfile | null;
  administrador: UserAuthProfile | null;
}

interface AuthContextType {
  sessions: AuthSessions;
  loading: boolean;
  isAuthReady: boolean;
  claims: Record<string, any> | null;
  customClaims: Record<string, any> | null;
  idToken: string | null;
  
  // Strict Auth Actions per Portal
  login: (role: UserRole, email: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (role: UserRole, data: { nombre: string; apellidos: string; correo: string; telefono: string; contrasena: string }) => Promise<{ success: boolean; error?: string; uid?: string }>;
  logout: (role: UserRole) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  changePassword: (role: UserRole, oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  completeFirstLoginPasswordChange: (role: UserRole, newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (role: UserRole, updates: Partial<UserAuthProfile>) => Promise<{ success: boolean; error?: string }>;
  
  // Helper checks & Permission validation
  isAuthenticated: (role: UserRole) => boolean;
  getUser: (role: UserRole) => UserAuthProfile | null;
  verifyAdminInFirestore: (uid?: string, email?: string) => Promise<AdminVerificationResult>;
  verifyPortalClaim: (portal: UserRole | string, options?: { forceRefresh?: boolean }) => Promise<PortalClaimVerificationResult>;
  hasPortalClaim: (portal: UserRole | string) => boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  refreshClaims: () => Promise<Record<string, any> | null>;
  hasPermission: (permission: string) => boolean;
  firebaseUser: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Obtains the current ID token and custom claims from Firebase Auth.
 * If forceRefresh is true, forces a token refresh to fetch the latest claims.
 */
async function fetchTokenAndClaims(firebaseUser: any, forceRefresh = false): Promise<{
  token: string;
  claims: Record<string, any>;
  expiresAt: number;
} | null> {
  if (!firebaseUser || typeof firebaseUser.getIdTokenResult !== 'function') return null;
  try {
    const result = await firebaseUser.getIdTokenResult(forceRefresh);
    return {
      token: result.token,
      claims: result.claims || {},
      expiresAt: new Date(result.expirationTime).getTime(),
    };
  } catch (err) {
    console.warn('Could not fetch token/claims from Firebase Auth:', err);
    return null;
  }
}

/**
 * Synchronizes custom claims with the server via /api/auth/sync-claims
 */
async function requestServerClaimsSync(idToken: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch('/api/auth/sync-claims', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.claims) {
        return data.claims;
      }
    }
  } catch (err) {
    console.warn('Sync claims server call note (proceeding with local claims):', err);
  }
  return null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<AuthSessions>({
    cliente: null,
    terapeuta: null,
    administrador: null,
  });

  const [loading, setLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentFirebaseUser, setCurrentFirebaseUser] = useState<any>(auth.currentUser);
  const [currentClaims, setCurrentClaims] = useState<Record<string, any> | null>(null);
  const [currentIdToken, setCurrentIdToken] = useState<string | null>(null);

  // Guarantee browserLocalPersistence to keep client/user session active across mobile navigation and page reloads
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('Error setting browserLocalPersistence on Firebase Auth:', error);
    });
  }, []);

  // Synchronize Firestore user records, Token, Custom Claims and Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentFirebaseUser(firebaseUser);
      if (firebaseUser) {
        try {
          // 1. Fetch ID Token and Custom Claims from Firebase Auth
          const tokenInfo = await fetchTokenAndClaims(firebaseUser, false);
          let tokenClaims = tokenInfo?.claims || {};
          let idToken = tokenInfo?.token || null;
          let expiresAt = tokenInfo?.expiresAt || 0;

          // 2. Synchronize claims with backend and force refresh client token
          if (idToken) {
            const syncedClaims = await requestServerClaimsSync(idToken);
            if (syncedClaims) {
              tokenClaims = syncedClaims;
              // Re-fetch token to ensure freshly minted custom claims are in client JWT
              const reloaded = await fetchTokenAndClaims(firebaseUser, true);
              if (reloaded) {
                tokenClaims = reloaded.claims;
                idToken = reloaded.token;
                expiresAt = reloaded.expiresAt;
              }
            }
          }

          setCurrentClaims(tokenClaims);
          setCurrentIdToken(idToken);

          // 3. Verify if user is an Admin in token claims or Firestore 'administradores' collection
          const hasAdminClaim = Boolean(tokenClaims.admin || tokenClaims.role === 'administrador' || tokenClaims.rol === 'administrador');
          const adminCheck = await checkIsAdminInFirestore({ 
            uid: firebaseUser.uid, 
            email: firebaseUser.email 
          });

          if (hasAdminClaim || adminCheck.isAdmin) {
            const adminDoc = adminCheck.adminData;
            const adminProfile: UserAuthProfile = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              nombre: adminDoc?.nombre || 'Administrador',
              apellidos: adminDoc?.apellidos || 'ESSENYA',
              correo: adminDoc?.correo || firebaseUser.email || '',
              telefono: adminDoc?.telefono || '',
              estado: 'activo',
              fechaRegistro: adminDoc?.fechaRegistro || new Date().toISOString(),
              ultimoAcceso: new Date().toISOString(),
              correoVerificado: firebaseUser.emailVerified,
              rol: 'administrador',
              fechaActualizacion: new Date().toISOString(),
              customClaims: tokenClaims,
              idToken: idToken || undefined,
              tokenExpiresAt: expiresAt,
              permissions: ['admin:all', 'admin:access', 'therapist:access', 'client:access']
            };

            setSessions(prev => ({ ...prev, administrador: adminProfile }));
          }

          // 4. Fetch master profile from 'users' collection
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          
          let profile: UserAuthProfile | null = null;
          
          if (docSnap.exists()) {
            profile = docSnap.data() as UserAuthProfile;
          } else {
             // Fallback for AuthStateChange
             const therapistDoc = await getDoc(doc(db, 'terapeutas', firebaseUser.uid));
             if (therapistDoc.exists()) {
               const tData = therapistDoc.data();
               profile = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  nombre: tData.nombre || '',
                  apellidos: tData.apellidos || '',
                  correo: tData.email || '',
                  telefono: tData.telefono || '',
                  rol: 'terapeuta',
                  estado: tData.estado || 'activo',
                  fechaRegistro: tData.fechaAlta || new Date().toISOString(),
                  ultimoAcceso: new Date().toISOString(),
                  correoVerificado: firebaseUser.emailVerified || false,
                  fechaActualizacion: new Date().toISOString()
               };
             } else {
               const clientDoc = await getDoc(doc(db, 'clientes', firebaseUser.uid));
               if (clientDoc.exists()) {
                 const cData = clientDoc.data();
                 profile = {
                    id: firebaseUser.uid,
                    uid: firebaseUser.uid,
                    nombre: cData.nombre || '',
                    apellidos: cData.apellidos || '',
                    correo: cData.email || '',
                    telefono: cData.telefono || '',
                    rol: 'cliente',
                    estado: cData.estado || 'activo',
                    fechaRegistro: cData.createdAt || new Date().toISOString(),
                    ultimoAcceso: new Date().toISOString(),
                    correoVerificado: firebaseUser.emailVerified || false,
                    fechaActualizacion: new Date().toISOString()
                 };
               }
             }
          }
          
          if (profile) {
            profile.customClaims = tokenClaims;
            profile.idToken = idToken || undefined;
            profile.tokenExpiresAt = expiresAt;
            profile.permissions = profile.rol === 'administrador'
              ? ['admin:all', 'admin:access', 'therapist:access', 'client:access']
              : profile.rol === 'terapeuta'
              ? ['therapist:access', 'therapist:services', 'client:access']
              : ['client:access', 'client:bookings'];

            const role = profile.rol;
            setSessions(prev => ({ ...prev, [role]: profile }));
          }

          // 5. Realtime listener on current user document to reflect immediate Admin approvals/rejections
          const unsubLiveUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (liveSnap) => {
            if (liveSnap.exists()) {
              const liveData = liveSnap.data() as UserAuthProfile;
              const r = liveData.rol;
              if (r) {
                setSessions(prev => {
                  const current = prev[r];
                  if (current && (current.estado !== liveData.estado || current.membershipTier !== liveData.membershipTier)) {
                    const merged = { ...current, ...liveData, customClaims: tokenClaims, idToken: idToken || undefined };
                    return { ...prev, [r]: merged };
                  }
                  return prev;
                });
              }
            }
          });

          // Also listen to terapeutas doc if role is terapeuta
          const unsubLiveTherapist = onSnapshot(doc(db, 'terapeutas', firebaseUser.uid), (tSnap) => {
            if (tSnap.exists()) {
              const tData = tSnap.data();
              if (tData.estado) {
                setSessions(prev => {
                  const current = prev.terapeuta;
                  if (current && current.estado !== tData.estado) {
                    const updated = { ...current, estado: tData.estado, motivoRechazoAccount: tData.motivoRechazoAccount };
                    return { ...prev, terapeuta: updated };
                  }
                  return prev;
                });
              }
            }
          });

          return () => {
            unsubLiveUser();
            unsubLiveTherapist();
          };
        } catch (err) {
          console.warn('Firestore user synchronization note:', err);
        } finally {
          setIsAuthReady(true);
          setLoading(false);
        }
      } else {
        // Clear all sessions and claims on logout from Firebase Auth
        setCurrentClaims(null);
        setCurrentIdToken(null);
        setSessions({
          cliente: null,
          terapeuta: null,
          administrador: null,
        });
        setIsAuthReady(true);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update session state helper
  const updateSession = useCallback((role: UserRole, profile: UserAuthProfile | null) => {
    setSessions(prev => ({ ...prev, [role]: profile }));
  }, []);

  // Register Handler
  const register = async (
    role: UserRole, 
    data: { nombre: string; apellidos: string; correo: string; telefono: string; contrasena: string }
  ): Promise<{ success: boolean; error?: string; uid?: string }> => {
    const { nombre, apellidos, correo, telefono, contrasena } = data;

    // Strict Validations
    if (!nombre.trim() || !apellidos.trim() || !correo.trim() || !contrasena) {
      return { success: false, error: 'Todos los campos obligatorios deben ser completados.' };
    }

    if (!validateEmail(correo)) {
      return { success: false, error: 'El correo electrónico ingresado no tiene un formato válido.' };
    }

    // 1. Initial Validation
    const trimmedEmail = correo.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      return { success: false, error: 'El formato del correo electrónico no es válido.' };
    }

    const strength = validatePasswordStrength(contrasena);
    if (!strength.isValid) {
      return { success: false, error: 'La contraseña debe incluir al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.' };
    }

    if (!nombre.trim() || !apellidos.trim()) {
      return { success: false, error: 'Por favor, ingresa tu nombre y apellidos completos.' };
    }

    setLoading(true);

    try {
      // Guarantee session persistence in browser / mobile storage before registration
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistErr) {
        console.warn('Could not set persistence before register:', persistErr);
      }

      // 2. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, contrasena);
      const uid = userCredential.user.uid;

      // 2. Build User Profile for Firestore
      const initialStatus: AccountStatus = role === 'terapeuta' ? 'pendiente' : 'activo';

      const newProfile: UserAuthProfile = {
        id: uid,
        uid: uid,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
        estado: initialStatus,
        fechaRegistro: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
        correoVerificado: userCredential.user.emailVerified,
        rol: role,
        fechaActualizacion: new Date().toISOString()
      };

      // 3. Save to Firestore
      try {
        await setDoc(doc(db, 'users', uid), newProfile);
        
        if (role === 'cliente') {
          const clientData = {
            id: uid,
            userId: uid,
            name: `${nombre.trim()} ${apellidos.trim()}`,
            email: correo.trim().toLowerCase(),
            phone: telefono.trim(),
            membershipTier: 'Platino',
            address: '',
            cityZone: 'Polanco / Reforma',
            spentTotal: 0,
            totalBookings: 0,
            isBlocked: false,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'clientes', uid), clientData);
        } else if (role === 'terapeuta') {
          const therapistData = {
            id: uid,
            userId: uid,
            nombre: nombre.trim(),
            apellidos: apellidos.trim(),
            correo: correo.trim().toLowerCase(),
            telefono: telefono.trim(),
            estado: 'pendiente',
            especialidades: ['Masaje Holístico'],
            zonasCobertura: ['Polanco', 'Lomas de Chapultepec'],
            puntuacion: 5.0,
            resenasCount: 0,
            serviciosCompletados: 0,
            fechaAlta: new Date().toISOString()
          };
          await setDoc(doc(db, 'terapeutas', uid), therapistData);
        }
      } catch (dbErr: any) {
        const errorInfo = handleFirestoreError(
          dbErr, 
          OperationType.CREATE, 
          role === 'cliente' ? `clientes/${uid}` : (role === 'terapeuta' ? `terapeutas/${uid}` : `users/${uid}`),
          newProfile
        );
        return { 
          success: false, 
          error: `Error de base de datos (${errorInfo.diagnosis || dbErr.message}). Revisa la consola del navegador para ver el campo y la consulta detallada.` 
        };
      }

      // 4. Update session
      updateSession(role, newProfile);
      clearFailedAttempts(role, correo);

      setLoading(false);
      return { success: true, uid };
    } catch (err: any) {
      setLoading(false);
      console.error('Registration failed:', err);
      if (err.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Ya existe una cuenta registrada con este correo electrónico.' };
      }
      if (err.code === 'auth/operation-not-allowed') {
        return { success: false, error: 'El método de registro por correo/contraseña no está habilitado en tu proyecto de Firebase. Ve a Authentication > Sign-in method y habilítalo.' };
      }
      return { success: false, error: getFriendlyErrorMessage(err) };
    }
  };

  // Login Handler
  const login = async (
    role: UserRole, 
    email: string, 
    pass: string, 
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !pass) {
      return { success: false, error: 'Por favor ingresa tu correo electrónico y contraseña.' };
    }

    if (!validateEmail(trimmedEmail)) {
      return { success: false, error: 'El correo electrónico ingresado no es válido.' };
    }

    // Check brute force lockout
    const lockout = getLockoutInfo(role, trimmedEmail);
    if (lockout.isLocked) {
      const minutes = Math.ceil(lockout.remainingSeconds / 60);
      return { 
        success: false, 
        error: `Acceso bloqueado por seguridad debido a múltiples intentos fallidos. Inténtalo en ${minutes} minuto(s).` 
      };
    }

    setLoading(true);

    // Helper to retry transient network / reconnect errors
    const retryAsync = async <T,>(fn: () => Promise<T>, maxRetries = 2, delayMs = 600): Promise<T> => {
      let lastError: any;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error: any) {
          lastError = error;
          if (!isTransientNetworkError(error) || attempt === maxRetries) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
      throw lastError;
    };

    try {
      // Guarantee session persistence in browser / mobile storage before sign in
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistErr) {
        console.warn('Could not set persistence before login:', persistErr);
      }

      // 1. Firebase Auth Sign in with automated retry on temporary connection drops
      const userCredential = await retryAsync(() => signInWithEmailAndPassword(auth, trimmedEmail, pass));
      const uid = userCredential.user.uid;

      // 2. Fetch and Validate ID Token & Custom Claims from Firebase Auth
      const tokenInfo = await fetchTokenAndClaims(userCredential.user, true);
      let tokenClaims = tokenInfo?.claims || {};
      let idToken = tokenInfo?.token || null;
      let expiresAt = tokenInfo?.expiresAt || (Date.now() + 3600 * 1000);

      // Synchronize claims with backend
      if (idToken) {
        const syncedClaims = await requestServerClaimsSync(idToken);
        if (syncedClaims) {
          tokenClaims = syncedClaims;
          // Re-fetch token to ensure freshly minted claims are loaded
          const reloaded = await fetchTokenAndClaims(userCredential.user, true);
          if (reloaded) {
            tokenClaims = reloaded.claims;
            idToken = reloaded.token;
            expiresAt = reloaded.expiresAt;
          }
        }
      }

      setCurrentClaims(tokenClaims);
      setCurrentIdToken(idToken);

      // 3. Specialized Check for Administrator Role
      if (role === 'administrador') {
        const hasAdminClaim = Boolean(tokenClaims.admin || tokenClaims.role === 'administrador' || tokenClaims.rol === 'administrador');
        const adminCheck = await retryAsync(() => checkIsAdminInFirestore({ uid, email: trimmedEmail }));

        // Strict validation: Prevents frontend from trusting admin role without token claims or Firestore confirmation
        if (!hasAdminClaim && !adminCheck.isAdmin) {
          await signOut(auth);
          setLoading(false);
          return {
            success: false,
            error: 'Acceso Denegado: Tu usuario no cuenta con el rol de Administrador ni con los permisos requeridos.'
          };
        }

        const adminDoc = adminCheck.adminData;
        const adminProfile: UserAuthProfile = {
          id: uid,
          uid: uid,
          nombre: adminDoc?.nombre || 'Administrador',
          apellidos: adminDoc?.apellidos || 'ESSENYA',
          correo: adminDoc?.correo || trimmedEmail,
          telefono: adminDoc?.telefono || '',
          estado: 'activo',
          fechaRegistro: adminDoc?.fechaRegistro || new Date().toISOString(),
          ultimoAcceso: new Date().toISOString(),
          correoVerificado: userCredential.user.emailVerified,
          rol: 'administrador',
          fechaActualizacion: new Date().toISOString(),
          customClaims: tokenClaims,
          idToken: idToken || undefined,
          tokenExpiresAt: expiresAt,
          permissions: ['admin:all', 'admin:access', 'therapist:access', 'client:access']
        };

        // Update last access in Firestore
        try {
          await updateDoc(doc(db, 'administradores', uid), {
            ultimoAcceso: new Date().toISOString()
          });
        } catch {}

        try {
          await updateDoc(doc(db, 'users', uid), {
            ultimoAcceso: new Date().toISOString()
          });
        } catch {}

        clearFailedAttempts(role, trimmedEmail);
        updateSession(role, adminProfile);
        setLoading(false);
        return { success: true };
      }

      // 4. Fetch Profile from Firestore and Verify Role for Clients & Therapists
      const userDocRef = doc(db, 'users', uid);
      let docSnap;
      try {
        docSnap = await retryAsync(() => getDoc(userDocRef), 2, 700);
      } catch (getErr: any) {
        handleFirestoreError(getErr, OperationType.GET, `users/${uid}`);
        throw getErr;
      }
      
      let userProfile: UserAuthProfile | null = null;
      
      if (docSnap.exists()) {
        userProfile = docSnap.data() as UserAuthProfile;
      } else {
        // Fallback: Check if they exist in role-specific collections (in case created manually)
        if (role === 'terapeuta') {
          const therapistDoc = await getDoc(doc(db, 'terapeutas', uid));
          if (therapistDoc.exists()) {
            const tData = therapistDoc.data();
            userProfile = {
              id: uid,
              uid,
              nombre: tData.nombre || '',
              apellidos: tData.apellidos || '',
              correo: tData.email || '',
              telefono: tData.telefono || '',
              rol: 'terapeuta',
              estado: tData.estado || 'activo',
              fechaRegistro: tData.fechaAlta || new Date().toISOString(),
              ultimoAcceso: new Date().toISOString(),
              correoVerificado: false,
              fechaActualizacion: new Date().toISOString()
            };
          }
        } else if (role === 'cliente') {
          const clientDoc = await getDoc(doc(db, 'clientes', uid));
          if (clientDoc.exists()) {
            const cData = clientDoc.data();
            userProfile = {
              id: uid,
              uid,
              nombre: cData.nombre || '',
              apellidos: cData.apellidos || '',
              correo: cData.email || '',
              telefono: cData.telefono || '',
              rol: 'cliente',
              estado: cData.estado || 'activo',
              fechaRegistro: cData.createdAt || new Date().toISOString(),
              ultimoAcceso: new Date().toISOString(),
              correoVerificado: false,
              fechaActualizacion: new Date().toISOString()
            };
          }
        }
      }

      if (!userProfile) {
        await signOut(auth);
        setLoading(false);
        return { success: false, error: 'Perfil de usuario no encontrado en la base de datos (Ni en users, ni en terapeutas/clientes).' };
      }

      // STRICT ROLE VALIDATION: Verify role against requested portal
      if (userProfile.rol !== role) {
        await signOut(auth);
        setLoading(false);
        const roleNames: Record<UserRole, string> = {
          cliente: 'Cliente',
          terapeuta: 'Terapeuta',
          administrador: 'Administrador'
        };
        return { 
          success: false, 
          error: `Esta cuenta está registrada como ${roleNames[userProfile.rol as UserRole] || userProfile.rol}. No tienes permiso para acceder al portal de ${roleNames[role]}.` 
        };
      }

      // Check account status
      if (userProfile.estado === 'bloqueado') {
        await signOut(auth);
        setLoading(false);
        return { success: false, error: 'Tu cuenta ha sido suspendida temporalmente. Contacta a soporte.' };
      }

      // Attach verified token and custom claims to profile
      userProfile.customClaims = tokenClaims;
      userProfile.idToken = idToken || undefined;
      userProfile.tokenExpiresAt = expiresAt;
      userProfile.permissions = role === 'terapeuta'
        ? ['therapist:access', 'therapist:services', 'client:access']
        : ['client:access', 'client:bookings'];

      // Update last access in Firestore
      try {
        await updateDoc(doc(db, 'users', uid), {
          ultimoAcceso: new Date().toISOString()
        });
      } catch (updateErr) {
        handleFirestoreError(updateErr, OperationType.UPDATE, `users/${uid}`, { ultimoAcceso: new Date().toISOString() });
      }

      clearFailedAttempts(role, trimmedEmail);
      updateSession(role, userProfile);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);

      // Only register failed attempts for actual credential failures, not transient connection drops
      if (!isTransientNetworkError(err)) {
        const failed = registerFailedAttempt(role, trimmedEmail);
        if (failed.isLocked) {
          return { 
            success: false, 
            error: `Múltiples intentos fallidos. Tu acceso ha sido bloqueado por 15 minutos por ciberseguridad.` 
          };
        }
      }

      const friendlyMsg = getFriendlyErrorMessage(err);
      return { success: false, error: friendlyMsg };
    }
  };


  // Logout Handler
  const logout = async (role: UserRole): Promise<void> => {
    try {
      await signOut(auth);
    } catch {}
    setCurrentClaims(null);
    setCurrentIdToken(null);
    updateSession(role, null);
    if (role === 'administrador') {
      setSessions({
        cliente: null,
        terapeuta: null,
        administrador: null
      });
    }
  };

  // Password Reset Handler
  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      return { success: false, error: 'Proporciona un correo electrónico válido.' };
    }

    try {
      const origin = window.location.origin;
      try {
        await sendPasswordResetEmail(auth, trimmed, {
          url: `${origin}/login`,
          handleCodeInApp: false
        });
      } catch (e) {
        console.warn('Could not send reset email with ActionCodeSettings, trying default reset:', e);
        await sendPasswordResetEmail(auth, trimmed);
      }
      return { 
        success: true, 
        message: `Hemos enviado las instrucciones para restablecer tu contraseña a ${trimmed}. Revisa tu bandeja de entrada o spam.` 
      };
    } catch (err) {
      // Return clear success response for security to avoid email enumeration
      return { 
        success: true, 
        message: `Si la cuenta ${trimmed} existe en ESSENYA, recibirás las instrucciones de recuperación en unos momentos.` 
      };
    }
  };

  // Change Password Handler
  const changePassword = async (role: UserRole, oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const strength = validatePasswordStrength(newPass);
    if (!strength.isValid) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y carácter especial.' };
    }

    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPass);
        return { success: true };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: 'La contraseña actual no es correcta.' };
    }
  };

  // Complete First Login Password Change Handler
  const completeFirstLoginPasswordChange = async (role: UserRole, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const strength = validatePasswordStrength(newPass);
    if (!strength.isValid) {
      return { success: false, error: 'La nueva contraseña debe cumplir con los requisitos de ciberseguridad (al menos 8 caracteres, mayúscula, minúscula, número y símbolo especial).' };
    }

    const current = sessions[role];
    if (!current) return { success: false, error: 'No hay una sesión activa.' };

    const updated: UserAuthProfile = {
      ...current,
      mustChangePassword: false,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
        await updateDoc(doc(db, 'users', current.id), {
          mustChangePassword: false,
          fechaActualizacion: new Date().toISOString()
        });
      }
    } catch {}

    updateSession(role, updated);
    return { success: true };
  };

  // Update User Profile Handler
  const updateUserProfile = async (role: UserRole, updates: Partial<UserAuthProfile>): Promise<{ success: boolean; error?: string }> => {
    const current = sessions[role];
    if (!current) return { success: false, error: 'No hay una sesión activa.' };

    const updated: UserAuthProfile = {
      ...current,
      ...updates,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', current.id), {
          ...updates,
          fechaActualizacion: new Date().toISOString()
        });
      }
    } catch {}

    updateSession(role, updated);
    return { success: true };
  };

  const isAuthenticated = (role: UserRole): boolean => {
    // If checking client portal, administrators are also authorized to view client experiences
    if (role === 'cliente' && (sessions.cliente || sessions.administrador)) {
      return true;
    }
    return Boolean(sessions[role]);
  };

  const getUser = (role: UserRole): UserAuthProfile | null => {
    if (role === 'cliente' && !sessions.cliente && sessions.administrador) {
      // Seamlessly map administrator session into client context
      const admin = sessions.administrador;
      return {
        ...admin,
        rol: 'cliente',
        membershipTier: 'Diamante VIP',
        permissions: ['client:access', 'client:bookings', 'admin:access']
      };
    }
    return sessions[role];
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (sessions.administrador || currentClaims?.admin || currentClaims?.role === 'administrador') {
      return true;
    }
    if (Array.isArray(currentClaims?.permissions) && currentClaims.permissions.includes(permission)) {
      return true;
    }
    if (permission.startsWith('client:') && (sessions.cliente || sessions.administrador)) return true;
    if (permission.startsWith('therapist:') && (sessions.terapeuta || sessions.administrador)) return true;
    if (permission.startsWith('admin:') && sessions.administrador) return true;
    return false;
  }, [sessions, currentClaims]);

  const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      const token = await auth.currentUser.getIdToken(forceRefresh);
      setCurrentIdToken(token);
      return token;
    } catch {
      return null;
    }
  }, []);

  const refreshClaims = useCallback(async (): Promise<Record<string, any> | null> => {
    if (!auth.currentUser) return null;
    const tokenInfo = await fetchTokenAndClaims(auth.currentUser, true);
    if (!tokenInfo) return null;
    let claims = tokenInfo.claims;
    if (tokenInfo.token) {
      const serverClaims = await requestServerClaimsSync(tokenInfo.token);
      if (serverClaims) {
        claims = serverClaims;
        const reloaded = await fetchTokenAndClaims(auth.currentUser, true);
        if (reloaded) {
          claims = reloaded.claims;
          tokenInfo.token = reloaded.token;
        }
      }
    }
    setCurrentClaims(claims);
    setCurrentIdToken(tokenInfo.token);
    return claims;
  }, []);

  const verifyAdminInFirestore = useCallback(async (uid?: string, email?: string): Promise<AdminVerificationResult> => {
    return checkIsAdminInFirestore({ uid, email });
  }, []);

  /**
   * Explicitly verifies on the client side whether the currently authenticated user
   * has the required custom claim for the target portal before rendering the UI.
   * Prevents Firestore runtime permission-denied errors when navigating.
   */
  const verifyPortalClaim = useCallback(async (
    portal: UserRole | string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<PortalClaimVerificationResult> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        authorized: false,
        claimFound: false,
        source: 'none',
        error: 'No se detectó un usuario autenticado en Firebase Auth para este portal.'
      };
    }

    const normPortal = portal === 'admin' ? 'administrador' : portal === 'therapist' ? 'terapeuta' : portal === 'client' ? 'cliente' : portal;

    // 1. Fetch current token and claims (forceRefresh if requested)
    let tokenInfo = await fetchTokenAndClaims(currentUser, options.forceRefresh || false);
    let tokenClaims = tokenInfo?.claims || currentClaims || {};

    const checkClaimsMatch = (claims: Record<string, any>): boolean => {
      if (normPortal === 'administrador') {
        const hasAdminFlag = Boolean(claims.admin === true);
        const hasAdminRole = claims.role === 'administrador' || claims.rol === 'administrador';
        const hasAdminPerm = Array.isArray(claims.permissions) && (claims.permissions.includes('admin:access') || claims.permissions.includes('admin:all'));
        const email = (currentUser.email || '').toLowerCase().trim();
        const isMaster = email === 'essenya222@gmail.com' || email === 'graphixglow.2024@gmail.com' || email.endsWith('@essenya.com');
        return hasAdminFlag || hasAdminRole || hasAdminPerm || isMaster;
      }

      if (normPortal === 'terapeuta') {
        const hasTherapistRole = claims.role === 'terapeuta' || claims.rol === 'terapeuta';
        const hasTherapistPerm = Array.isArray(claims.permissions) && claims.permissions.includes('therapist:access');
        const isAdminSuper = Boolean(claims.admin === true || claims.role === 'administrador' || claims.rol === 'administrador');
        return hasTherapistRole || hasTherapistPerm || isAdminSuper;
      }

      if (normPortal === 'cliente') {
        const hasClientRole = claims.role === 'cliente' || claims.rol === 'cliente';
        const hasClientPerm = Array.isArray(claims.permissions) && claims.permissions.includes('client:access');
        const isAdminSuper = Boolean(claims.admin === true || claims.role === 'administrador' || claims.rol === 'administrador');
        return hasClientRole || hasClientPerm || isAdminSuper;
      }

      return false;
    };

    // If claims match immediately in token
    if (checkClaimsMatch(tokenClaims)) {
      return {
        authorized: true,
        claimFound: true,
        role: normPortal,
        claims: tokenClaims,
        source: 'token_claims'
      };
    }

    // 2. Self-healing fallback: If claim is not in the token, request server claims sync and reload token
    if (tokenInfo?.token) {
      try {
        const synced = await requestServerClaimsSync(tokenInfo.token);
        if (synced) {
          // Force refresh token so the newly set claims are included in the client JWT
          const refreshed = await fetchTokenAndClaims(currentUser, true);
          if (refreshed) {
            tokenClaims = refreshed.claims;
            setCurrentClaims(tokenClaims);
            setCurrentIdToken(refreshed.token);

            if (checkClaimsMatch(tokenClaims)) {
              return {
                authorized: true,
                claimFound: true,
                role: normPortal,
                claims: tokenClaims,
                source: 'server_sync'
              };
            }
          }
        }
      } catch (syncErr) {
        console.warn('Auto-healing claims sync notice:', syncErr);
      }
    }

    // 3. Admin Firestore verification fallback for admin portal
    if (normPortal === 'administrador') {
      const adminCheck = await checkIsAdminInFirestore({
        uid: currentUser.uid,
        email: currentUser.email
      });
      if (adminCheck.isAdmin) {
        return {
          authorized: true,
          claimFound: true,
          role: 'administrador',
          claims: tokenClaims,
          source: 'firestore_admin'
        };
      }
    }

    const detectedRole = tokenClaims.role || tokenClaims.rol || (tokenClaims.admin ? 'administrador' : undefined);
    const roleNames: Record<string, string> = {
      cliente: 'Cliente VIP',
      terapeuta: 'Terapeuta Certificado',
      administrador: 'Administrador del Sistema'
    };

    return {
      authorized: false,
      claimFound: false,
      role: detectedRole,
      claims: tokenClaims,
      source: 'none',
      error: `Tu usuario actual (${currentUser.email}) tiene el rol '${roleNames[detectedRole as string] || detectedRole || 'Sin Rol'}' en sus claims de autenticación, pero este portal requiere privilegios exclusivos de '${roleNames[normPortal] || normPortal}'.`
    };
  }, [currentClaims]);

  /**
   * Fast synchronous check of claims already loaded in memory
   */
  const hasPortalClaim = useCallback((portal: UserRole | string): boolean => {
    if (!currentClaims && !auth.currentUser) return false;
    const norm = portal === 'admin' ? 'administrador' : portal === 'therapist' ? 'terapeuta' : portal === 'client' ? 'cliente' : portal;
    const claims = currentClaims || {};

    if (norm === 'administrador') {
      const email = (auth.currentUser?.email || '').toLowerCase().trim();
      const isMaster = email === 'essenya222@gmail.com' || email === 'graphixglow.2024@gmail.com';
      return Boolean(
        claims.admin || 
        claims.role === 'administrador' || 
        claims.rol === 'administrador' ||
        claims.permissions?.includes('admin:access') ||
        claims.permissions?.includes('admin:all') ||
        isMaster
      );
    }
    if (norm === 'terapeuta') {
      return Boolean(
        claims.role === 'terapeuta' || 
        claims.rol === 'terapeuta' ||
        claims.permissions?.includes('therapist:access') ||
        claims.admin ||
        claims.role === 'administrador'
      );
    }
    if (norm === 'cliente') {
      return Boolean(
        claims.role === 'cliente' || 
        claims.rol === 'cliente' ||
        claims.permissions?.includes('client:access') ||
        claims.admin ||
        claims.role === 'administrador'
      );
    }
    return false;
  }, [currentClaims]);

  return (
    <AuthContext.Provider
      value={{
        sessions,
        loading,
        isAuthReady,
        claims: currentClaims,
        customClaims: currentClaims,
        idToken: currentIdToken,
        login,
        register,
        logout,
        sendPasswordReset,
        changePassword,
        completeFirstLoginPasswordChange,
        updateUserProfile,
        isAuthenticated,
        getUser,
        verifyAdminInFirestore,
        verifyPortalClaim,
        hasPortalClaim,
        getIdToken,
        refreshClaims,
        hasPermission,
        firebaseUser: currentFirebaseUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { UserAuthProfile, UserRole, AccountStatus } from '../types/auth';
import { 
  getFriendlyErrorMessage, 
  getLockoutInfo, 
  registerFailedAttempt, 
  clearFailedAttempts,
  validateEmail,
  validatePasswordStrength
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
  
  // Strict Auth Actions per Portal
  login: (role: UserRole, email: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (role: UserRole, data: { nombre: string; apellidos: string; correo: string; telefono: string; contrasena: string }) => Promise<{ success: boolean; error?: string }>;
  logout: (role: UserRole) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  changePassword: (role: UserRole, oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  completeFirstLoginPasswordChange: (role: UserRole, newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (role: UserRole, updates: Partial<UserAuthProfile>) => Promise<{ success: boolean; error?: string }>;
  
  // Helper checks
  isAuthenticated: (role: UserRole) => boolean;
  getUser: (role: UserRole) => UserAuthProfile | null;
  verifyAdminInFirestore: (uid?: string, email?: string) => Promise<AdminVerificationResult>;
  firebaseUser: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<AuthSessions>(() => {
    // Restore active sessions from localStorage for each independent portal if available
    try {
      const storedClient = localStorage.getItem('essenya_auth_cliente');
      const storedTherapist = localStorage.getItem('essenya_auth_terapeuta');
      const storedAdmin = localStorage.getItem('essenya_auth_administrador');

      return {
        cliente: storedClient ? JSON.parse(storedClient) : null,
        terapeuta: storedTherapist ? JSON.parse(storedTherapist) : null,
        administrador: storedAdmin ? JSON.parse(storedAdmin) : null,
      };
    } catch {
      return {
        cliente: null,
        terapeuta: null,
        administrador: null,
      };
    }
  });

  const [loading, setLoading] = useState(false);
  const [currentFirebaseUser, setCurrentFirebaseUser] = useState<any>(auth.currentUser);

  // Synchronize Firestore user records and Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentFirebaseUser(firebaseUser);
      if (firebaseUser) {
        try {
          // 1. Verify if user is an Admin in the 'administradores' collection in Firestore
          const adminCheck = await checkIsAdminInFirestore({ 
            uid: firebaseUser.uid, 
            email: firebaseUser.email 
          });

          if (adminCheck.isAdmin && adminCheck.adminData) {
            const adminDoc = adminCheck.adminData;
            const adminProfile: UserAuthProfile = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              nombre: adminDoc.nombre || 'Administrador',
              apellidos: adminDoc.apellidos || 'ESSENYA',
              correo: adminDoc.correo || firebaseUser.email || '',
              telefono: adminDoc.telefono || '',
              estado: 'activo',
              fechaRegistro: adminDoc.fechaRegistro || new Date().toISOString(),
              ultimoAcceso: new Date().toISOString(),
              correoVerificado: firebaseUser.emailVerified,
              rol: 'administrador',
              fechaActualizacion: new Date().toISOString()
            };

            setSessions(prev => {
              const updated = { ...prev, administrador: adminProfile };
              localStorage.setItem('essenya_auth_administrador', JSON.stringify(adminProfile));
              return updated;
            });
          }

          // 2. Fetch master profile from 'users' collection
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
                  uid: firebaseUser.uid,
                  nombre: tData.nombre || '',
                  apellidos: tData.apellidos || '',
                  correo: tData.email || '',
                  telefono: tData.telefono || '',
                  rol: 'terapeuta',
                  estado: tData.estado || 'activo',
                  fechaRegistro: tData.fechaAlta || new Date().toISOString()
               };
             } else {
               const clientDoc = await getDoc(doc(db, 'clientes', firebaseUser.uid));
               if (clientDoc.exists()) {
                 const cData = clientDoc.data();
                 profile = {
                    uid: firebaseUser.uid,
                    nombre: cData.nombre || '',
                    apellidos: cData.apellidos || '',
                    correo: cData.email || '',
                    telefono: cData.telefono || '',
                    rol: 'cliente',
                    estado: cData.estado || 'activo',
                    fechaRegistro: cData.createdAt || new Date().toISOString()
                 };
               }
             }
          }
          
          if (profile) {
            const role = profile.rol;
            
            setSessions(prev => {
              const updated = { ...prev, [role]: profile };
              localStorage.setItem(`essenya_auth_${role}`, JSON.stringify(profile));
              return updated;
            });
          }
        } catch (err) {
          console.warn('Firestore user synchronization note:', err);
        }
      } else {
        // Clear all sessions on logout from Firebase Auth
        setSessions({
          cliente: null,
          terapeuta: null,
          administrador: null,
        });
        localStorage.removeItem('essenya_auth_cliente');
        localStorage.removeItem('essenya_auth_terapeuta');
        localStorage.removeItem('essenya_auth_administrador');
      }
    });

    return () => unsubscribe();
  }, []);

  // Save session state to localStorage helper
  const updateSession = useCallback((role: UserRole, profile: UserAuthProfile | null) => {
    setSessions(prev => {
      const updated = { ...prev, [role]: profile };
      if (profile) {
        localStorage.setItem(`essenya_auth_${role}`, JSON.stringify(profile));
      } else {
        localStorage.removeItem(`essenya_auth_${role}`);
      }
      return updated;
    });
  }, []);

  // Register Handler
  const register = async (
    role: UserRole, 
    data: { nombre: string; apellidos: string; correo: string; telefono: string; contrasena: string }
  ): Promise<{ success: boolean; error?: string }> => {
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
      return { success: true };
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

    try {
      // 1. Firebase Auth Sign in
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      const uid = userCredential.user.uid;

      // 2. Specialized Check for Administrator Role in Firestore 'administradores' Collection
      if (role === 'administrador') {
        const adminCheck = await checkIsAdminInFirestore({ uid, email: trimmedEmail });

        if (!adminCheck.isAdmin) {
          await signOut(auth);
          setLoading(false);
          return {
            success: false,
            error: 'Acceso Denegado: Tu usuario no cuenta con el rol de Administrador asignado en la colección "administradores" de Firestore.'
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
          fechaActualizacion: new Date().toISOString()
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

      // 3. Fetch Profile from Firestore and Verify Role for Clients & Therapists
      const userDocRef = doc(db, 'users', uid);
      let docSnap;
      try {
        docSnap = await getDoc(userDocRef);
      } catch (getErr) {
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
              uid,
              nombre: tData.nombre || '',
              apellidos: tData.apellidos || '',
              correo: tData.email || '',
              telefono: tData.telefono || '',
              rol: 'terapeuta',
              estado: tData.estado || 'activo',
              fechaRegistro: tData.fechaAlta || new Date().toISOString()
            };
          }
        } else if (role === 'cliente') {
          const clientDoc = await getDoc(doc(db, 'clientes', uid));
          if (clientDoc.exists()) {
            const cData = clientDoc.data();
            userProfile = {
              uid,
              nombre: cData.nombre || '',
              apellidos: cData.apellidos || '',
              correo: cData.email || '',
              telefono: cData.telefono || '',
              rol: 'cliente',
              estado: cData.estado || 'activo',
              fechaRegistro: cData.createdAt || new Date().toISOString()
            };
          }
        }
      }

      if (!userProfile) {
        await signOut(auth);
        setLoading(false);
        return { success: false, error: 'Perfil de usuario no encontrado en la base de datos (Ni en users, ni en terapeutas/clientes).' };
      }

      // STRICT ROLE VALIDATION
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

      // Register failed attempt for lockout
      const failed = registerFailedAttempt(role, trimmedEmail);
      if (failed.isLocked) {
        return { 
          success: false, 
          error: `Múltiples intentos fallidos. Tu acceso ha sido bloqueado por 15 minutos por ciberseguridad.` 
        };
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
    updateSession(role, null);
  };

  // Password Reset Handler
  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      return { success: false, error: 'Proporciona un correo electrónico válido.' };
    }

    try {
      await sendPasswordResetEmail(auth, trimmed);
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
    return Boolean(sessions[role]);
  };

  const getUser = (role: UserRole): UserAuthProfile | null => {
    return sessions[role];
  };

  const verifyAdminInFirestore = useCallback(async (uid?: string, email?: string): Promise<AdminVerificationResult> => {
    return checkIsAdminInFirestore({ uid, email });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        sessions,
        loading,
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

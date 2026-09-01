import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { UserAuthProfile } from '../types/auth';
import { handleFirestoreError, OperationType } from '../utils/firestoreDebug';

export interface AdminFirestoreRecord {
  id?: string;
  uid: string;
  correo: string;
  email?: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  rol: 'administrador' | 'admin';
  estado: 'activo' | 'inactivo' | 'bloqueado';
  nivelAcceso?: 'superadmin' | 'operador' | 'seguridad';
  fechaRegistro?: string;
  ultimoAcceso?: string;
  creadoEn?: any;
}

export interface AdminVerificationResult {
  isAdmin: boolean;
  adminData: AdminFirestoreRecord | null;
  source: 'administradores_doc' | 'administradores_query' | 'admins_fallback' | 'users_fallback' | 'none';
  error?: string;
}

/**
 * Checks in Firestore whether a given user (by UID or email) exists and has an active admin role 
 * specifically in the 'administradores' collection.
 */
export async function checkIsAdminInFirestore(
  targetUser?: { uid?: string | null; email?: string | null }
): Promise<AdminVerificationResult> {
  const currentAuthUser = auth.currentUser;
  const uid = targetUser?.uid || currentAuthUser?.uid;
  const email = (targetUser?.email || currentAuthUser?.email || '').trim().toLowerCase();

  if (!uid && !email) {
    return {
      isAdmin: false,
      adminData: null,
      source: 'none',
      error: 'No hay identificador UID ni correo proporcionado para la verificación.'
    };
  }

  // 1. Direct lookup by UID in 'administradores' collection: doc(db, 'administradores', uid)
  if (uid) {
    try {
      const adminDocRef = doc(db, 'administradores', uid);
      const docSnap = await getDoc(adminDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as AdminFirestoreRecord;
        const role = (data.rol || '').toLowerCase();
        const status = (data.estado || 'activo').toLowerCase();

        // Check if role is admin and account is not blocked
        const hasAdminRole = role === 'administrador' || role === 'admin' || role === 'superadmin' || !data.rol;
        const isAccountActive = status !== 'bloqueado' && status !== 'inactivo';

        if (hasAdminRole && isAccountActive) {
          return {
            isAdmin: true,
            adminData: { ...data, uid: data.uid || uid, id: docSnap.id },
            source: 'administradores_doc'
          };
        }
      }
    } catch (err: any) {
      console.warn(`[Firestore Check] Direct lookup in 'administradores/${uid}' note:`, err.message);
      handleFirestoreError(err, OperationType.GET, `administradores/${uid}`);
    }
  }

  // 2. Query lookup by email in 'administradores' collection
  if (email) {
    try {
      const adminCol = collection(db, 'administradores');
      
      // Check field 'correo'
      const qCorreo = query(adminCol, where('correo', '==', email));
      const snapCorreo = await getDocs(qCorreo);

      if (!snapCorreo.empty) {
        const docSnap = snapCorreo.docs[0];
        const data = docSnap.data() as AdminFirestoreRecord;
        const role = (data.rol || '').toLowerCase();
        const status = (data.estado || 'activo').toLowerCase();

        const hasAdminRole = role === 'administrador' || role === 'admin' || role === 'superadmin' || !data.rol;
        const isAccountActive = status !== 'bloqueado' && status !== 'inactivo';

        if (hasAdminRole && isAccountActive) {
          return {
            isAdmin: true,
            adminData: { ...data, uid: data.uid || docSnap.id, id: docSnap.id },
            source: 'administradores_query'
          };
        }
      }

      // Check field 'email' in case of alternative naming
      const qEmail = query(adminCol, where('email', '==', email));
      const snapEmail = await getDocs(qEmail);

      if (!snapEmail.empty) {
        const docSnap = snapEmail.docs[0];
        const data = docSnap.data() as AdminFirestoreRecord;
        return {
          isAdmin: true,
          adminData: { ...data, uid: data.uid || docSnap.id, id: docSnap.id },
          source: 'administradores_query'
        };
      }
    } catch (err: any) {
      console.warn(`[Firestore Check] Query by email in 'administradores' note:`, err.message);
    }
  }

  // 3. Fallback check on 'admins' collection
  if (uid) {
    try {
      const fallbackDoc = await getDoc(doc(db, 'admins', uid));
      if (fallbackDoc.exists()) {
        const data = fallbackDoc.data() as any;
        return {
          isAdmin: true,
          adminData: {
            uid,
            correo: data.correo || email,
            nombre: data.nombre || 'Administrador',
            rol: 'administrador',
            estado: 'activo',
            ...data
          },
          source: 'admins_fallback'
        };
      }
    } catch (err) {
      // ignore fallback error
    }
  }

  // 4. Fallback check in 'users' collection for rol === 'administrador'
  if (uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserAuthProfile;
        if (userData.rol === 'administrador' && userData.estado !== 'bloqueado') {
          return {
            isAdmin: true,
            adminData: {
              uid,
              correo: userData.correo || email,
              nombre: userData.nombre || 'Administrador',
              apellidos: userData.apellidos,
              rol: 'administrador',
              estado: (userData.estado as any) || 'activo'
            },
            source: 'users_fallback'
          };
        }
      }
    } catch (err) {
      // ignore fallback error
    }
  }

  return {
    isAdmin: false,
    adminData: null,
    source: 'none',
    error: 'El usuario no cuenta con registro de administrador activo en la colección administradores.'
  };
}

/**
 * Creates or synchronizes an administrator record in the 'administradores' collection in Firestore.
 */
export async function registerAdminInFirestore(
  adminData: {
    uid: string;
    correo: string;
    nombre: string;
    apellidos?: string;
    telefono?: string;
    nivelAcceso?: 'superadmin' | 'operador' | 'seguridad';
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminRecord: AdminFirestoreRecord = {
      uid: adminData.uid,
      correo: adminData.correo.trim().toLowerCase(),
      nombre: adminData.nombre.trim(),
      apellidos: adminData.apellidos?.trim() || '',
      rol: 'administrador',
      estado: 'activo',
      nivelAcceso: adminData.nivelAcceso || 'superadmin',
      fechaRegistro: new Date().toISOString(),
      ultimoAcceso: new Date().toISOString()
    };

    // 1. Save in 'administradores' collection
    await setDoc(doc(db, 'administradores', adminData.uid), {
      ...adminRecord,
      creadoEn: serverTimestamp()
    });

    // 2. Also ensure mirrored in 'users' collection for universal auth compatibility
    const userProfile: UserAuthProfile = {
      id: adminData.uid,
      uid: adminData.uid,
      nombre: adminData.nombre.trim(),
      apellidos: adminData.apellidos?.trim() || 'Admin',
      correo: adminData.correo.trim().toLowerCase(),
      telefono: adminData.telefono || '',
      estado: 'activo',
      fechaRegistro: new Date().toISOString(),
      ultimoAcceso: new Date().toISOString(),
      correoVerificado: true,
      rol: 'administrador',
      fechaActualizacion: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', adminData.uid), userProfile);

    return { success: true };
  } catch (err: any) {
    console.error("Error setting admin record in 'administradores':", err);
    handleFirestoreError(err, OperationType.CREATE, `administradores/${adminData.uid}`, adminData);
    return { success: false, error: err.message };
  }
}

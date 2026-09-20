import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, setDoc, getDoc, updateDoc, collection, deleteDoc, onSnapshot } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { TherapistFullProfile, TherapistDocument, DocumentStatus, AccountStatus } from '../types/auth';
import { handleFirestoreError, OperationType, cleanForFirestore } from '../utils/firestoreDebug';
import { useAuth } from './AuthContext';

interface AuditLog {
  id: string;
  therapistId: string;
  therapistName: string;
  action: string;
  performedBy: string; // e.g. "Administradora"
  timestamp: string;
  details?: string;
}

interface TherapistContextType {
  therapists: TherapistFullProfile[];
  auditLogs: AuditLog[];
  loading: boolean;
  firestoreError: string | null;
  sensitiveInfo: Record<string, { curp?: string; ineNumber?: string; cuentaBancariaCLABE?: string }>;
  
  // Admin Operations
  loadSensitiveInfo: (id: string) => Promise<void>;
  createTherapist: (data: {
    id?: string;
    nombre: string;
    apellidos: string;
    correo: string;
    telefono: string;
    especialidades: string[];
    zonasCobertura: string[];
    tempPassword?: string;
    fotografia?: string;
    fechaNacimiento?: string;
    direccion?: string;
    curp?: string;
    ineNumber?: string;
    certificacionesInfo?: string;
    cuentaBancariaCLABE?: string;
    contactoEmergencia?: { nombre: string; parentesco: string; telefono: string };
    experienciaAnos?: number;
    disponibilidad?: string;
    estado?: AccountStatus;
  }) => Promise<{ success: boolean; tempPassword?: string; error?: string }>;
  
  updateTherapist: (id: string, updates: Partial<TherapistFullProfile>) => Promise<{ success: boolean; error?: string }>;
  changeTherapistStatus: (id: string, status: AccountStatus, reason?: string) => Promise<{ success: boolean; tempPassword?: string; error?: string }>;
  resetTherapistPassword: (id: string) => Promise<{ success: boolean; message?: string; tempPassword?: string; error?: string }>;
  deleteTherapist: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Document Verification (Admin)
  reviewDocument: (therapistId: string, documentId: string, status: DocumentStatus, motivoRechazo?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Therapist Self Operations
  uploadDocument: (therapistId: string, docData: Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>) => Promise<{ success: boolean; error?: string }>;
  replaceDocument: (therapistId: string, documentId: string, docData: Partial<Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>>) => Promise<{ success: boolean; error?: string }>;
  deleteDocument: (therapistId: string, documentId: string) => Promise<{ success: boolean; error?: string }>;
  updateSelfProfile: (therapistId: string, updates: Partial<TherapistFullProfile>) => Promise<{ success: boolean; error?: string }>;
  
  getTherapistById: (id: string) => TherapistFullProfile | undefined;
  refreshTherapists: () => Promise<void>;
}

const TherapistContext = createContext<TherapistContextType | undefined>(undefined);

// Helper to guarantee complete and non-null data structure for therapists
export const sanitizeTherapist = (raw: any): TherapistFullProfile => {
  const defaultDate = new Date().toISOString();

  if (!raw || typeof raw !== 'object') {
    return {
      id: `therapist-${Date.now()}`,
      nombre: 'Terapeuta',
      apellidos: '',
      correo: '',
      telefono: '',
      fotografia: '',
      especialidades: [],
      experienciaAnos: 1,
      idiomas: ['Español'],
      disponibilidad: 'Lunes a Sábado',
      zonasCobertura: [],
      zonasCoordinadas: [],
      estado: 'pendiente',
      documentos: [],
      puntuacion: 5.0,
      resenasCount: 0,
      serviciosCompletados: 0,
      fechaAlta: defaultDate,
      fechaIngreso: defaultDate,
      ultimoAcceso: defaultDate,
      fechaActualizacion: defaultDate
    } as TherapistFullProfile;
  }

  // 1. Safe Names & Contacts
  const nombre = String(raw.nombre || raw.name || 'Terapeuta');
  const apellidos = String(raw.apellidos || '');
  const correo = String(raw.correo || raw.email || '');
  const telefono = String(raw.telefono || raw.phone || '');
  const fotografia = raw.fotografia || raw.photo || raw.photoURL || '';

  // 2. Status normalization (maps legacy or english variants)
  let rawStatus = String(raw.estado || raw.status || 'pendiente').toLowerCase();
  if (rawStatus === 'active' || rawStatus === 'disponible') rawStatus = 'activo';
  else if (rawStatus === 'pending') rawStatus = 'pendiente';
  else if (rawStatus === 'rejected') rawStatus = 'rechazado';
  else if (rawStatus === 'blocked' || rawStatus === 'suspendido' || rawStatus === 'suspended') rawStatus = 'bloqueado';
  else if (rawStatus === 'inactive') rawStatus = 'inactivo';
  const estado: AccountStatus = (['activo', 'inactivo', 'bloqueado', 'pendiente', 'rechazado'].includes(rawStatus)
    ? rawStatus
    : 'pendiente') as AccountStatus;

  // 3. Specialties normalization (accepts array, string comma-separated, or specialties)
  let especialidades: string[] = [];
  if (Array.isArray(raw.especialidades)) {
    especialidades = raw.especialidades.map((s: any) => String(s || '').trim()).filter(Boolean);
  } else if (Array.isArray(raw.specialties)) {
    especialidades = raw.specialties.map((s: any) => String(s || '').trim()).filter(Boolean);
  } else if (typeof raw.especialidades === 'string' && raw.especialidades.trim()) {
    especialidades = raw.especialidades.split(',').map((s: string) => s.trim()).filter(Boolean);
  } else if (typeof raw.specialties === 'string' && raw.specialties.trim()) {
    especialidades = raw.specialties.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  // 4. Coverage Zones normalization (zonasCobertura, coverageZones, zonasCoordinadas)
  let zonasCobertura: string[] = [];
  if (Array.isArray(raw.zonasCobertura)) {
    zonasCobertura = raw.zonasCobertura.map((z: any) => String(z || '').trim()).filter(Boolean);
  } else if (Array.isArray(raw.coverageZones)) {
    zonasCobertura = raw.coverageZones.map((z: any) => String(z || '').trim()).filter(Boolean);
  } else if (Array.isArray(raw.zonasCoordinadas)) {
    zonasCobertura = raw.zonasCoordinadas.map((z: any) => String(z || '').trim()).filter(Boolean);
  } else if (typeof raw.zonasCobertura === 'string' && raw.zonasCobertura.trim()) {
    zonasCobertura = raw.zonasCobertura.split(',').map((z: string) => z.trim()).filter(Boolean);
  } else if (typeof raw.coverageZones === 'string' && raw.coverageZones.trim()) {
    zonasCobertura = raw.coverageZones.split(',').map((z: string) => z.trim()).filter(Boolean);
  }

  // 5. Numerical metrics normalization (puntuacion/rating, resenasCount/reviewCount, serviciosCompletados/totalServices)
  const rawRating = typeof raw.puntuacion === 'number' ? raw.puntuacion : Number(raw.puntuacion || raw.rating);
  const puntuacion = !isNaN(rawRating) && rawRating > 0 ? rawRating : 5.0;

  const rawReviews = typeof raw.resenasCount === 'number' ? raw.resenasCount : Number(raw.resenasCount || raw.reviewCount);
  const resenasCount = !isNaN(rawReviews) && rawReviews >= 0 ? rawReviews : 0;

  const rawCompleted = typeof raw.serviciosCompletados === 'number' 
    ? raw.serviciosCompletados 
    : Number(raw.serviciosCompletados || raw.totalServices || raw.completedServicesCount);
  const serviciosCompletados = !isNaN(rawCompleted) && rawCompleted >= 0 ? rawCompleted : 0;

  // 6. Emergency Contact normalization (object or string)
  let contactoEmergencia: { nombre: string; parentesco: string; telefono: string } | undefined = undefined;
  if (raw.contactoEmergencia && typeof raw.contactoEmergencia === 'object') {
    contactoEmergencia = {
      nombre: String(raw.contactoEmergencia.nombre || raw.contactoEmergencia.name || ''),
      parentesco: String(raw.contactoEmergencia.parentesco || 'Familiar'),
      telefono: String(raw.contactoEmergencia.telefono || raw.contactoEmergencia.phone || '')
    };
  } else if (typeof raw.contactoEmergencia === 'string' && raw.contactoEmergencia.trim()) {
    contactoEmergencia = {
      nombre: raw.contactoEmergencia.trim(),
      parentesco: 'Familiar',
      telefono: ''
    };
  }

  // 7. Documents normalization (array or object map with robust field defaults)
  const rawDocs = Array.isArray(raw.documentos)
    ? raw.documentos
    : (raw.documentos && typeof raw.documentos === 'object' ? Object.values(raw.documentos) : []);

  const documentos: TherapistDocument[] = rawDocs
    .filter((d: any) => d && typeof d === 'object')
    .map((d: any, idx: number) => {
      const dId = String(d.id || `doc-${Date.now()}-${idx}`);
      const dName = String(d.nombreDocumento || d.nombre || d.name || 'Documento de Certificación');
      const dTipo = String(d.tipo || d.type || 'diploma');
      const dInst = String(d.institucion || d.institution || 'Institución Oficial');
      const dEmision = String(d.fechaEmision || d.emisionDate || 'No disponible');
      const dUrl = String(d.fileUrl || d.url || d.file_url || '');
      const dFileType = String(d.fileType || d.typeFormat || (dUrl.includes('.pdf') ? 'pdf' : 'archivo'));
      
      const rawDocEstado = String(d.estado || d.status || 'pendiente').toLowerCase();
      let dEstado: DocumentStatus = 'pendiente';
      if (rawDocEstado === 'aprobado' || rawDocEstado === 'validado' || rawDocEstado === 'approved') {
        dEstado = 'validado';
      } else if (rawDocEstado === 'rechazado' || rawDocEstado === 'rejected') {
        dEstado = 'rechazado';
      }

      return {
        id: dId,
        nombreDocumento: dName,
        tipo: dTipo,
        institucion: dInst,
        fechaEmision: dEmision,
        fileUrl: dUrl,
        fileType: dFileType,
        estado: dEstado,
        fechaSubida: d.fechaSubida || defaultDate,
        fechaRevision: d.fechaRevision || undefined,
        revisadoPor: d.revisadoPor || undefined,
        motivoRechazo: d.motivoRechazo ? String(d.motivoRechazo) : undefined
      };
    });

  return {
    ...raw,
    id: String(raw.id || raw.uid || `therapist-${Date.now()}`),
    nombre,
    apellidos,
    correo,
    telefono,
    fotografia,
    photo: raw.photo || fotografia,
    curp: raw.curp || raw.CURP || undefined,
    ineNumber: raw.ineNumber || raw.ine || raw.INE || undefined,
    cuentaBancariaCLABE: raw.cuentaBancariaCLABE || raw.clabe || raw.CLABE || undefined,
    banco: raw.banco || raw.bankName || undefined,
    numeroCuenta: raw.numeroCuenta || raw.accountNumber || undefined,
    titularCuenta: raw.titularCuenta || raw.accountHolder || undefined,
    direccion: raw.direccion || undefined,
    fechaNacimiento: raw.fechaNacimiento || undefined,
    certificacionesInfo: raw.certificacionesInfo || undefined,
    contactoEmergencia,
    especialidades,
    experienciaAnos: typeof raw.experienciaAnos === 'number' ? raw.experienciaAnos : 3,
    idiomas: Array.isArray(raw.idiomas) && raw.idiomas.length ? raw.idiomas : ['Español'],
    disponibilidad: raw.disponibilidad || 'Lunes a Sábado, 8:00 - 20:00',
    zonasCobertura,
    zonasCoordinadas: zonasCobertura,
    estado,
    documentos,
    puntuacion,
    resenasCount,
    serviciosCompletados,
    fechaAlta: raw.fechaAlta || raw.fechaIngreso || defaultDate,
    fechaIngreso: raw.fechaIngreso || raw.fechaAlta || defaultDate,
    ultimoAcceso: raw.ultimoAcceso || 'Nunca',
    fechaActualizacion: raw.fechaActualizacion || defaultDate
  } as TherapistFullProfile;
};

// Initial professional therapists dataset (starts clean for production)
const INITIAL_THERAPISTS: TherapistFullProfile[] = [];

export const TherapistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [therapists, setTherapists] = useState<TherapistFullProfile[]>(INITIAL_THERAPISTS);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [sensitiveInfo, setSensitiveInfo] = useState<Record<string, any>>({});
  const { firebaseUser, sessions } = useAuth();

  // Helper to fetch therapists from backend API (guarantees administrative visibility)
  const fetchTherapistsFromBackend = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/therapists');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.therapists)) {
          const loaded: TherapistFullProfile[] = data.therapists
            .map((raw: any) => {
              try {
                return sanitizeTherapist(raw);
              } catch (e) {
                console.error('Error sanitizing therapist profile from backend:', raw?.id, e);
                return null;
              }
            })
            .filter((t): t is TherapistFullProfile => t !== null);
          setTherapists(loaded);
          setFirestoreError(null);
        }
      }
    } catch (apiErr) {
      console.warn('Backend API fallback for therapists encountered an error:', apiErr);
    } finally {
      setLoading(false);
    }
  }, []);

  // Firestore Realtime Subscription for Therapists
  useEffect(() => {
    const isAdminSession = !!sessions.administrador ||
      (firebaseUser && (
        firebaseUser.email === 'essenya222@gmail.com' ||
        firebaseUser.email === 'graphixglow.2024@gmail.com'
      ));
    const isTherapistSession = !!sessions.terapeuta;

    if (!isAdminSession && !isTherapistSession && !firebaseUser) {
      setTherapists([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isAdminSession) {
      // 1. Inmediatamente consultar vía backend para garantizar visibilidad sin fricción
      fetchTherapistsFromBackend();

      // 2. Si hay conexión y usuario en Firebase Auth, suscribirse en tiempo real a la colección
      if (firebaseUser) {
        const unsubscribe = onSnapshot(collection(db, 'terapeutas'), (snapshot) => {
          setFirestoreError(null);
          setLoading(false);
          if (snapshot.empty) {
            // Revalidar con backend antes de vaciar por completo
            fetchTherapistsFromBackend();
          } else {
            const loaded: TherapistFullProfile[] = snapshot.docs
              .map(docSnap => {
                try {
                  return sanitizeTherapist({
                    id: docSnap.id,
                    ...docSnap.data()
                  });
                } catch (e) {
                  console.error('Error sanitizing therapist profile:', docSnap.id, e);
                  return null;
                }
              })
              .filter((t): t is TherapistFullProfile => t !== null);
            setTherapists(loaded);
          }
        }, (err) => {
          setLoading(false);
          console.warn('Firestore onSnapshot fallback a backend para terapeutas:', err);
          // Si Firestore client tiene problemas de reglas o conexión, el backend resuelve
          fetchTherapistsFromBackend();
        });
        return () => unsubscribe();
      }
    } else if (isTherapistSession) {
      // Subscribe ONLY to their own therapist document
      const therapistId = sessions.terapeuta?.id || firebaseUser?.uid;
      if (!therapistId) {
        setTherapists([]);
        setLoading(false);
        return;
      }
      const unsubscribe = onSnapshot(doc(db, 'terapeutas', therapistId), (docSnap) => {
        setFirestoreError(null);
        setLoading(false);
        if (!docSnap.exists()) {
          setTherapists([]);
        } else {
          try {
            const profile = sanitizeTherapist({
              id: docSnap.id,
              ...docSnap.data()
            });
            setTherapists([profile]);
          } catch (e) {
            console.error('Error sanitizing self therapist profile:', docSnap.id, e);
            setTherapists([]);
          }
        }
      }, (err) => {
        setLoading(false);
        const isPermissionDenied = err.code === 'permission-denied' || (err.message && err.message.includes('permission-denied'));
        if (isPermissionDenied) {
          console.error(`Firestore permission-denied en "terapeutas/${therapistId}":`, err);
          setFirestoreError('No fue posible cargar tu perfil de terapeuta.');
        } else {
          handleFirestoreError(err, OperationType.GET, `terapeutas/${therapistId}`);
          setFirestoreError('No fue posible cargar tu perfil de terapeuta.');
        }
      });
      return () => unsubscribe();
    } else {
      // Clients or unauthenticated users don't need any therapist documents
      setTherapists([]);
      setLoading(false);
    }
  }, [firebaseUser, sessions.administrador, sessions.terapeuta, fetchTherapistsFromBackend]);

  // Log Audit Action
  const logAudit = useCallback((therapistId: string, therapistName: string, action: string, details?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      therapistId,
      therapistName,
      action,
      performedBy: 'Administradora',
      timestamp: new Date().toISOString(),
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, []);

  const loadSensitiveInfo = useCallback(async (id: string) => {
    try {
      const privateInfoRef = doc(db, 'terapeutas', id, 'private_info', 'sensitive');
      const snap = await getDoc(privateInfoRef);
      if (snap.exists() && snap.data() && Object.keys(snap.data() || {}).length > 0) {
        setSensitiveInfo(prev => ({
          ...prev,
          [id]: snap.data()
        }));
      } else {
        const tSnap = await getDoc(doc(db, 'terapeutas', id));
        if (tSnap.exists()) {
          const tData = tSnap.data();
          setSensitiveInfo(prev => ({
            ...prev,
            [id]: {
              curp: tData.curp || '',
              ineNumber: tData.ineNumber || '',
              cuentaBancariaCLABE: tData.cuentaBancariaCLABE || '',
              banco: tData.banco || '',
              numeroCuenta: tData.numeroCuenta || '',
              titularCuenta: tData.titularCuenta || ''
            }
          }));
        }
      }
    } catch (err) {
      console.error('Error loading sensitive info for therapist:', id, err);
    }
  }, []);

  // Automatically load sensitive info for all therapists
  useEffect(() => {
    therapists.forEach(t => {
      if (t && t.id && !sensitiveInfo[t.id]) {
        loadSensitiveInfo(t.id);
      }
    });
  }, [therapists, loadSensitiveInfo, sensitiveInfo]);

  // Admin Operation: Create Therapist with Temporary Credentials
  const createTherapist = async (data: {
    id?: string;
    nombre: string;
    apellidos: string;
    correo: string;
    telefono: string;
    especialidades: string[];
    zonasCobertura: string[];
    tempPassword?: string;
    fotografia?: string;
    fechaNacimiento?: string;
    direccion?: string;
    curp?: string;
    ineNumber?: string;
    certificacionesInfo?: string;
    cuentaBancariaCLABE?: string;
    contactoEmergencia?: { nombre: string; parentesco: string; telefono: string };
    experienciaAnos?: number;
    disponibilidad?: string;
    estado?: AccountStatus;
  }): Promise<{ success: boolean; tempPassword?: string; error?: string }> => {
    const { nombre, apellidos, correo, telefono, especialidades, zonasCobertura } = data;

    // Validations
    if (!nombre.trim() || !apellidos.trim() || !correo.trim()) {
      return { success: false, error: 'Por favor completa el nombre, apellidos y correo electrónico.' };
    }

    const trimmedEmail = correo.trim().toLowerCase();
    // Auto generate strong temp password if not provided
    const tempPass = data.tempPassword || `Essenya${Math.floor(1000 + Math.random() * 9000)}!`;
    let finalId = data.id;

    if (!finalId) {
      // Intentar aprovisionar cuenta en Auth vía endpoint administrativo si está disponible
      try {
        const token = await auth.currentUser?.getIdToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const apiResponse = await fetch('/api/admin/create-therapist-auth-profile', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: trimmedEmail,
            password: tempPass,
            displayName: `${nombre} ${apellidos}`.trim()
          })
        });

        if (apiResponse.ok) {
          const apiResult = await apiResponse.json();
          if (apiResult.success && apiResult.uid) {
            finalId = apiResult.uid;
          }
        }
      } catch (err: any) {
        console.warn('[createTherapist] Backend Auth provisioning fallback:', err);
      }

      // Si no se obtuvo UID por backend, generar ID de Firestore seguro para el expediente
      if (!finalId) {
        finalId = doc(collection(db, 'terapeutas')).id;
      }
    }

    const initialStatus: AccountStatus = data.estado || 'activo';

    // Check duplicate: only error if there is another therapist with the same email and a DIFFERENT id
    const existingOther = therapists.find(t => (t.correo || '').toLowerCase() === trimmedEmail && t.id !== finalId);
    if (existingOther) {
      return { success: false, error: 'Ya existe una terapeuta registrada con este correo electrónico.' };
    }

    const newTherapist: TherapistFullProfile = {
      id: finalId,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      correo: trimmedEmail,
      telefono: telefono.trim(),
      fotografia: data.fotografia || '',
      fechaNacimiento: data.fechaNacimiento,
      direccion: data.direccion,
      curp: data.curp,
      ineNumber: data.ineNumber,
      certificacionesInfo: data.certificacionesInfo,
      cuentaBancariaCLABE: data.cuentaBancariaCLABE,
      contactoEmergencia: data.contactoEmergencia,
      especialidades: especialidades.length ? especialidades : ['Masaje Holístico'],
      experienciaAnos: data.experienciaAnos || 3,
      idiomas: ['Español'],
      disponibilidad: data.disponibilidad || 'Lunes a Sábado, 09:00 - 19:00',
      zonasCobertura: zonasCobertura.length ? zonasCobertura : ['Polanco'],
      estado: initialStatus,
      mustChangePassword: !data.id, // Only require password change if created by administrator
      documentos: [], // Start empty for real uploads only
      puntuacion: 5.0,
      resenasCount: 0,
      serviciosCompletados: 0,
      fechaAlta: new Date().toISOString(),
      ultimoAcceso: 'Nunca',
      fechaActualizacion: new Date().toISOString()
    };

    // Save to Firestore
    try {
      const userPayload = {
        id: finalId,
        nombre,
        apellidos,
        correo: trimmedEmail,
        telefono,
        estado: initialStatus,
        fechaRegistro: new Date().toISOString(),
        ultimoAcceso: 'Nunca',
        correoVerificado: true,
        rol: 'terapeuta',
        fechaActualizacion: new Date().toISOString(),
        mustChangePassword: !data.id
      };
      await setDoc(doc(db, 'users', finalId), cleanForFirestore(userPayload), { merge: true });
      await setDoc(doc(db, 'terapeutas', finalId), cleanForFirestore(newTherapist), { merge: true });

      // Guardar datos sensibles en subcolección privada
      const privateInfoRef = doc(db, 'terapeutas', finalId, 'private_info', 'sensitive');
      await setDoc(privateInfoRef, {
        curp: data.curp || null,
        ineNumber: data.ineNumber || null,
        cuentaBancariaCLABE: data.cuentaBancariaCLABE || null,
        updatedAt: new Date().toISOString()
      });
      
      if (initialStatus === 'activo') {
        const publicPayload = {
          id: finalId,
          name: `${nombre} ${apellidos}`.trim(),
          nombre: `${nombre} ${apellidos}`.trim(),
          photo: data.fotografia || '',
          fotografia: data.fotografia || '',
          phone: telefono,
          telefono,
          rating: 5.0,
          puntuacion: 5.0,
          reviewCount: 0,
          resenasCount: 0,
          specialties: especialidades,
          especialidades,
          status: 'disponible',
          estado: 'activo',
          coverageZones: zonasCobertura,
          zonasCobertura,
          completedServicesCount: 0,
          serviciosCompletados: 0,
          bio: data.certificacionesInfo || 'Terapeuta certificada ESSENYA.',
          biografia: data.certificacionesInfo || 'Terapeuta certificada ESSENYA.',
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'terapeutas_publicos', finalId), cleanForFirestore(publicPayload), { merge: true });
        } catch {}
      }

      setTherapists(prev => {
        const remaining = prev.filter(t => t.id !== finalId && (t.correo || '').toLowerCase() !== trimmedEmail);
        return [newTherapist, ...remaining];
      });
      logAudit(finalId, `${nombre} ${apellidos}`, initialStatus === 'pendiente' ? 'Postulación de Terapeuta Registrada' : 'Creación de Cuenta por Administradora', `Estado Inicial: ${initialStatus.toUpperCase()}`);
      
      return { success: true, tempPassword: tempPass };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `terapeutas/${finalId}`, newTherapist);
      return { success: false, error: err?.message || 'Error al registrar la terapeuta en la base de datos.' };
    }
  };

  // Admin Operation: Update Therapist
  const updateTherapist = async (id: string, updates: Partial<TherapistFullProfile>): Promise<{ success: boolean; error?: string }> => {
    let updatedName = '';
    const target = therapists.find(t => t.id === id);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    updatedName = `${updates.nombre || target.nombre} ${updates.apellidos || target.apellidos}`;

    const updatePayload = {
      ...updates,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', id), cleanForFirestore(updatePayload));

      // Update sensitive info if provided
      if (updates.curp || updates.ineNumber || updates.cuentaBancariaCLABE) {
        const privateInfoRef = doc(db, 'terapeutas', id, 'private_info', 'sensitive');
        const sensitiveUpdates: any = {};
        if (updates.curp) sensitiveUpdates.curp = updates.curp;
        if (updates.ineNumber) sensitiveUpdates.ineNumber = updates.ineNumber;
        if (updates.cuentaBancariaCLABE) sensitiveUpdates.cuentaBancariaCLABE = updates.cuentaBancariaCLABE;
        sensitiveUpdates.updatedAt = new Date().toISOString();
        
        await setDoc(privateInfoRef, sensitiveUpdates, { merge: true });
        
        setSensitiveInfo(prev => ({
          ...prev,
          [id]: { ...(prev[id] || {}), ...sensitiveUpdates }
        }));
      }

      try {
        await updateDoc(doc(db, 'users', id), cleanForFirestore({
          fechaActualizacion: new Date().toISOString()
        }));
      } catch {}

      setTherapists(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            ...updates,
            fechaActualizacion: new Date().toISOString()
          };
        }
        return t;
      }));

      // Sync public directory if active
      if (target.estado === 'activo' || updates.estado === 'activo') {
        const publicUpdates = {
          name: updatedName.trim(),
          nombre: updatedName.trim(),
          photo: updates.fotografia || target.fotografia,
          fotografia: updates.fotografia || target.fotografia,
          phone: updates.telefono || target.telefono,
          telefono: updates.telefono || target.telefono,
          specialties: updates.especialidades || target.especialidades,
          especialidades: updates.especialidades || target.especialidades,
          coverageZones: updates.zonasCobertura || target.zonasCobertura,
          zonasCobertura: updates.zonasCobertura || target.zonasCobertura,
          bio: updates.biografia || target.biografia,
          biografia: updates.biografia || target.biografia,
          updatedAt: new Date().toISOString()
        };
        try {
          await updateDoc(doc(db, 'terapeutas_publicos', id), cleanForFirestore(publicUpdates));
        } catch {}
      }

      logAudit(id, updatedName, 'Modificación de Expediente', 'Perfil actualizado por la Administradora.');
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${id}`, updatePayload);
      return { success: false, error: err?.message || 'Error al actualizar terapeuta en Firestore.' };
    }
  };

  // Admin Operation: Change Status (Activo, Inactivo, Bloqueado, Pendiente, Rechazado)
  const changeTherapistStatus = async (id: string, status: AccountStatus, reason?: string): Promise<{ success: boolean; tempPassword?: string; error?: string }> => {
    let target = therapists.find(t => t.id === id);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const statusLabel = 
      status === 'activo' ? 'Aprobada / Activada' : 
      status === 'rechazado' ? 'Rechazada' : 
      status === 'pendiente' ? 'Puesta en Revisión Pendiente' : 
      status === 'inactivo' ? 'Desactivada' : 'Suspendida / Bloqueada';

    // 1. Primary path: Use the atomic administrative backend endpoint
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/therapist/status', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          therapistId: id,
          status,
          reason,
          email: target.correo
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const finalId = result.therapistId || id;
          const tempPass = result.generatedPassword || result.tempPassword;

          // Update local state
          setTherapists(prev => prev.map(t => {
            if (t.id === id || t.id === finalId) {
              return {
                ...t,
                id: finalId,
                estado: status,
                status: status,
                motivoRechazoAccount: status === 'rechazado' ? (reason || 'No cumple con criterios.') : undefined,
                fechaActualizacion: new Date().toISOString(),
                ...(status === 'activo' ? {
                  fechaAprobacion: new Date().toISOString(),
                  aprobadoPor: auth.currentUser?.email || 'admin@essenya.mx',
                  estadoVerificacion: 'verificado'
                } : {})
              };
            }
            return t;
          }));

          logAudit(finalId, `${target.nombre} ${target.apellidos}`, `Estado Cambiado a: ${statusLabel}`, reason || 'Acción ejecutada por Administradora.');
          return { success: true, tempPassword: tempPass };
        }
      }
    } catch (backendErr) {
      console.warn('Backend /api/admin/therapist/status call had an issue, falling back to direct Firestore:', backendErr);
    }

    // 2. Fallback path: Direct client Firestore updates
    let realUid = id;
    let generatedTempPass: string | undefined = undefined;

    // Check Firebase Auth account if approving
    if (status === 'activo') {
      let authExists = false;
      try {
        const token = await auth.currentUser?.getIdToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const checkResponse = await fetch('/api/admin/verify-therapist-auth', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: target.correo,
            uid: id
          })
        });

        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          if (checkResult.success && (checkResult.exists || checkResult.verified)) {
            authExists = true;
            realUid = checkResult.uid || realUid;
          }
        }
      } catch (err) {
        console.warn('Error checking therapist auth existence:', err);
      }

      if (!authExists) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          generatedTempPass = `Essenya${Math.floor(1000 + Math.random() * 9000)}!`;
          const createResponse = await fetch('/api/admin/create-therapist-auth-profile', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              email: target.correo,
              password: generatedTempPass,
              displayName: `${target.nombre} ${target.apellidos || ''}`.trim()
            })
          });

          if (createResponse.ok) {
            const createResult = await createResponse.json();
            if (createResult.success && createResult.uid) {
              realUid = createResult.uid;
            }
          }
        } catch (err: any) {
          console.warn('Fallback auth provisioning error:', err);
        }
      }

      if (realUid !== id) {
        try {
          const oldUserSnap = await getDoc(doc(db, 'users', id));
          const oldTherapistSnap = await getDoc(doc(db, 'terapeutas', id));

          const userData = oldUserSnap.exists() ? oldUserSnap.data() : null;
          const therapistData = oldTherapistSnap.exists() ? oldTherapistSnap.data() : null;

          if (userData) {
            await setDoc(doc(db, 'users', realUid), {
              ...userData,
              id: realUid,
              uid: realUid
            }, { merge: true });
          }
          if (therapistData) {
            await setDoc(doc(db, 'terapeutas', realUid), {
              ...therapistData,
              id: realUid,
              userId: realUid
            }, { merge: true });
          }

          await deleteDoc(doc(db, 'users', id)).catch(() => {});
          await deleteDoc(doc(db, 'terapeutas', id)).catch(() => {});

          id = realUid;
          setTherapists(prev => prev.map(t => {
            if (t.id === target.id) {
              return { ...t, id: realUid };
            }
            return t;
          }));
          target = { ...target, id: realUid };
        } catch (migrationErr: any) {
          console.error('Error migrating Firestore documents to new real UID:', migrationErr);
        }
      }
    }

    const rejectionReason = status === 'rechazado' ? (reason || 'No cumple con los requisitos de acreditación.') : undefined;

    const statusPayload = {
      estado: status,
      status: status,
      estadoAprobacion: status === 'activo' ? 'aprobado' : (status === 'rechazado' ? 'rechazado' : 'pendiente'),
      motivoRechazoAccount: rejectionReason || null,
      fechaActualizacion: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(status === 'activo' ? {
        fechaAprobacion: new Date().toISOString(),
        aprobadoPor: auth.currentUser?.email || 'admin@essenya.mx',
        estadoVerificacion: 'verificado'
      } : {})
    };

    try {
      await updateDoc(doc(db, 'terapeutas', id), cleanForFirestore(statusPayload));
      try {
        await updateDoc(doc(db, 'users', id), cleanForFirestore({
          estado: status,
          isActive: status === 'activo',
          fechaActualizacion: new Date().toISOString(),
          ...(status === 'activo' ? {
            fechaAprobacion: new Date().toISOString(),
            aprobadoPor: auth.currentUser?.email || 'admin@essenya.mx'
          } : {})
        }));
      } catch {}

      if (status === 'activo') {
        const publicPayload = {
          id: target.id,
          name: `${target.nombre} ${target.apellidos || ''}`.trim(),
          nombre: `${target.nombre} ${target.apellidos || ''}`.trim(),
          photo: target.fotografia || '',
          fotografia: target.fotografia || '',
          phone: target.telefono || '',
          telefono: target.telefono || '',
          rating: target.puntuacion || 5.0,
          puntuacion: target.puntuacion || 5.0,
          reviewCount: target.resenasCount || 0,
          resenasCount: target.resenasCount || 0,
          specialties: target.especialidades || ['Masaje Relajante'],
          especialidades: target.especialidades || ['Masaje Relajante'],
          status: 'disponible',
          estado: 'activo',
          coverageZones: target.zonasCobertura || ['Polanco'],
          zonasCobertura: target.zonasCobertura || ['Polanco'],
          completedServicesCount: target.serviciosCompletados || 0,
          serviciosCompletados: target.serviciosCompletados || 0,
          bio: target.biografia || 'Terapeuta certificada ESSENYA.',
          biografia: target.biografia || 'Terapeuta certificada ESSENYA.',
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'terapeutas_publicos', id), cleanForFirestore(publicPayload), { merge: true });
        } catch {}
      } else {
        try {
          await updateDoc(doc(db, 'terapeutas_publicos', id), {
            status: 'desconectado',
            estado: status,
            updatedAt: new Date().toISOString()
          });
        } catch {}
      }

      setTherapists(prev => prev.map(t => {
        if (t.id === id) {
          return { 
            ...t, 
            estado: status, 
            status: status,
            motivoRechazoAccount: rejectionReason, 
            fechaActualizacion: new Date().toISOString() 
          };
        }
        return t;
      }));

      logAudit(id, `${target.nombre} ${target.apellidos}`, `Estado Cambiado a: ${statusLabel}`, reason || 'Acción ejecutada por Administradora.');
      return { success: true, tempPassword: generatedTempPass };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${id}`, statusPayload);
      return { success: false, error: err?.message || 'Error al modificar el estado de la cuenta.' };
    }
  };

  // Admin Operation: Reset Password
  const resetTherapistPassword = async (id: string): Promise<{ success: boolean; message?: string; tempPassword?: string; error?: string }> => {
    const target = therapists.find(t => t.id === id);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    try {
      // 1. Send official Firebase Authentication password reset email
      if (target.correo) {
        const trimmed = target.correo.trim().toLowerCase();
        const origin = window.location.origin;
        try {
          await sendPasswordResetEmail(auth, trimmed, {
            url: `${origin}/login`,
            handleCodeInApp: false
          });
        } catch (e: any) {
          const errStr = (e?.code || '') + ' ' + (e?.message || '');
          if (errStr.includes('auth/user-not-found')) {
            return {
              success: false,
              error: 'Error: El correo electrónico de esta terapeuta no está registrado en Firebase Authentication. Crea la cuenta o verifícala primero.'
            };
          }
          console.warn('Could not send admin-initiated therapist reset email with ActionCodeSettings, trying default reset:', e);
          try {
            await sendPasswordResetEmail(auth, trimmed);
          } catch (e2: any) {
            const errStr2 = (e2?.code || '') + ' ' + (e2?.message || '');
            if (errStr2.includes('auth/user-not-found')) {
              return {
                success: false,
                error: 'Error: El correo electrónico de esta terapeuta no está registrado en Firebase Authentication. No se puede restablecer la contraseña.'
              };
            }
            throw e2;
          }
        }
      }

      // 2. Mark mustChangePassword in Firestore
      await updateDoc(doc(db, 'terapeutas', id), {
        mustChangePassword: true,
        fechaActualizacion: new Date().toISOString()
      });
      try {
        await updateDoc(doc(db, 'users', id), {
          mustChangePassword: true,
          fechaActualizacion: new Date().toISOString()
        });
      } catch {}

      setTherapists(prev => prev.map(t => {
        if (t.id === id) {
          return { ...t, mustChangePassword: true, fechaActualizacion: new Date().toISOString() };
        }
        return t;
      }));

      logAudit(id, `${target.nombre} ${target.apellidos}`, 'Restablecimiento Oficial de Contraseña', `Enlace de recuperación emitido y enviado a ${target.correo}.`);

      return { 
        success: true, 
        message: `Se ha enviado el enlace oficial de restablecimiento a ${target.correo}.` 
      };
    } catch (err: any) {
      console.error('Password reset failed for therapist:', err);
      return { 
        success: false, 
        error: err?.message || 'No se pudo enviar el correo de restablecimiento de contraseña.' 
      };
    }
  };

  // Admin Operation: Delete Therapist
  const deleteTherapist = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === id);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/admin/therapist/${id}`, {
        method: 'DELETE',
        headers
      }).catch(() => {});
    } catch {}

    try {
      await deleteDoc(doc(db, 'terapeutas', id)).catch(() => {});
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch {}
      try {
        await deleteDoc(doc(db, 'terapeutas_publicos', id));
      } catch {}

      setTherapists(prev => prev.filter(t => t.id !== id));
      logAudit(id, `${target.nombre} ${target.apellidos}`, 'Eliminación de Cuenta', 'Cuenta eliminada permanentemente del sistema.');

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `terapeutas/${id}`);
      return { success: false, error: err?.message || 'Error al eliminar terapeuta de Firestore.' };
    }
  };

  // Admin Document Review (Approve or Reject with Reason)
  const reviewDocument = async (
    therapistId: string, 
    documentId: string, 
    status: DocumentStatus, 
    motivoRechazo?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === therapistId);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const statusNormalized = status === 'aprobado' ? 'validado' : status;
    const updatedDocs = target.documentos.map(doc => {
      if (doc.id === documentId) {
        return {
          ...doc,
          estado: statusNormalized,
          fechaRevision: new Date().toISOString(),
          revisadoPor: 'Administradora ESSENYA',
          motivoRechazo: statusNormalized === 'rechazado' ? motivoRechazo || 'Documento ilegible o vencido.' : undefined
        };
      }
      return doc;
    });

    const updatePayload = {
      documentos: updatedDocs,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', therapistId), cleanForFirestore(updatePayload));

      setTherapists(prev => prev.map(t => {
        if (t.id === therapistId) {
          return { ...t, documentos: updatedDocs, fechaActualizacion: new Date().toISOString() };
        }
        return t;
      }));

      logAudit(
        therapistId, 
        `${target.nombre} ${target.apellidos}`, 
        `Revisión de Documento (${statusNormalized.toUpperCase()})`, 
        statusNormalized === 'rechazado' ? `Motivo: ${motivoRechazo}` : 'Documento validado y certificado por Admin.'
      );

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${therapistId}`, updatePayload);
      return { success: false, error: err?.message || 'Error al guardar la revisión en Firestore.' };
    }
  };

  // Therapist Operation: Upload Document
  const uploadDocument = async (
    therapistId: string, 
    docData: Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>
  ): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === therapistId);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const inferredMime = docData.fileType === 'pdf' ? 'application/pdf' : (docData.fileType === 'png' ? 'image/png' : 'image/jpeg');
    const timestamp = Date.now();
    const cleanFileName = docData.nombreDocumento.replace(/[^a-zA-Z0-9.-]/g, '_') + '.' + docData.fileType;

    const newDoc: TherapistDocument = {
      ...docData,
      id: `doc-${timestamp}`,
      estado: 'pendiente',
      fechaSubida: new Date().toISOString(),
      nombreArchivo: cleanFileName,
      mimeType: inferredMime,
      fechaCarga: new Date().toISOString(),
      estadoRevision: 'pendiente'
    };

    const updatedDocs = [...target.documentos, newDoc];
    const updatePayload = {
      documentos: updatedDocs,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', therapistId), cleanForFirestore(updatePayload));

      setTherapists(prev => prev.map(t => {
        if (t.id === therapistId) {
          return {
            ...t,
            documentos: updatedDocs,
            fechaActualizacion: new Date().toISOString()
          };
        }
        return t;
      }));

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${therapistId}`, updatePayload);
      return { success: false, error: err?.message || 'Error al subir documento.' };
    }
  };

  // Therapist Operation: Replace Document (e.g. resubmitting a rejected or updated document)
  const replaceDocument = async (
    therapistId: string,
    documentId: string,
    docData: Partial<Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>>
  ): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === therapistId);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const inferredMime = docData.fileType === 'pdf' ? 'application/pdf' : (docData.fileType === 'png' ? 'image/png' : 'image/jpeg');
    const cleanFileName = (docData.nombreDocumento || 'documento').replace(/[^a-zA-Z0-9.-]/g, '_') + '.' + (docData.fileType || 'pdf');

    const updatedDocs = target.documentos.map(d => {
      if (d.id === documentId) {
        return {
          ...d,
          ...docData,
          estado: 'pendiente' as DocumentStatus,
          motivoRechazo: undefined,
          fechaSubida: new Date().toISOString(),
          fechaRevision: undefined,
          revisadoPor: undefined,
          nombreArchivo: cleanFileName,
          mimeType: inferredMime,
          fechaCarga: new Date().toISOString(),
          estadoRevision: 'pendiente'
        };
      }
      return d;
    });

    const updatePayload = {
      documentos: updatedDocs,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', therapistId), cleanForFirestore(updatePayload));

      setTherapists(prev => prev.map(t => {
        if (t.id === therapistId) {
          return {
            ...t,
            documentos: updatedDocs,
            fechaActualizacion: new Date().toISOString()
          };
        }
        return t;
      }));

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${therapistId}`, updatePayload);
      return { success: false, error: err?.message || 'Error al reemplazar documento.' };
    }
  };

  // Therapist Operation: Delete Document
  const deleteDocument = async (
    therapistId: string,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === therapistId);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const updatedDocs = target.documentos.filter(d => d.id !== documentId);
    const updatePayload = {
      documentos: updatedDocs,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', therapistId), cleanForFirestore(updatePayload));

      setTherapists(prev => prev.map(t => {
        if (t.id === therapistId) {
          return {
            ...t,
            documentos: updatedDocs,
            fechaActualizacion: new Date().toISOString()
          };
        }
        return t;
      }));

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${therapistId}`, updatePayload);
      return { success: false, error: err?.message || 'Error al eliminar documento.' };
    }
  };

  // Therapist Operation: Update Self Profile
  const updateSelfProfile = async (
    therapistId: string, 
    updates: Partial<TherapistFullProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    const updatePayload = {
      ...updates,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', therapistId), cleanForFirestore(updatePayload));

      // Also save sensitive info in subcollection if present
      const sensitiveUpdates: Record<string, any> = {};
      if (updates.curp !== undefined) sensitiveUpdates.curp = updates.curp;
      if (updates.ineNumber !== undefined) sensitiveUpdates.ineNumber = updates.ineNumber;
      if (updates.cuentaBancariaCLABE !== undefined) sensitiveUpdates.cuentaBancariaCLABE = updates.cuentaBancariaCLABE;
      if (updates.banco !== undefined) sensitiveUpdates.banco = updates.banco;
      if (updates.numeroCuenta !== undefined) sensitiveUpdates.numeroCuenta = updates.numeroCuenta;
      if (updates.titularCuenta !== undefined) sensitiveUpdates.titularCuenta = updates.titularCuenta;

      if (Object.keys(sensitiveUpdates).length > 0) {
        try {
          const privateInfoRef = doc(db, 'terapeutas', therapistId, 'private_info', 'sensitive');
          await setDoc(privateInfoRef, {
            ...sensitiveUpdates,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          setSensitiveInfo(prev => ({
            ...prev,
            [therapistId]: {
              ...(prev[therapistId] || {}),
              ...sensitiveUpdates
            }
          }));
        } catch (err) {
          console.warn('Error updating private_info/sensitive:', err);
        }
      }

      // Sync photograph or basic fields with users and terapeutas_publicos collections
      if (updates.fotografia !== undefined) {
        try {
          await updateDoc(doc(db, 'users', therapistId), {
            fotografia: updates.fotografia,
            fechaActualizacion: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Error syncing photograph with users collection:', err);
        }

        try {
          const publicDocRef = doc(db, 'terapeutas_publicos', therapistId);
          const publicDocSnap = await getDoc(publicDocRef);
          if (publicDocSnap.exists()) {
            await updateDoc(publicDocRef, {
              fotografia: updates.fotografia,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn('Error syncing photograph with terapeutas_publicos:', err);
        }
      }

      setTherapists(prev => prev.map(t => {
        if (t.id === therapistId) {
          return {
            ...t,
            ...updates,
            fechaActualizacion: new Date().toISOString()
          };
        }
        return t;
      }));

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${therapistId}`, updatePayload);
      return { success: false, error: err?.message || 'Error al actualizar perfil.' };
    }
  };

  const getTherapistById = (id: string) => {
    return therapists.find(t => t.id === id);
  };

  return (
    <TherapistContext.Provider
      value={{
        therapists,
        auditLogs,
        loading,
        firestoreError,
        createTherapist,
        updateTherapist,
        changeTherapistStatus,
        resetTherapistPassword,
        deleteTherapist,
        reviewDocument,
        uploadDocument,
        replaceDocument,
        deleteDocument,
        updateSelfProfile,
        getTherapistById,
        loadSensitiveInfo,
        sensitiveInfo,
        refreshTherapists: fetchTherapistsFromBackend
      }}
    >
      {children}
    </TherapistContext.Provider>
  );
};

export const useTherapistContext = () => {
  const context = useContext(TherapistContext);
  if (!context) {
    throw new Error('useTherapistContext must be used within a TherapistProvider');
  }
  return context;
};


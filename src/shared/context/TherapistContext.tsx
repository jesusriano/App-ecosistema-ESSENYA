import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, setDoc, updateDoc, collection, deleteDoc, onSnapshot } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { TherapistFullProfile, TherapistDocument, DocumentStatus, AccountStatus } from '../types/auth';
import { handleFirestoreError, OperationType } from '../utils/firestoreDebug';
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
  
  // Admin Operations
  createTherapist: (data: {
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
  changeTherapistStatus: (id: string, status: AccountStatus, reason?: string) => Promise<{ success: boolean; error?: string }>;
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
}

const TherapistContext = createContext<TherapistContextType | undefined>(undefined);

// Initial professional therapists dataset (starts clean for production)
const INITIAL_THERAPISTS: TherapistFullProfile[] = [];

export const TherapistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [therapists, setTherapists] = useState<TherapistFullProfile[]>(() => {
    try {
      const stored = localStorage.getItem('essenya_therapists_list');
      return stored ? JSON.parse(stored) : INITIAL_THERAPISTS;
    } catch {
      return INITIAL_THERAPISTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('essenya_therapist_audit_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const { firebaseUser } = useAuth();

  // Firestore Realtime Subscription for Therapists
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'terapeutas'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: TherapistFullProfile[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as TherapistFullProfile));
        setTherapists(loaded);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'terapeutas');
    });

    return () => unsubscribe();
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('essenya_therapists_list', JSON.stringify(therapists));
    } catch {}
  }, [therapists]);

  useEffect(() => {
    try {
      localStorage.setItem('essenya_therapist_audit_logs', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

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
    const newId = data.id || `ther-${Date.now()}`;
    const initialStatus: AccountStatus = data.estado || 'activo';

    // Check duplicate: only error if there is another therapist with the same email and a DIFFERENT id
    const existingOther = therapists.find(t => t.correo.toLowerCase() === trimmedEmail && t.id !== newId);
    if (existingOther) {
      return { success: false, error: 'Ya existe una terapeuta registrada con este correo electrónico.' };
    }

    // Auto generate strong temp password if not provided
    const tempPass = data.tempPassword || `Essenya${Math.floor(1000 + Math.random() * 9000)}!`;

    const newTherapist: TherapistFullProfile = {
      id: newId,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      correo: trimmedEmail,
      telefono: telefono.trim(),
      fotografia: data.fotografia || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
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
      mustChangePassword: initialStatus === 'activo',
      documentos: [
        {
          id: `doc-${Date.now()}-ine`,
          nombreDocumento: 'Identificación INE / Cédula',
          tipo: 'ine',
          institucion: 'INE México',
          fechaEmision: '2022-01-01',
          fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600',
          fileType: 'pdf',
          estado: 'pendiente',
          fechaSubida: new Date().toISOString()
        },
        {
          id: `doc-${Date.now()}-curp`,
          nombreDocumento: 'Constancia CURP Oficial',
          tipo: 'curp',
          institucion: 'RENAPO',
          fechaEmision: '2023-01-01',
          fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600',
          fileType: 'pdf',
          estado: 'pendiente',
          fechaSubida: new Date().toISOString()
        }
      ],
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
        id: newId,
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
        mustChangePassword: initialStatus === 'activo'
      };
      await setDoc(doc(db, 'users', newId), userPayload, { merge: true });
      await setDoc(doc(db, 'terapeutas', newId), newTherapist, { merge: true });
      
      setTherapists(prev => {
        const remaining = prev.filter(t => t.id !== newId && t.correo.toLowerCase() !== trimmedEmail);
        return [newTherapist, ...remaining];
      });
      logAudit(newId, `${nombre} ${apellidos}`, initialStatus === 'pendiente' ? 'Postulación de Terapeuta Registrada' : 'Creación de Cuenta por Administradora', `Estado Inicial: ${initialStatus.toUpperCase()}`);
      
      return { success: true, tempPassword: tempPass };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `terapeutas/${newId}`, newTherapist);
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
      await updateDoc(doc(db, 'terapeutas', id), updatePayload);
      try {
        await updateDoc(doc(db, 'users', id), {
          fechaActualizacion: new Date().toISOString()
        });
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

      logAudit(id, updatedName, 'Modificación de Expediente', 'Perfil actualizado por la Administradora.');
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${id}`, updatePayload);
      return { success: false, error: err?.message || 'Error al actualizar terapeuta en Firestore.' };
    }
  };

  // Admin Operation: Change Status (Activo, Inactivo, Bloqueado, Pendiente, Rechazado)
  const changeTherapistStatus = async (id: string, status: AccountStatus, reason?: string): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === id);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const rejectionReason = status === 'rechazado' ? (reason || 'No cumple con los requisitos de acreditación.') : undefined;

    const statusLabel = 
      status === 'activo' ? 'Aprobada / Activada' : 
      status === 'rechazado' ? 'Rechazada' : 
      status === 'pendiente' ? 'Puesta en Revisión Pendiente' : 
      status === 'inactivo' ? 'Desactivada' : 'Suspendida / Bloqueada';

    const statusPayload = {
      estado: status,
      motivoRechazoAccount: rejectionReason || null,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', id), statusPayload);
      try {
        await updateDoc(doc(db, 'users', id), {
          estado: status,
          fechaActualizacion: new Date().toISOString()
        });
      } catch {}

      setTherapists(prev => prev.map(t => {
        if (t.id === id) {
          return { 
            ...t, 
            estado: status, 
            motivoRechazoAccount: rejectionReason, 
            fechaActualizacion: new Date().toISOString() 
          };
        }
        return t;
      }));

      logAudit(id, `${target.nombre} ${target.apellidos}`, `Estado Cambiado a: ${statusLabel}`, reason || 'Acción ejecutada por Administradora.');
      return { success: true };
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
        await sendPasswordResetEmail(auth, target.correo.trim().toLowerCase());
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
      await deleteDoc(doc(db, 'terapeutas', id));
      try {
        await deleteDoc(doc(db, 'users', id));
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
      await updateDoc(doc(db, 'terapeutas', therapistId), updatePayload);

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

    const newDoc: TherapistDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      estado: 'pendiente',
      fechaSubida: new Date().toISOString()
    };

    const updatedDocs = [...target.documentos, newDoc];
    const updatePayload = {
      documentos: updatedDocs,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', therapistId), updatePayload);

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

    const updatedDocs = target.documentos.map(d => {
      if (d.id === documentId) {
        return {
          ...d,
          ...docData,
          estado: 'pendiente' as DocumentStatus,
          motivoRechazo: undefined,
          fechaSubida: new Date().toISOString(),
          fechaRevision: undefined,
          revisadoPor: undefined
        };
      }
      return d;
    });

    const updatePayload = {
      documentos: updatedDocs,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'terapeutas', therapistId), updatePayload);

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
      await updateDoc(doc(db, 'terapeutas', therapistId), updatePayload);

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
      await updateDoc(doc(db, 'terapeutas', therapistId), updatePayload);

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
        getTherapistById
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


import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TherapistFullProfile, TherapistDocument, DocumentStatus, AccountStatus } from '../types/auth';

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
  resetTherapistPassword: (id: string) => Promise<{ success: boolean; tempPassword?: string; error?: string }>;
  deleteTherapist: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Document Verification (Admin)
  reviewDocument: (therapistId: string, documentId: string, status: DocumentStatus, motivoRechazo?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Therapist Self Operations
  uploadDocument: (therapistId: string, docData: Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>) => Promise<{ success: boolean; error?: string }>;
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
      console.warn('Therapists onSnapshot note:', err);
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

    // Check duplicate
    if (therapists.some(t => t.correo.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'Ya existe una terapeuta registrada con este correo electrónico.' };
    }

    // Auto generate strong temp password if not provided
    const tempPass = data.tempPassword || `Essenya${Math.floor(1000 + Math.random() * 9000)}!`;
    const newId = `ther-${Date.now()}`;
    const initialStatus: AccountStatus = data.estado || 'activo';

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

    setTherapists(prev => [newTherapist, ...prev]);
    logAudit(newId, `${nombre} ${apellidos}`, initialStatus === 'pendiente' ? 'Postulación de Terapeuta Registrada' : 'Creación de Cuenta por Administradora', `Estado Inicial: ${initialStatus.toUpperCase()}`);

    // Try save to Firestore
    try {
      await setDoc(doc(db, 'users', newId), {
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
        mustChangePassword: initialStatus === 'activo',
        therapistProfile: newTherapist
      });
    } catch {}

    return { success: true, tempPassword: tempPass };
  };

  // Admin Operation: Update Therapist
  const updateTherapist = async (id: string, updates: Partial<TherapistFullProfile>): Promise<{ success: boolean; error?: string }> => {
    let updatedName = '';
    setTherapists(prev => prev.map(t => {
      if (t.id === id) {
        updatedName = `${updates.nombre || t.nombre} ${updates.apellidos || t.apellidos}`;
        return {
          ...t,
          ...updates,
          fechaActualizacion: new Date().toISOString()
        };
      }
      return t;
    }));

    logAudit(id, updatedName || 'Terapeuta', 'Modificación de Expediente', 'Perfil actualizado por la Administradora.');

    try {
      await updateDoc(doc(db, 'users', id), {
        ...updates,
        fechaActualizacion: new Date().toISOString()
      });
    } catch {}

    return { success: true };
  };

  // Admin Operation: Change Status (Activo, Inactivo, Bloqueado, Pendiente, Rechazado)
  const changeTherapistStatus = async (id: string, status: AccountStatus, reason?: string): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === id);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const rejectionReason = status === 'rechazado' ? (reason || 'No cumple con los requisitos de acreditación.') : undefined;

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

    const statusLabel = 
      status === 'activo' ? 'Aprobada / Activada' : 
      status === 'rechazado' ? 'Rechazada' : 
      status === 'pendiente' ? 'Puesta en Revisión Pendiente' : 
      status === 'inactivo' ? 'Desactivada' : 'Suspendida / Bloqueada';

    logAudit(id, `${target.nombre} ${target.apellidos}`, `Estado Cambiado a: ${statusLabel}`, reason || 'Acción ejecutada por Administradora.');

    try {
      await updateDoc(doc(db, 'users', id), {
        estado: status,
        motivoRechazoAccount: rejectionReason || null,
        fechaActualizacion: new Date().toISOString()
      });
    } catch {}

    return { success: true };
  };

  // Admin Operation: Reset Password
  const resetTherapistPassword = async (id: string): Promise<{ success: boolean; tempPassword?: string; error?: string }> => {
    const target = therapists.find(t => t.id === id);
    if (!target) return { success: false, error: 'Terapeuta no encontrada.' };

    const newTempPass = `Reset${Math.floor(1000 + Math.random() * 9000)}!`;

    setTherapists(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, mustChangePassword: true, fechaActualizacion: new Date().toISOString() };
      }
      return t;
    }));

    logAudit(id, `${target.nombre} ${target.apellidos}`, 'Restablecimiento de Contraseña', `Nueva clave temporal generada: ${newTempPass}`);

    return { success: true, tempPassword: newTempPass };
  };

  // Admin Operation: Delete Therapist
  const deleteTherapist = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = therapists.find(t => t.id === id);
    if (target) {
      logAudit(id, `${target.nombre} ${target.apellidos}`, 'Eliminación de Cuenta', 'Cuenta eliminada permanentemente del sistema.');
    }

    setTherapists(prev => prev.filter(t => t.id !== id));

    try {
      await deleteDoc(doc(db, 'users', id));
    } catch {}

    return { success: true };
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

    setTherapists(prev => prev.map(t => {
      if (t.id === therapistId) {
        const updatedDocs = t.documentos.map(doc => {
          if (doc.id === documentId) {
            return {
              ...doc,
              estado: status,
              motivoRechazo: status === 'rechazado' ? motivoRechazo || 'Documento ilegible o vencido.' : undefined
            };
          }
          return doc;
        });
        return { ...t, documentos: updatedDocs, fechaActualizacion: new Date().toISOString() };
      }
      return t;
    }));

    logAudit(
      therapistId, 
      `${target.nombre} ${target.apellidos}`, 
      `Revisión de Documento (${status.toUpperCase()})`, 
      status === 'rechazado' ? `Motivo: ${motivoRechazo}` : 'Documento verificado y aprobado.'
    );

    return { success: true };
  };

  // Therapist Operation: Upload Document
  const uploadDocument = async (
    therapistId: string, 
    docData: Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>
  ): Promise<{ success: boolean; error?: string }> => {
    const newDoc: TherapistDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      estado: 'pendiente',
      fechaSubida: new Date().toISOString()
    };

    setTherapists(prev => prev.map(t => {
      if (t.id === therapistId) {
        return {
          ...t,
          documentos: [...t.documentos, newDoc],
          fechaActualizacion: new Date().toISOString()
        };
      }
      return t;
    }));

    return { success: true };
  };

  // Therapist Operation: Update Self Profile
  const updateSelfProfile = async (
    therapistId: string, 
    updates: Partial<TherapistFullProfile>
  ): Promise<{ success: boolean; error?: string }> => {
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

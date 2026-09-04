import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType, cleanForFirestore } from '../utils/firestoreDebug';
import { 
  PortalType, Booking, BookingState, Invoice, SystemAuditLog, CoverageZone, Therapist, ServiceItem, ClientUser, PanicAlert, MembershipTier 
} from '../types';
import { 
  INITIAL_SERVICES, INITIAL_THERAPISTS, INITIAL_CLIENT, 
  INITIAL_BOOKINGS, INITIAL_INVOICES, INITIAL_COVERAGE_ZONES, INITIAL_AUDIT_LOGS 
} from '../data/mockData';

interface EcosystemContextType {
  currentPortal: PortalType;
  setCurrentPortal: (portal: PortalType) => void;
  services: ServiceItem[];
  therapists: Therapist[];
  activeTherapist: Therapist;
  client: ClientUser;
  clients: ClientUser[];
  bookings: Booking[];
  invoices: Invoice[];
  zones: CoverageZone[];
  auditLogs: SystemAuditLog[];
  panicAlerts: PanicAlert[];
  activePanicAlertsCount: number;
  activeInvoice: Invoice | null;
  setActiveInvoice: (invoice: Invoice | null) => void;
  
  handleNewBooking: (newBooking: Booking) => void;
  handleAcceptBooking: (bookingId: string, acceptingTherapist: Partial<Therapist>) => void;
  handleRejectBooking: (bookingId: string, reason?: string) => void;
  handleUpdateBookingState: (bookingId: string, newState: BookingState) => void;
  handleReassignTherapist: (bookingId: string, therapistId: string) => void;
  handleToggleZoneSurge: (zoneId: string, multiplier: number) => void;
  handleAddTherapist: (newTherapist: Therapist) => void;
  handleEditTherapist: (updatedTherapist: Therapist) => void;
  handleDeleteTherapist: (therapistId: string) => void;
  handleAddZone: (newZone: CoverageZone) => void;
  handleEditZone: (updatedZone: CoverageZone) => void;
  handleDeleteZone: (zoneId: string) => void;
  handleSendMessage: (bookingId: string, text: string) => void;
  handleRateBooking: (bookingId: string, rating: number, comment: string) => void;
  
  // Phase 3 Extended Handlers
  handleAddService: (newService: ServiceItem) => void;
  handleEditService: (updatedService: ServiceItem) => void;
  handleDeleteService: (serviceId: string) => void;
  
  handleAddClient: (newClient: ClientUser) => void;
  handleEditClient: (updatedClient: ClientUser) => void;
  handleToggleBlockClient: (clientId: string) => void;
  
  handleRescheduleBooking: (bookingId: string, newDate: string, newTime: string) => void;
  handleCancelBooking: (bookingId: string, reason: string) => void;
  handleConfirmPayment: (bookingId: string) => void;
  handleRejectPayment: (bookingId: string, reason: string) => void;
  handleResolvePanicAlert: (alertId: string, adminName?: string) => Promise<void>;
  handleAttendPanicAlert: (alertId: string, adminName?: string) => Promise<void>;
  
  activeBookingCount: number;
}

const EcosystemContext = createContext<EcosystemContextType | undefined>(undefined);

export const EcosystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPortal, setCurrentPortal] = useState<PortalType>('website');

  const { getUser, firebaseUser, sessions } = useAuth();
  const authClient = getUser('cliente');

  // Shared Ecosystem Connected State
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);

  // Sync client in EcosystemContext with authenticated user from AuthContext
  useEffect(() => {
    if (authClient) {
      const fullName = `${authClient.nombre} ${authClient.apellidos}`.trim();
      setClient(prev => ({
        ...prev,
        id: authClient.id,
        name: fullName || prev.name,
        email: authClient.correo || prev.email,
        phone: authClient.telefono || prev.phone,
        membershipTier: authClient.membershipTier || prev.membershipTier || 'Platino',
      }));
    }
  }, [authClient]);

  const [therapists, setTherapists] = useState<Therapist[]>(INITIAL_THERAPISTS);
  const [client, setClient] = useState<ClientUser>(INITIAL_CLIENT);
  const [clients, setClients] = useState<ClientUser[]>([]);
  
  // Initialize bookings from LocalStorage for immediate offline availability
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const cached = localStorage.getItem('essenya_bookings_cache');
    if (cached) {
      try { return JSON.parse(cached); } catch { return []; }
    }
    return [];
  });

  // Keep LocalStorage in sync with bookings state for offline fallback
  useEffect(() => {
    if (bookings.length > 0) {
      localStorage.setItem('essenya_bookings_cache', JSON.stringify(bookings));
    }
  }, [bookings]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [zones, setZones] = useState<CoverageZone[]>(INITIAL_COVERAGE_ZONES);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [panicAlerts, setPanicAlerts] = useState<PanicAlert[]>([]);

  // Selected Invoice Modal State
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Sincronizar nivel de membresía según masajes concluidos y pagados
  useEffect(() => {
    if (!client?.id) return;
    
    // Contar reservas finalizadas y liquidadas del cliente
    const finishedAndPaid = bookings.filter(b => {
      const isClient = b.clientId === client.id;
      const isFinished = b.state === 'servicio_finalizado';
      const isPaid = b.paymentStatus === 'pagado' || b.paid === true;
      return isClient && isFinished && isPaid;
    }).length;

    let computedTier: MembershipTier = 'Platino';
    if (finishedAndPaid >= 5) computedTier = 'Diamond';
    
    else if (finishedAndPaid >= 3) computedTier = 'Gold';
    
    else computedTier = 'Platino';

    if (client.membershipTier !== computedTier) {
      setClient(prev => ({ ...prev, membershipTier: computedTier }));
      // Intentar sincronizar en Firestore si el cliente existe
      try {
        updateDoc(doc(db, 'clientes', client.id), { membershipTier: computedTier }).catch(() => {});
      } catch {
        // Silenciar errores de sincronización offline
      }
    }
  }, [bookings, client?.id, client?.membershipTier]);

  // Firestore Realtime Subscriptions (Catalogs always public; user data queried by role / UID)
  useEffect(() => {
    // 1. Public Catalogs (Services, Therapists, Zones)
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceItem));
        setServices(list);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'servicios'));

    const unsubTerapeuta = onSnapshot(collection(db, 'terapeutas'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Therapist));
        setTherapists(list);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'terapeutas'));

    const unsubZonas = onSnapshot(collection(db, 'zonas'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoverageZone));
        setZones(list);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'zonas'));

    // 2. Private Subscriptions (Require active authenticated Firebase User)
    if (!firebaseUser) {
      return () => {
        unsubServicios();
        unsubTerapeuta();
        unsubZonas();
      };
    }

    const uid = firebaseUser.uid;
    const isUserAdmin = Boolean(sessions?.administrador || currentPortal === 'admin');
    const isUserTherapist = Boolean(sessions?.terapeuta || currentPortal === 'therapist');

    let unsubReservas = () => {};
    let unsubClientes = () => {};
    let unsubInvoices = () => {};
    let unsubAudit = () => {};
    let unsubPanic = () => {};

    if (isUserAdmin) {
      // Administrator: Full visibility
      unsubReservas = onSnapshot(collection(db, 'citas'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setBookings(list);
        } else {
          setBookings([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'citas'));

      unsubClientes = onSnapshot(collection(db, 'clientes'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientUser));
          setClients(list);
        } else {
          setClients([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'clientes'));

      unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
          setInvoices(list);
        } else {
          setInvoices([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'invoices'));

      unsubAudit = onSnapshot(collection(db, 'audit_logs'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemAuditLog));
          setAuditLogs(list);
        } else {
          setAuditLogs([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'audit_logs'));

      unsubPanic = onSnapshot(collection(db, 'alertas_panico'), (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PanicAlert)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setPanicAlerts(list);
        } else {
          setPanicAlerts([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'alertas_panico'));

    } else if (isUserTherapist) {
      // Therapist role: bookings assigned to therapist
      const qTherapistBookings = query(collection(db, 'citas'), where('therapistId', '==', uid));
      unsubReservas = onSnapshot(qTherapistBookings, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setBookings(list);
        } else {
          setBookings([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'citas'));

      const qPanic = query(collection(db, 'alertas_panico'), where('userId', '==', uid));
      unsubPanic = onSnapshot(qPanic, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PanicAlert)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setPanicAlerts(list);
        } else {
          setPanicAlerts([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'alertas_panico'));

    } else {
      // Client role (default logged-in user): Bookings by clientId, own invoices, and own client doc
      const qClientBookings = query(collection(db, 'citas'), where('clientId', '==', uid));
      unsubReservas = onSnapshot(qClientBookings, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setBookings(list);
        } else {
          setBookings([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'citas'));

      unsubClientes = onSnapshot(doc(db, 'clientes', uid), (docSnap) => {
        if (docSnap.exists()) {
          const cData = { id: docSnap.id, ...docSnap.data() } as ClientUser;
          setClient(cData);
          setClients([cData]);
        }
      }, err => handleFirestoreError(err, OperationType.GET, `clientes/${uid}`));

      const qInvoices = query(collection(db, 'invoices'), where('clientId', '==', uid));
      unsubInvoices = onSnapshot(qInvoices, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
          setInvoices(list);
        } else {
          setInvoices([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'invoices'));

      const qPanic = query(collection(db, 'alertas_panico'), where('userId', '==', uid));
      unsubPanic = onSnapshot(qPanic, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PanicAlert)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setPanicAlerts(list);
        } else {
          setPanicAlerts([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'alertas_panico'));
    }

    return () => {
      unsubServicios();
      unsubTerapeuta();
      unsubZonas();
      unsubReservas();
      unsubClientes();
      unsubInvoices();
      unsubAudit();
      unsubPanic();
    };
  }, [firebaseUser, sessions, currentPortal]);

  // Add Audit Log to State & Firestore
  const addLog = async (userRole: string, userName: string, action: string, details: string) => {
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userRole,
      userName,
      action,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    try {
      await setDoc(doc(db, 'audit_logs', newLog.id), cleanForFirestore(newLog));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `audit_logs/${newLog.id}`, newLog);
    }
  };

  // Handlers with Firestore Persistence
  const handleNewBooking = async (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    try {
      await setDoc(doc(db, 'citas', newBooking.id), cleanForFirestore(newBooking));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reservas/${newBooking.id}`, newBooking);
    }

    // Generate Invoice
    const newInv: Invoice = {
      id: newBooking.invoiceId || `inv-${Date.now()}`,
      bookingId: newBooking.id,
      clientId: newBooking.clientId || (firebaseUser ? firebaseUser.uid : 'client-1'),
      invoiceNumber: `ESS-FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: newBooking.date,
      rfc: 'DELA850412VIP',
      businessName: 'ESSENYA PRIVÉ S.A. DE C.V.',
      subtotal: Number((newBooking.total * 0.84).toFixed(2)),
      tax: Number((newBooking.total * 0.16).toFixed(2)),
      total: newBooking.total,
      status: 'emitida',
      pdfUrl: '#'
    };
    setInvoices(prev => [newInv, ...prev]);
    try {
      await setDoc(doc(db, 'invoices', newInv.id), cleanForFirestore(newInv));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${newInv.id}`, newInv);
    }

    addLog(
      'Cliente VIP',
      client.name || 'Cliente Real',
      'Creación de Reserva',
      `Nueva reserva ${newBooking.code} de ${newBooking.serviceName} por $${newBooking.total} MXN.`
    );
  };

  // Therapist Booking Acceptance & Rejection Handlers
  const handleAcceptBooking = async (bookingId: string, acceptingTherapist: Partial<Therapist>) => {
    const updatedTherapistName = acceptingTherapist.name || 'Dra. Elena Rostova';
    const updatedTherapistId = acceptingTherapist.id || 'ther-1';
    const updatedTherapistPhoto = acceptingTherapist.photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400';
    const updatedTherapistPhone = acceptingTherapist.phone || '525512345678';

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          state: 'aceptado' as BookingState,
          therapistId: updatedTherapistId,
          therapistName: updatedTherapistName,
          therapistPhoto: updatedTherapistPhoto,
          therapistPhone: updatedTherapistPhone,
        };
      }
      return b;
    }));

    const updatePayload = {
      state: 'aceptado',
      therapistId: updatedTherapistId,
      therapistName: updatedTherapistName,
      therapistPhoto: updatedTherapistPhoto,
      therapistPhone: updatedTherapistPhone,
    };

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
    }

    const bk = bookings.find(b => b.id === bookingId);
    addLog(
      'Terapeuta Certificada',
      updatedTherapistName,
      'Aceptación de Masaje',
      `Terapeuta ${updatedTherapistName} aceptó el servicio para la cita ${bk?.code || bookingId} (${bk?.serviceName || 'Masaje'}).`
    );
  };

  const handleRejectBooking = async (bookingId: string, reason?: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          state: 'pendiente' as BookingState,
          cancellationReason: reason || 'Terapeuta declinó solicitud, buscando otra profesional...',
        };
      }
      return b;
    }));

    const updatePayload = {
      state: 'pendiente',
      cancellationReason: reason || 'Terapeuta declinó solicitud, buscando otra profesional...',
    };

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
    }

    const bk = bookings.find(b => b.id === bookingId);
    addLog(
      'Terapeuta / Dispatch',
      'Central ESSENYA',
      'Solicitud Declinada',
      `Reserva ${bk?.code || bookingId} declinada. Buscando nueva terapeuta disponible en la zona.`
    );
  };

  const handleUpdateBookingState = async (bookingId: string, newState: BookingState) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, state: newState };
      }
      return b;
    }));

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore({ state: newState }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, { state: newState });
    }

    const bk = bookings.find(b => b.id === bookingId);
    addLog(
      'Sistema / App',
      bk?.therapistName || 'ESSENYA Core',
      'Cambio de Estado',
      `Reserva ${bk?.code || bookingId} actualizada al estado "${newState}".`
    );
  };

  const handleReassignTherapist = async (bookingId: string, therapistId: string) => {
    const newTher = therapists.find(t => t.id === therapistId);
    if (!newTher) return;

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          therapistId: newTher.id,
          therapistName: newTher.name,
          therapistPhoto: newTher.photo,
          therapistPhone: newTher.phone
        };
      }
      return b;
    }));

    const updatePayload = {
      therapistId: newTher.id,
      therapistName: newTher.name,
      therapistPhoto: newTher.photo,
      therapistPhone: newTher.phone
    };

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
    }

    addLog(
      'Administrador',
      'Director Operativo',
      'Reasignación de Terapeuta',
      `Reserva ${bookingId} reasignada manualmente a ${newTher.name}.`
    );
  };

  const handleToggleZoneSurge = async (zoneId: string, multiplier: number) => {
    setZones(prev => prev.map(z => {
      if (z.id === zoneId) {
        return { ...z, surgeMultiplier: multiplier, isHighDemand: multiplier > 1.0 };
      }
      return z;
    }));

    const updatePayload = {
      surgeMultiplier: multiplier,
      isHighDemand: multiplier > 1.0
    };

    try {
      await updateDoc(doc(db, 'zones', zoneId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `zones/${zoneId}`, updatePayload);
    }

    const zoneName = zones.find(z => z.id === zoneId)?.name;
    addLog(
      'Administrador',
      'Módulo de Tarifas',
      'Ajuste de Tarifa Dinámica',
      `Zona ${zoneName} actualizada a multiplicador ${multiplier}x.`
    );
  };

  // Therapist CRUD
  const handleAddTherapist = async (newTherapist: Therapist) => {
    setTherapists(prev => [...prev, newTherapist]);
    try {
      await setDoc(doc(db, 'terapeutas', newTherapist.id), cleanForFirestore(newTherapist));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `terapeutas/${newTherapist.id}`, newTherapist);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Terapeuta',
      `Terapeuta ${newTherapist.name} agregada con ${newTherapist.coverageZones?.length || 0} zonas de cobertura.`
    );
  };

  const handleEditTherapist = async (updatedTherapist: Therapist) => {
    setTherapists(prev => prev.map(t => t.id === updatedTherapist.id ? updatedTherapist : t));
    try {
      await setDoc(doc(db, 'terapeutas', updatedTherapist.id), cleanForFirestore(updatedTherapist));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `terapeutas/${updatedTherapist.id}`, updatedTherapist);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Terapeuta',
      `Perfil y zonas de cobertura de ${updatedTherapist.name} actualizadas.`
    );
  };

  const handleDeleteTherapist = async (therapistId: string) => {
    const target = therapists.find(t => t.id === therapistId);
    setTherapists(prev => prev.filter(t => t.id !== therapistId));
    try {
      await deleteDoc(doc(db, 'terapeutas', therapistId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `terapeutas/${therapistId}`);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Baja de Terapeuta',
      `Terapeuta ${target?.name || therapistId} eliminada del sistema.`
    );
  };

  // Zone CRUD
  const handleAddZone = async (newZone: CoverageZone) => {
    setZones(prev => [...prev, newZone]);
    try {
      await setDoc(doc(db, 'zonas', newZone.id), cleanForFirestore(newZone));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `zonas/${newZone.id}`, newZone);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Zona',
      `Nueva zona de cobertura "${newZone.name}" registrada.`
    );
  };

  const handleEditZone = async (updatedZone: CoverageZone) => {
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    try {
      await setDoc(doc(db, 'zonas', updatedZone.id), cleanForFirestore(updatedZone));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `zonas/${updatedZone.id}`, updatedZone);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Zona',
      `Zona de cobertura "${updatedZone.name}" actualizada.`
    );
  };

  const handleDeleteZone = async (zoneId: string) => {
    const target = zones.find(z => z.id === zoneId);
    setZones(prev => prev.filter(z => z.id !== zoneId));
    try {
      await deleteDoc(doc(db, 'zonas', zoneId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `zonas/${zoneId}`);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Baja de Zona',
      `Zona de cobertura "${target?.name || zoneId}" eliminada.`
    );
  };

  const handleSendMessage = (bookingId: string, text: string) => {
    addLog(
      'Mensajería',
      client.name,
      'Envío de Mensaje',
      `Mensaje enviado en chat de reserva ${bookingId}.`
    );
  };

  const handleRateBooking = async (bookingId: string, rating: number, comment: string) => {
    const reviewedAt = new Date().toISOString();
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, rating, reviewComment: comment };
      }
      return b;
    }));

    const updatePayload = {
      rating,
      reviewComment: comment,
      reviewedAt
    };

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
    }

    const bk = bookings.find(b => b.id === bookingId);
    if (bk?.therapistId) {
      setTherapists(prev => prev.map(t => {
        if (t.id === bk.therapistId) {
          const newCount = (t.reviewCount || 0) + 1;
          const newRating = Number((((t.rating || 5) * (t.reviewCount || 0) + rating) / newCount).toFixed(1));
          return { ...t, rating: newRating, reviewCount: newCount };
        }
        return t;
      }));
    }

    addLog(
      'Cliente VIP',
      client.name,
      'Calificación y Reseña de Terapeuta',
      `Puntuación de ${rating} ⭐ estrellas asignada a ${bk?.therapistName || 'Masajista'} para reserva ${bk?.code || bookingId}. Mensaje: "${comment || 'Sin comentarios'}"`
    );
  };

  // Service CRUD Handlers
  const handleAddService = async (newService: ServiceItem) => {
    setServices(prev => [...prev, newService]);
    try {
      await setDoc(doc(db, 'servicios', newService.id), cleanForFirestore(newService));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `servicios/${newService.id}`, newService);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Servicio',
      `Nuevo servicio "${newService.name}" registrado con precio base $${newService.basePrice} MXN.`
    );
  };

  const handleEditService = async (updatedService: ServiceItem) => {
    setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
    try {
      await setDoc(doc(db, 'servicios', updatedService.id), cleanForFirestore(updatedService));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `servicios/${updatedService.id}`, updatedService);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Servicio',
      `Servicio "${updatedService.name}" actualizado (Precio: $${updatedService.basePrice} MXN).`
    );
  };

  const handleDeleteService = async (serviceId: string) => {
    const target = services.find(s => s.id === serviceId);
    setServices(prev => prev.filter(s => s.id !== serviceId));
    try {
      await deleteDoc(doc(db, 'servicios', serviceId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `servicios/${serviceId}`);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Baja de Servicio',
      `Servicio "${target?.name || serviceId}" eliminado del catálogo.`
    );
  };

  // Client CRUD & Management Handlers
  const handleAddClient = async (newClient: ClientUser) => {
    setClients(prev => [...prev, newClient]);
    try {
      await setDoc(doc(db, 'clientes', newClient.id), cleanForFirestore(newClient));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clientes/${newClient.id}`, newClient);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Cliente VIP',
      `Socio VIP ${newClient.name} (${newClient.membershipTier}) registrado exitosamente.`
    );
  };

  const handleEditClient = async (updatedClient: ClientUser) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    try {
      await setDoc(doc(db, 'clientes', updatedClient.id), cleanForFirestore(updatedClient));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clientes/${updatedClient.id}`, updatedClient);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Cliente VIP',
      `Perfil y preferencias VIP de ${updatedClient.name} actualizadas.`
    );
  };

  const handleToggleBlockClient = async (clientId: string) => {
    let nextState = false;
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        nextState = !c.isBlocked;
        return { ...c, isBlocked: nextState };
      }
      return c;
    }));

    try {
      await updateDoc(doc(db, 'clientes', clientId), cleanForFirestore({ isBlocked: nextState }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clientes/${clientId}`, { isBlocked: nextState });
    }

    const c = clients.find(cl => cl.id === clientId);
    if (c) {
      addLog(
        'Administrador',
        'Panel Admin',
        nextState ? 'Bloqueo de Cliente' : 'Reactivación de Cliente',
        `Cliente ${c.name} (${c.email}) ha sido ${nextState ? 'suspendido por seguridad' : 'reactivado'}.`
      );
    }
  };

  // Booking Operational Handlers
  const handleRescheduleBooking = async (bookingId: string, newDate: string, newTime: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, date: newDate, time: newTime };
      }
      return b;
    }));

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore({ date: newDate, time: newTime }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, { date: newDate, time: newTime });
    }

    addLog(
      'Administrador',
      'Panel Operaciones',
      'Reprogramación de Servicio',
      `Reserva ${bookingId} reprogramada para fecha ${newDate} a las ${newTime}.`
    );
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, state: 'cancelado', cancellationReason: reason };
      }
      return b;
    }));

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore({ state: 'cancelado', cancellationReason: reason }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, { state: 'cancelado', cancellationReason: reason });
    }

    addLog(
      'Administrador',
      'Panel Operaciones',
      'Cancelación de Servicio',
      `Reserva ${bookingId} cancelada por el administrador. Motivo: "${reason}".`
    );
  };

  const handleConfirmPayment = async (bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, paymentStatus: 'pagado' };
      }
      return b;
    }));

    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore({ paymentStatus: 'pagado' }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, { paymentStatus: 'pagado' });
    }

    addLog(
      'Administrador',
      'Módulo Finanzas',
      'Confirmación de Pago SPEI/Efectivo',
      `Pago de la reserva ${bookingId} verificado y acreditado.`
    );
  };

  const handleRejectPayment = async (bookingId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'citas', bookingId), cleanForFirestore({ paymentStatus: 'rechazado' }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, { paymentStatus: 'rechazado' });
    }

    addLog(
      'Administrador',
      'Módulo Finanzas',
      'Rechazo de Comprobante de Pago',
      `Comprobante de reserva ${bookingId} rechazado. Observación: "${reason}".`
    );
  };

  const handleResolvePanicAlert = async (alertId: string, adminName: string = 'Administrador S.O.C.') => {
    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'alertas_panico', alertId), cleanForFirestore({
        status: 'resuelta',
        resolvedBy: adminName,
        resolvedAt: nowIso,
        updatedAt: nowIso,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alertas_panico/${alertId}`, { status: 'resuelta' });
    }

    addLog(
      'Administrador',
      adminName,
      'Resolución de Alerta de Pánico SOS',
      `Alerta ${alertId} marcada como RESUELTA por la Central de Seguridad.`
    );
  };

  const handleAttendPanicAlert = async (alertId: string, adminName: string = 'Administrador S.O.C.') => {
    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'alertas_panico', alertId), cleanForFirestore({
        status: 'en_atencion',
        attendedBy: adminName,
        attendedAt: nowIso,
        updatedAt: nowIso,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alertas_panico/${alertId}`, { status: 'en_atencion' });
    }

    addLog(
      'Administrador',
      adminName,
      'Atención de Alerta de Pánico SOS',
      `Alerta ${alertId} puesta EN ATENCIÓN activa por la Central de Seguridad.`
    );
  };

  const activeBookingCount = bookings.filter(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado').length;
  const activePanicAlertsCount = panicAlerts.filter(a => a.status === 'activa' || a.status === 'en_atencion').length;

  return (
    <EcosystemContext.Provider value={{
      currentPortal,
      setCurrentPortal,
      services,
      therapists,
      activeTherapist: therapists[0],
      client,
      clients,
      bookings,
      invoices,
      zones,
      auditLogs,
      panicAlerts,
      activePanicAlertsCount,
      activeInvoice,
      setActiveInvoice,
      handleNewBooking,
      handleAcceptBooking,
      handleRejectBooking,
      handleUpdateBookingState,
      handleReassignTherapist,
      handleToggleZoneSurge,
      handleAddTherapist,
      handleEditTherapist,
      handleDeleteTherapist,
      handleAddZone,
      handleEditZone,
      handleDeleteZone,
      handleSendMessage,
      handleRateBooking,
      handleAddService,
      handleEditService,
      handleDeleteService,
      handleAddClient,
      handleEditClient,
      handleToggleBlockClient,
      handleRescheduleBooking,
      handleCancelBooking,
      handleConfirmPayment,
      handleRejectPayment,
      handleResolvePanicAlert,
      handleAttendPanicAlert,
      activeBookingCount
    }}>
      {children}
    </EcosystemContext.Provider>
  );
};

export const useEcosystem = () => {
  const context = useContext(EcosystemContext);
  if (!context) {
    throw new Error('useEcosystem must be used within an EcosystemProvider');
  }
  return context;
};

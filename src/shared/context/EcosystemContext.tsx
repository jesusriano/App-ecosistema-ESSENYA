import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import { 
  PortalType, Booking, BookingState, Invoice, SystemAuditLog, CoverageZone, Therapist, ServiceItem, ClientUser 
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
  
  activeBookingCount: number;
}

const EcosystemContext = createContext<EcosystemContextType | undefined>(undefined);

export const EcosystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPortal, setCurrentPortal] = useState<PortalType>('website');

  const { getUser } = useAuth();
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
      }));
    }
  }, [authClient]);
  const [therapists, setTherapists] = useState<Therapist[]>(INITIAL_THERAPISTS);
  const [client, setClient] = useState<ClientUser>(INITIAL_CLIENT);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [zones, setZones] = useState<CoverageZone[]>(INITIAL_COVERAGE_ZONES);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);

  // Selected Invoice Modal State
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Firestore Realtime Subscriptions
  useEffect(() => {
    const unsubReservas = onSnapshot(collection(db, 'reservas'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setBookings(list);
      } else {
        setBookings([]);
      }
    }, err => console.warn('reservas sub note:', err));

    const unsubClientes = onSnapshot(collection(db, 'clientes'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientUser));
        setClients(list);
      } else {
        setClients([]);
      }
    }, err => console.warn('clientes sub note:', err));

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
        setInvoices(list);
      } else {
        setInvoices([]);
      }
    }, err => console.warn('invoices sub note:', err));

    const unsubAudit = onSnapshot(collection(db, 'audit_logs'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemAuditLog));
        setAuditLogs(list);
      } else {
        setAuditLogs([]);
      }
    }, err => console.warn('audit sub note:', err));

    return () => {
      unsubReservas();
      unsubClientes();
      unsubInvoices();
      unsubAudit();
    };
  }, []);

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
      await setDoc(doc(db, 'audit_logs', newLog.id), newLog);
    } catch {}
  };

  // Handlers with Firestore Persistence
  const handleNewBooking = async (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    try {
      await setDoc(doc(db, 'reservas', newBooking.id), newBooking);
    } catch (err) {
      console.warn('Error saving booking to Firestore:', err);
    }

    // Generate Invoice
    const newInv: Invoice = {
      id: newBooking.invoiceId || `inv-${Date.now()}`,
      bookingId: newBooking.id,
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
      await setDoc(doc(db, 'invoices', newInv.id), newInv);
    } catch (err) {
      console.warn('Error saving invoice to Firestore:', err);
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

    try {
      await updateDoc(doc(db, 'reservas', bookingId), {
        state: 'aceptado',
        therapistId: updatedTherapistId,
        therapistName: updatedTherapistName,
        therapistPhoto: updatedTherapistPhoto,
        therapistPhone: updatedTherapistPhone,
      });
    } catch (err) {
      console.warn('Error updating accepted booking in Firestore:', err);
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

    try {
      await updateDoc(doc(db, 'reservas', bookingId), {
        cancellationReason: reason || 'Terapeuta declinó solicitud, buscando otra profesional...',
      });
    } catch (err) {
      console.warn('Error updating declined booking in Firestore:', err);
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
      await updateDoc(doc(db, 'reservas', bookingId), { state: newState });
    } catch {}

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

    try {
      await updateDoc(doc(db, 'reservas', bookingId), {
        therapistId: newTher.id,
        therapistName: newTher.name,
        therapistPhoto: newTher.photo,
        therapistPhone: newTher.phone
      });
    } catch {}

    addLog(
      'Administrador',
      'Director Operativo',
      'Reasignación de Terapeuta',
      `Reserva ${bookingId} reasignada manualmente a ${newTher.name}.`
    );
  };

  const handleToggleZoneSurge = (zoneId: string, multiplier: number) => {
    setZones(prev => prev.map(z => {
      if (z.id === zoneId) {
        return { ...z, surgeMultiplier: multiplier, isHighDemand: multiplier > 1.0 };
      }
      return z;
    }));

    const zoneName = zones.find(z => z.id === zoneId)?.name;
    addLog(
      'Administrador',
      'Módulo de Tarifas',
      'Ajuste de Tarifa Dinámica',
      `Zona ${zoneName} actualizada a multiplicador ${multiplier}x.`
    );
  };

  // Therapist CRUD
  const handleAddTherapist = (newTherapist: Therapist) => {
    setTherapists(prev => [...prev, newTherapist]);
    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Terapeuta',
      `Terapeuta ${newTherapist.name} agregada con ${newTherapist.coverageZones?.length || 0} zonas de cobertura.`
    );
  };

  const handleEditTherapist = (updatedTherapist: Therapist) => {
    setTherapists(prev => prev.map(t => t.id === updatedTherapist.id ? updatedTherapist : t));
    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Terapeuta',
      `Perfil y zonas de cobertura de ${updatedTherapist.name} actualizadas.`
    );
  };

  const handleDeleteTherapist = (therapistId: string) => {
    const target = therapists.find(t => t.id === therapistId);
    setTherapists(prev => prev.filter(t => t.id !== therapistId));
    addLog(
      'Administrador',
      'Panel Admin',
      'Baja de Terapeuta',
      `Terapeuta ${target?.name || therapistId} eliminada del sistema.`
    );
  };

  // Zone CRUD
  const handleAddZone = (newZone: CoverageZone) => {
    setZones(prev => [...prev, newZone]);
    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Zona',
      `Nueva zona de cobertura "${newZone.name}" registrada.`
    );
  };

  const handleEditZone = (updatedZone: CoverageZone) => {
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Zona',
      `Zona de cobertura "${updatedZone.name}" actualizada.`
    );
  };

  const handleDeleteZone = (zoneId: string) => {
    const target = zones.find(z => z.id === zoneId);
    setZones(prev => prev.filter(z => z.id !== zoneId));
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

    try {
      await updateDoc(doc(db, 'reservas', bookingId), {
        rating,
        reviewComment: comment,
        reviewedAt
      });
    } catch (err) {
      console.warn('Error updating rating in Firestore:', err);
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
  const handleAddService = (newService: ServiceItem) => {
    setServices(prev => [...prev, newService]);
    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Servicio',
      `Nuevo servicio "${newService.name}" registrado con precio base $${newService.basePrice} MXN.`
    );
  };

  const handleEditService = (updatedService: ServiceItem) => {
    setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Servicio',
      `Servicio "${updatedService.name}" actualizado (Precio: $${updatedService.basePrice} MXN).`
    );
  };

  const handleDeleteService = (serviceId: string) => {
    const target = services.find(s => s.id === serviceId);
    setServices(prev => prev.filter(s => s.id !== serviceId));
    addLog(
      'Administrador',
      'Panel Admin',
      'Baja de Servicio',
      `Servicio "${target?.name || serviceId}" eliminado del catálogo.`
    );
  };

  // Client CRUD & Management Handlers
  const handleAddClient = (newClient: ClientUser) => {
    setClients(prev => [...prev, newClient]);
    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Cliente VIP',
      `Socio VIP ${newClient.name} (${newClient.membershipTier}) registrado exitosamente.`
    );
  };

  const handleEditClient = (updatedClient: ClientUser) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Cliente VIP',
      `Perfil y preferencias VIP de ${updatedClient.name} actualizadas.`
    );
  };

  const handleToggleBlockClient = (clientId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const nextState = !c.isBlocked;
        addLog(
          'Administrador',
          'Panel Admin',
          nextState ? 'Bloqueo de Cliente' : 'Reactivación de Cliente',
          `Cliente ${c.name} (${c.email}) ha sido ${nextState ? 'suspendido por seguridad' : 'reactivado'}.`
        );
        return { ...c, isBlocked: nextState };
      }
      return c;
    }));
  };

  // Booking Operational Handlers
  const handleRescheduleBooking = (bookingId: string, newDate: string, newTime: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, date: newDate, time: newTime };
      }
      return b;
    }));
    addLog(
      'Administrador',
      'Panel Operaciones',
      'Reprogramación de Servicio',
      `Reserva ${bookingId} reprogramada para fecha ${newDate} a las ${newTime}.`
    );
  };

  const handleCancelBooking = (bookingId: string, reason: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, state: 'cancelado', cancellationReason: reason };
      }
      return b;
    }));
    addLog(
      'Administrador',
      'Panel Operaciones',
      'Cancelación de Servicio',
      `Reserva ${bookingId} cancelada por el administrador. Motivo: "${reason}".`
    );
  };

  const handleConfirmPayment = (bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, paymentStatus: 'pagado' };
      }
      return b;
    }));
    addLog(
      'Administrador',
      'Módulo Finanzas',
      'Confirmación de Pago SPEI/Efectivo',
      `Pago de la reserva ${bookingId} verificado y acreditado.`
    );
  };

  const handleRejectPayment = (bookingId: string, reason: string) => {
    addLog(
      'Administrador',
      'Módulo Finanzas',
      'Rechazo de Comprobante de Pago',
      `Comprobante de reserva ${bookingId} rechazado. Observación: "${reason}".`
    );
  };

  const activeBookingCount = bookings.filter(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado').length;

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

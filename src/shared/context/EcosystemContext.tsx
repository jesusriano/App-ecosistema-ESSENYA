import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { collection, onSnapshot, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit, orderBy, runTransaction, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
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
import { OFFICIAL_SERVICES } from '../data/catalog';
import { getServiceImage } from '../utils/serviceImage';
import { sendChatMessage } from '../services/chatService';

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
  handleViewInvoice: (invoice: Invoice) => void;
  
  handleNewBooking: (newBooking: Booking) => Promise<Booking | void>;
  handleCreateManualBooking: (manualData: Partial<Booking>) => Promise<Booking>;
  handleAcceptBooking: (bookingId: string, acceptingTherapist: Partial<Therapist>) => void;
  handleRejectBooking: (bookingId: string, reason?: string) => void;
  handleAdminAcceptBooking: (bookingId: string) => Promise<void>;
  handleAdminRejectBooking: (bookingId: string, reason: string) => Promise<void>;
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
  handleToggleServiceActive: (serviceId: string, isActive: boolean) => Promise<void>;
  handleBulkToggleServices: (serviceIds: string[], isActive: boolean) => Promise<void>;
  
  handleAddClient: (newClient: ClientUser) => void;
  handleEditClient: (updatedClient: ClientUser) => void;
  handleToggleBlockClient: (clientId: string) => void;
  handleDeleteClient: (clientId: string) => Promise<void>;
  
  handleRescheduleBooking: (bookingId: string, newDate: string, newTime: string, preferences?: any, notes?: string, clientAddress?: string) => Promise<void> | void;
  handleCancelBooking: (bookingId: string, reason: string) => void;
  handleConfirmPayment: (bookingId: string) => void;
  handleRejectPayment: (bookingId: string, reason: string) => void;
  handleDeleteBooking: (bookingId: string) => Promise<void>;
  handleDataCleanup: () => Promise<boolean | void>;
  handleUpdateLiveLocation: (bookingId: string, lat: number, lng: number) => Promise<void>;
  handleResolvePanicAlert: (alertId: string, adminName?: string) => Promise<void>;
  handleAttendPanicAlert: (alertId: string, adminName?: string) => Promise<void>;
  handleUpdateSystemConfig: (updates: Partial<{ googleMapsKey: string, autoCleanupDone: boolean }>) => Promise<void>;
  completedServicesCount: number;
  activeBookingCount: number;
  pendingSyncCount: number;
  systemConfig: {
    googleMapsKey?: string;
    autoCleanupDone?: boolean;
  };
}

const EcosystemContext = createContext<EcosystemContextType | undefined>(undefined);

export const EcosystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPortal, setCurrentPortal] = useState<PortalType>('website');

  const { getUser, firebaseUser, sessions } = useAuth();
  const authClient = getUser('cliente');
  const authTherapist = getUser('terapeuta');

  const [systemConfig, setSystemConfig] = useState<{
    googleMapsKey?: string;
    autoCleanupDone?: boolean;
  }>({
    googleMapsKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
  });

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'configuraciones', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSystemConfig(prev => ({
          ...prev,
          googleMapsKey: data.googleMapsKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || prev.googleMapsKey || '',
          autoCleanupDone: Boolean(data.autoCleanupDone)
        }));
      }
    }, () => {});
    return () => unsubConfig();
  }, []);

  // Shared Ecosystem Connected State
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);

  // Sync client in EcosystemContext with authenticated user from AuthContext
  useEffect(() => {
    if (authClient) {
      const fullName = `${authClient.nombre} ${authClient.apellidos}`.trim();
      setClient(prev => {
        if (
          prev.id === authClient.id &&
          prev.name === (fullName || prev.name) &&
          prev.email === (authClient.correo || prev.email) &&
          prev.phone === (authClient.telefono || prev.phone) &&
          prev.membershipTier === (authClient.membershipTier || prev.membershipTier || 'Platino')
        ) {
          return prev;
        }
        return {
          ...prev,
          id: authClient.id,
          name: fullName || prev.name,
          email: authClient.correo || prev.email,
          phone: authClient.telefono || prev.phone,
          membershipTier: authClient.membershipTier || prev.membershipTier || 'Platino',
        };
      });
    }
  }, [authClient?.id, authClient?.nombre, authClient?.apellidos, authClient?.correo, authClient?.telefono, authClient?.membershipTier]);

  const [therapists, setTherapists] = useState<Therapist[]>(INITIAL_THERAPISTS);

  // Derive activeTherapist dynamically from logged-in therapist session
  const activeTherapist: Therapist = useMemo(() => {
    if (authTherapist) {
      const match = therapists.find(t => 
        t.id === authTherapist.id || 
        t.id === authTherapist.uid ||
        (authTherapist.correo && (t.email || '').toLowerCase() === authTherapist.correo.toLowerCase()) ||
        ((authTherapist as any).email && (t.email || '').toLowerCase() === (authTherapist as any).email.toLowerCase())
      );
      if (match) return match;
      return {
        id: authTherapist.id || authTherapist.uid || firebaseUser?.uid || 'ther-1',
        name: `${authTherapist.nombre} ${authTherapist.apellidos || ''}`.trim() || 'Terapeuta Certificada',
        photo: authTherapist.fotografia || '',
        phone: authTherapist.telefono || '525512345678',
        email: authTherapist.correo || 'terapeuta@essenya.mx',
        rating: 5.0,
        reviewCount: 0,
        totalServices: (authTherapist as any).serviciosCompletados || 0,
        gender: 'femenino',
        bio: authTherapist.biografia || 'Especialista certificada ESSENYA.',
        certifications: (authTherapist as any).certificaciones || ['Certificación Holística SEP-CONOCER'],
        specialties: (authTherapist as any).especialidades || ['Masaje Relajante'],
        status: 'disponible',
        currentZone: (authTherapist as any).currentZone || (authTherapist as any).zonasCobertura?.[0] || 'Zona no configurada',
        coverageZones: (authTherapist as any).zonasCobertura || (authTherapist as any).coverageZones || [],
        vehicleType: 'Auto Ejecutivo',
        lat: 19.4326,
        lng: -99.1332,
        completedServicesCount: (authTherapist as any).serviciosCompletados || 0
      };
    }
    return therapists[0] || INITIAL_THERAPISTS[0];
  }, [authTherapist, therapists, firebaseUser]);
  const [client, setClient] = useState<ClientUser>(INITIAL_CLIENT);
  const [clients, setClients] = useState<ClientUser[]>([]);
  
  // Initialize bookings empty. We don't cache for 100% security as requested.
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Removed LocalStorage sync for bookings and offline agenda
  useEffect(() => {
    // No-op for security
  }, [bookings]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [zones, setZones] = useState<CoverageZone[]>(INITIAL_COVERAGE_ZONES);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [panicAlerts, setPanicAlerts] = useState<PanicAlert[]>([]);

  // Selected Invoice Modal State
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  const [completedServicesCount, setCompletedServicesCount] = useState(0);

  // Data Cleanup Logic (Temporary Maintenance Utility)
  const handleDataCleanup = React.useCallback(async () => {
    try {
      console.log('Iniciando limpieza total de datos de prueba...');
      
      // 1. Reservas
      const bookingsSnap = await getDocs(collection(db, 'reservas'));
      for (const bDoc of bookingsSnap.docs) {
        await deleteDoc(doc(db, 'reservas', bDoc.id));
      }
      setBookings([]);

      // 2. Facturas (Using 'invoices' collection)
      const invoicesSnap = await getDocs(collection(db, 'invoices'));
      for (const iDoc of invoicesSnap.docs) {
        await deleteDoc(doc(db, 'invoices', iDoc.id));
      }
      setInvoices([]);

      // 3. Pánico y Logs
      const panicSnap = await getDocs(collection(db, 'alertas_panico'));
      for (const pDoc of panicSnap.docs) {
        await deleteDoc(doc(db, 'alertas_panico', pDoc.id));
      }
      setPanicAlerts([]);

      const logsSnap = await getDocs(collection(db, 'audit_logs'));
      for (const lDoc of logsSnap.docs) {
        await deleteDoc(doc(db, 'audit_logs', lDoc.id));
      }
      setAuditLogs([]);

      // 4. Clientes (Preserve Nelson Cárdenas, delete Nelson Riaño, Socio VIP, etc.)
      const clientsSnap = await getDocs(collection(db, 'clientes'));
      for (const cDoc of clientsSnap.docs) {
        const data = cDoc.data();
        const name = (data.name || data.nombre || '').toLowerCase();
        
        if (name.includes('nelson cárdenas')) {
          // Reset statistics for the main client
          await updateDoc(doc(db, 'clientes', cDoc.id), {
            totalBookings: 0,
            spentTotal: 0,
            rewardsPoints: 0,
            membershipTier: 'Platino',
            history: []
          });
        } else if (name.includes('nelson riaño') || name.includes('socio vip') || name.includes('prueba')) {
          await deleteDoc(doc(db, 'clientes', cDoc.id));
        }
      }

      // 5. Terapeutas (Preserve Jesús María Riaño and Martha Lucia Gomez)
      const therapistsSnap = await getDocs(collection(db, 'terapeutas_publicos'));
      for (const tDoc of therapistsSnap.docs) {
        const data = tDoc.data();
        const name = (data.name || data.nombre || '').toLowerCase();
        const shouldPreserve = name.includes('jesús maría riaño') || name.includes('martha lucia gomez');
        
        if (!shouldPreserve) {
          await deleteDoc(doc(db, 'terapeutas_publicos', tDoc.id));
        }
      }

      console.log('Limpieza completada exitosamente.');
      return true;
    } catch (err) {
      console.error('Error en limpieza:', err);
      throw err;
    }
  }, [setBookings, setInvoices, setPanicAlerts, setAuditLogs, setClients]);

  // Offline Sync Queue (Now only in-memory for security)
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);

  // Removed localStorage Queue persistence
  useEffect(() => {
    // No-op for security
  }, [pendingQueue]);

  // Sync Logic
  const syncPendingItems = async () => {
    if (!navigator.onLine || pendingQueue.length === 0) return;

    console.log(`Intentando sincronizar ${pendingQueue.length} elementos pendientes...`);
    const queueCopy = [...pendingQueue];
    const failedItems: any[] = [];

    for (const item of queueCopy) {
      try {
        if (item.type === 'BOOKING_STATE') {
          await updateDoc(doc(db, 'reservas', item.targetId), cleanForFirestore(item.payload));
        } else if (item.type === 'LIVE_LOCATION') {
          await updateDoc(doc(db, 'reservas', item.targetId), cleanForFirestore(item.payload));
        }
        // Success: item will be removed from queue
      } catch (err) {
        console.error('Error sincronizando item:', item, err);
        failedItems.push(item);
      }
    }

    setPendingQueue(failedItems);
    if (failedItems.length === 0) {
      console.log('Sincronización completa con éxito.');
    }
  };

  // Listen for online status
  useEffect(() => {
    const handleOnline = () => {
      syncPendingItems();
    };
    window.addEventListener('online', handleOnline);
    // Also try sync on mount
    syncPendingItems();
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingQueue.length]);

  const addToSyncQueue = (item: { type: string, targetId: string, payload: any }) => {
    const newItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...item
    };
    setPendingQueue(prev => [...prev, newItem]);
  };

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

    setCompletedServicesCount(finishedAndPaid);

    let computedTier: MembershipTier = 'Platino';
    if (finishedAndPaid >= 16) computedTier = 'Imperial VIP';
    else if (finishedAndPaid >= 11) computedTier = 'Black Diamond';
    else if (finishedAndPaid >= 9) computedTier = 'Diamond';
    else if (finishedAndPaid >= 5) computedTier = 'Gold';
    else computedTier = 'Platino';

    if (client.membershipTier !== computedTier) {
      setClient(prev => prev.membershipTier === computedTier ? prev : ({ ...prev, membershipTier: computedTier }));
      // Intentar sincronizar en Firestore si el cliente existe
      try {
        updateDoc(doc(db, 'clientes', client.id), { membershipTier: computedTier }).catch(() => {});
      } catch {
        // Silenciar errores de sincronización offline
      }
    }
  }, [bookings, client?.id]);

  // Primitive flags for listener stability (prevents frequent tear-down on unrelated session ref changes)
  const currentUserId = firebaseUser?.uid;
  const isActualAdmin = Boolean(
    firebaseUser && (
      sessions?.administrador ||
      firebaseUser.email === 'essenya222@gmail.com' ||
      firebaseUser.email === 'graphixglow.2024@gmail.com' ||
      firebaseUser.email?.toLowerCase().endsWith('@essenya.mx') ||
      firebaseUser.email?.toLowerCase().endsWith('@essenya.com')
    )
  );
  const isUserAdmin = Boolean(isActualAdmin && (sessions?.administrador || currentPortal === 'admin'));
  const isUserTherapist = Boolean(firebaseUser && (sessions?.terapeuta || currentPortal === 'therapist' || authTherapist));

  // Firestore Realtime Subscriptions (Catalogs always public; user data queried by role / UID)
  useEffect(() => {
    // 1. Public Catalogs (Services, Therapists, Zones)
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snap) => {
      // 1. Initialize map with OFFICIAL_SERVICES defaults (ensures all 6 base rituals always exist)
      const serviceMap = new Map<string, ServiceItem>();
      OFFICIAL_SERVICES.forEach(s => {
        serviceMap.set(s.id, { ...s, isActive: s.isActive !== false });
        if (s.id === 'SRB-relajante') {
          serviceMap.set('srv-relajante', { ...s, id: 'srv-relajante', isActive: s.isActive !== false });
        }
      });

      // 2. Overlay Firestore documents (customized by admin or newly created)
      if (!snap.empty) {
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const id = docSnap.id;
          const existing = serviceMap.get(id) || serviceMap.get(id === 'SRB-relajante' ? 'srv-relajante' : id === 'srv-relajante' ? 'SRB-relajante' : '');
          const image = (data.image && typeof data.image === 'string' && data.image.trim().length > 5 && !data.image.includes('photo-1512290900672'))
            ? data.image.trim()
            : existing?.image || getServiceImage({ id, name: data.name || data.nombre, image: data.image });

          const merged: ServiceItem = {
            ...(existing || {}),
            ...data,
            id,
            name: data.name || data.nombre || existing?.name || 'Servicio ESSENYA',
            tagline: data.tagline || existing?.tagline || '',
            description: data.description || existing?.description || '',
            basePrice: Number(data.basePrice ?? existing?.basePrice ?? 1100),
            price90: Number(data.price90 ?? existing?.price90 ?? 1650),
            price120: Number(data.price120 ?? existing?.price120 ?? 2200),
            category: (data.category as any) || existing?.category || 'Holístico',
            iconName: data.iconName || existing?.iconName || 'Sparkles',
            image,
            benefits: Array.isArray(data.benefits) ? data.benefits : (existing?.benefits || []),
            recommendedFor: data.recommendedFor || existing?.recommendedFor || '',
            allowedDurations: Array.isArray(data.allowedDurations) && data.allowedDurations.length > 0
              ? data.allowedDurations
              : (existing?.allowedDurations || [60, 90, 120]),
            isActive: data.isActive !== false && data.active !== false && data.estado !== 'inactivo',
            isVipFeatured: Boolean(data.isVipFeatured ?? data.featured),
            discountPercent: Number(data.discountPercent ?? 0),
            requiresDualTherapist: Boolean(data.requiresDualTherapist ?? existing?.requiresDualTherapist),
            therapistAssignmentNote: data.therapistAssignmentNote || existing?.therapistAssignmentNote
          };
          serviceMap.set(id, merged);
        });
      }

      // 3. Deduplicate aliases, keeping official order
      const finalServices: ServiceItem[] = [];
      const seenNames = new Set<string>();

      serviceMap.forEach((srv) => {
        const normName = (srv.name || '').toLowerCase().trim();
        if (!seenNames.has(normName)) {
          seenNames.add(normName);
          finalServices.push(srv);
        }
      });

      setServices(finalServices);
    }, err => handleFirestoreError(err, OperationType.LIST, 'servicios'));

    const unsubTerapeuta = onSnapshot(collection(db, 'terapeutas_publicos'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Therapist));
        setTherapists(list);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'terapeutas_publicos'));

    const unsubZonas = onSnapshot(collection(db, 'zonas'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoverageZone));
        setZones(list);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'zonas'));

    const unsubConfig = onSnapshot(doc(db, 'configuraciones', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSystemConfig(docSnap.data() as any);
      }
    }, err => handleFirestoreError(err, OperationType.GET, 'configuraciones/global'));

    // 2. Private Subscriptions (STRICT REQUIREMENT: Must have an active authenticated Firebase user)
    // Firestore security rules enforce isSignedIn() for private collections (reservas, alertas_panico, clientes, etc.).
    // Querying without firebaseUser will be blocked as unauthenticated / anonymous.
    if (!firebaseUser) {
      return () => {
        unsubServicios();
        unsubTerapeuta();
        unsubZonas();
        unsubConfig();
      };
    }

    const uid = firebaseUser.uid;

    let unsubReservas = () => {};
    let unsubReservas2 = () => {};
    let unsubReservas3 = () => {};
    let unsubReservasCustom = () => {};
    let unsubPending = () => {};
    let unsubClientes = () => {};
    let unsubInvoices = () => {};
    let unsubAudit = () => {};
    let unsubPanic = () => {};

    const parseBookingDoc = (docSnap: any): Booking => {
      const d = (docSnap.data ? docSnap.data() : docSnap) || {};
      const therapistIds = Array.isArray(d.therapistIds) ? d.therapistIds : (d.therapistId ? [d.therapistId] : []);
      const assignedCount = typeof d.assignedTherapistsCount === 'number' 
        ? d.assignedTherapistsCount 
        : therapistIds.length;

      // Phone Privacy: Neither client nor therapist may see the other's phone number
      const isClientViewer = !isUserAdmin && !isUserTherapist;
      const isTherapistViewer = isUserTherapist && !isUserAdmin;
      const safeClientPhone = isTherapistViewer ? '' : (d.clientPhone || d.telefono || '');
      const safeTherapistPhone = isClientViewer ? undefined : d.therapistPhone;
      const safeTherapistPhone2 = isClientViewer ? undefined : d.therapistPhone2;

      return {
        ...d,
        id: docSnap.id || d.id || '',
        code: d.code || d.folio || `ESS-${(docSnap.id || d.id || '0000').substring(0, 6).toUpperCase()}`,
        clientId: d.clientId || '',
        clientName: d.clientName || d.nombreCliente || (authClient ? `${authClient.nombre} ${authClient.apellidos || ''}`.trim() : '') || (client?.name || 'Cliente'),
        clientPhone: safeClientPhone,
        clientAddress: d.clientAddress || d.direccion || '',
        cityZone: d.cityZone || d.zona || d.ciudad || 'Ciudad de México',
        serviceId: d.serviceId || 'serv-1',
        serviceName: d.serviceName || d.servicioNombre || 'Masaje Holístico',
        durationMinutes: Number(d.durationMinutes || 60),
        price: Number(d.price || 0),
        tip: Number(d.tip || 0),
        total: Number(d.total || (Number(d.price || 0) + Number(d.tip || 0))),
        date: d.date || d.fecha || new Date().toISOString().split('T')[0],
        time: d.time || d.hora || '12:00',
        preferences: {
          genderPreference: d.preferences?.genderPreference || 'sin_preferencia',
          pressureLevel: d.preferences?.pressureLevel || 'Media',
          essentialOil: d.preferences?.essentialOil || 'Lavanda Francesa',
          musicStyle: d.preferences?.musicStyle || 'Acoustic Zen',
          painPoints: d.preferences?.painPoints || d.painPoints || '',
          arrivalInstructions: d.preferences?.arrivalInstructions || '',
          specialInstructions: d.preferences?.specialInstructions || ''
        },
        state: d.state || d.estado || 'pendiente',
        etaMinutes: Number(d.etaMinutes || 20),
        paymentMethod: d.paymentMethod || 'Tarjeta de Crédito / Débito',
        paymentStatus: d.paymentStatus || 'pendiente',
        requiresDualTherapist: d.requiresDualTherapist === true || d.serviceId === 'srv-pareja',
        therapistId: d.therapistId,
        therapistName: d.therapistName,
        therapistPhoto: d.therapistPhoto,
        therapistPhone: safeTherapistPhone,
        therapistId2: d.therapistId2,
        therapistName2: d.therapistName2,
        therapistPhoto2: d.therapistPhoto2,
        therapistPhone2: safeTherapistPhone2,
        therapistIds,
        assignedTherapistsCount: assignedCount,
        createdAt: d.createdAt || new Date().toISOString()
      } as Booking;
    };

    if (isUserAdmin) {
      // Administrator: Queries with safe limits to prevent unbounded memory churn and re-render cascading
      const qReservas = query(collection(db, 'reservas'), limit(200));
      unsubReservas = onSnapshot(qReservas, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => parseBookingDoc(doc)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setBookings(list);
        } else {
          setBookings([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'reservas'));

      const qClientes = query(collection(db, 'clientes'), limit(150));
      unsubClientes = onSnapshot(qClientes, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => {
            const d = (doc.data() || {}) as any;
            return {
              ...d,
              id: doc.id,
              name: d.name || [d.nombre, d.apellidos].filter(Boolean).join(' ') || d.displayName || 'Cliente VIP',
              email: d.email || d.correo || '',
              phone: d.phone || d.telefono || '',
              membershipTier: (d.membershipTier === 'Diamond' || d.membershipTier === 'Gold' || d.membershipTier === 'Platino') ? d.membershipTier : 'Platino',
              totalBookings: Number(d.totalBookings || 0),
              spentTotal: Number(d.spentTotal || 0),
              address: d.address || d.direccion || '',
              cityZone: d.cityZone || d.ciudad || d.zone || 'Ciudad de México',
              photo: d.photo || d.fotografia || d.photoURL || '',
              rewardsPoints: Number(d.rewardsPoints || 0)
            } as ClientUser;
          });
          setClients(list);
        } else {
          setClients([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'clientes'));

      const qInvoices = query(collection(db, 'invoices'), limit(100));
      unsubInvoices = onSnapshot(qInvoices, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
          setInvoices(list);
        } else {
          setInvoices([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'invoices'));

      const qAudit = query(collection(db, 'audit_logs'), limit(50));
      unsubAudit = onSnapshot(qAudit, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemAuditLog));
          setAuditLogs(list);
        } else {
          setAuditLogs([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'audit_logs'));

      const qPanic = query(collection(db, 'alertas_panico'), limit(50));
      unsubPanic = onSnapshot(qPanic, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PanicAlert)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setPanicAlerts(list);
        } else {
          setPanicAlerts([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'alertas_panico'));

    } else if (isUserTherapist) {
      // Therapist role: bookings assigned to therapist + open pending bookings queue
      let assignedBookings1: Booking[] = [];
      let assignedBookings2: Booking[] = [];
      let assignedBookings3: Booking[] = [];
      let assignedBookingsCustom: Booking[] = [];
      let pendingBookings: Booking[] = [];

      const targetTherapistId = authTherapist?.id;

      const syncTherapistBookings = () => {
        // Therapist coverage zones (never default to Polanco)
        const tZones: string[] = Array.isArray((authTherapist as any)?.zonasCobertura) && (authTherapist as any).zonasCobertura.length > 0
          ? (authTherapist as any).zonasCobertura
          : (Array.isArray((authTherapist as any)?.coverageZones) && (authTherapist as any).coverageZones.length > 0
              ? (authTherapist as any).coverageZones
              : ((authTherapist as any)?.currentZone ? [(authTherapist as any).currentZone] : ((authTherapist as any)?.zonaActual ? [(authTherapist as any).zonaActual] : [])));

        // Filter pending bookings: therapist must ONLY receive and see bookings from her configured zones
        const filteredPending = pendingBookings.filter(b => {
          // If assigned directly to therapist or active offer
          if (b.therapistId === uid || b.therapistId2 === uid || (Array.isArray(b.therapistIds) && b.therapistIds.includes(uid))) {
            return true;
          }
          if (targetTherapistId && (b.therapistId === targetTherapistId || b.therapistId2 === targetTherapistId || (Array.isArray(b.therapistIds) && b.therapistIds.includes(targetTherapistId)))) {
            return true;
          }
          if (Array.isArray(b.activeOfferTherapistIds) && (b.activeOfferTherapistIds.includes(uid) || (targetTherapistId && b.activeOfferTherapistIds.includes(targetTherapistId)))) {
            return true;
          }
          if (tZones.length === 0) {
            // Fallback: if no coverage zones listed on therapist profile, allow pending bookings
            return true;
          }
          const bZone = (b.cityZone || '').toLowerCase().trim();
          return tZones.some(z => {
            const normZ = String(z).toLowerCase().trim();
            return normZ === bZone || bZone.includes(normZ) || normZ.includes(bZone);
          });
        });

        const mergedMap = new Map<string, Booking>();
        [...assignedBookings1, ...assignedBookings2, ...assignedBookings3, ...assignedBookingsCustom, ...filteredPending].forEach(b => mergedMap.set(b.id, b));
        const list = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setBookings(list);
      };

      const qTherapistBookings = query(collection(db, 'reservas'), where('therapistId', '==', uid));
      unsubReservas = onSnapshot(qTherapistBookings, (snap) => {
        assignedBookings1 = snap.docs.map(doc => parseBookingDoc(doc));
        syncTherapistBookings();
      }, err => handleFirestoreError(err, OperationType.LIST, 'reservas'));

      try {
        const qTherapistBookings2 = query(collection(db, 'reservas'), where('therapistId2', '==', uid));
        unsubReservas2 = onSnapshot(qTherapistBookings2, (snap) => {
          assignedBookings2 = snap.docs.map(doc => parseBookingDoc(doc));
          syncTherapistBookings();
        }, () => {});
      } catch {}

      try {
        const qTherapistBookings3 = query(collection(db, 'reservas'), where('therapistIds', 'array-contains', uid));
        unsubReservas3 = onSnapshot(qTherapistBookings3, (snap) => {
          assignedBookings3 = snap.docs.map(doc => parseBookingDoc(doc));
          syncTherapistBookings();
        }, () => {});
      } catch {}

      if (targetTherapistId && targetTherapistId !== uid) {
        try {
          const qTherapistCustom = query(collection(db, 'reservas'), where('therapistId', '==', targetTherapistId));
          unsubReservasCustom = onSnapshot(qTherapistCustom, (snap) => {
            assignedBookingsCustom = snap.docs.map(doc => parseBookingDoc(doc));
            syncTherapistBookings();
          }, () => {});
        } catch {}
      }

      try {
        const qPendingBookings = query(collection(db, 'reservas'), where('state', '==', 'pendiente'));
        unsubPending = onSnapshot(qPendingBookings, (snap) => {
          pendingBookings = snap.docs.map(doc => parseBookingDoc(doc));
          syncTherapistBookings();
        }, () => {
          // Fallback gracefully if rules require active activation
        });
      } catch {}

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
      const qClientBookings = query(collection(db, 'reservas'), where('clientId', '==', uid));
      unsubReservas = onSnapshot(qClientBookings, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => parseBookingDoc(doc)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setBookings(list);
        } else {
          setBookings([]);
        }
      }, err => handleFirestoreError(err, OperationType.LIST, 'reservas'));

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
      unsubReservas2();
      unsubReservas3();
      unsubReservasCustom();
      unsubPending();
      unsubClientes();
      unsubInvoices();
      unsubAudit();
      unsubPanic();
      unsubConfig();
    };
  }, [currentUserId, isUserAdmin, isUserTherapist, currentPortal]);

  // Add Audit Log to State & Firestore
  const addLog = async (userRole: string, userName: string, action: string, details: string) => {
    // Only attempt to log if we have a token
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    try {
      const response = await fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userRole, userName, action, details })
      });
      
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        console.warn(`Audit log endpoint returned status ${response.status} (non-JSON or unhandled).`);
        return;
      }

      const data = await response.json();
      if (data.success && data.log) {
        setAuditLogs(prev => [data.log as SystemAuditLog, ...prev]);
      }
    } catch (err) {
      console.warn("Could not record audit log via API", err);
    }
  };

  // Handlers with Firestore Persistence
  const handleNewBooking = async (newBooking: Booking) => {
    // Call the secure backend endpoint to create booking
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const resolvedClientName = newBooking.clientName || client?.name || (firebaseUser?.displayName || 'Cliente VIP');
      const resolvedClientPhone = newBooking.clientPhone || client?.phone || '';

      const response = await fetch('/api/bookings/atomic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newBooking,
          clientName: resolvedClientName,
          clientPhone: resolvedClientPhone,
          expectedWalletDeduction: (newBooking as any).expectedWalletDeduction ?? (newBooking.applyGiftCard ? (newBooking as any).walletDeduction || 0 : 0),
          expectedFinalTotal: (newBooking as any).expectedFinalTotal ?? newBooking.total
        })
      });
      
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Error ${response.status} al procesar la reserva`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create booking on backend');
      }
      
      const finalizedBooking = data.booking as Booking;
      
      // Update local state directly to show it in the UI before snapshot catches up
      setBookings(prev => [finalizedBooking, ...prev.filter(b => b.id !== finalizedBooking.id)]);

      // 3. Generate Invoice
      const newInv: Invoice = {
        id: finalizedBooking.invoiceId || `inv-${Date.now()}`,
        bookingId: finalizedBooking.id,
        clientId: finalizedBooking.clientId,
        invoiceNumber: `ESS-FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
        date: finalizedBooking.date,
        rfc: 'DELA850412VIP',
        businessName: 'ESSENYA PRIVÉ S.A. DE C.V.',
        subtotal: Number((finalizedBooking.total * 0.84).toFixed(2)),
        tax: Number((finalizedBooking.total * 0.16).toFixed(2)),
        total: finalizedBooking.total,
        status: 'emitida',
        pdfUrl: '#'
      };
      try {
        await setDoc(doc(db, 'invoices', newInv.id), cleanForFirestore(newInv));
        setInvoices(prev => [newInv, ...prev]);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `invoices/${newInv.id}`, newInv);
      }

      try {
        await addLog(
          'Cliente VIP',
          resolvedClientName,
          'Creación de Reserva',
          `Nueva reserva ${finalizedBooking.code} de ${finalizedBooking.serviceName} por $${finalizedBooking.total} MXN.`
        );
      } catch {}

      return finalizedBooking;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `api/bookings`, newBooking);
      throw err;
    }
  };

  // Admin Manual Booking Creation Handler
  const handleCreateManualBooking = async (manualData: Partial<Booking>): Promise<Booking> => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/admin/bookings/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(manualData)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear la reserva manual en el servidor');
      }

      const createdBooking = data.booking as Booking;
      setBookings(prev => [createdBooking, ...prev.filter(b => b.id !== createdBooking.id)]);
      return createdBooking;
    } catch (err: any) {
      console.warn('[Ecosystem] Endpoint manual falló o sin red, aplicando persistencia directa en Firestore:', err?.message);
      const fallbackId = `manual-${Date.now()}`;
      const code = `ESS-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();
      const fallbackBooking: Booking = {
        id: fallbackId,
        code,
        clientId: manualData.clientId || `manual-client-${Date.now()}`,
        clientName: manualData.clientName || 'Cliente VIP',
        clientPhone: manualData.clientPhone || '',
        clientAddress: manualData.clientAddress || '',
        cityZone: manualData.cityZone || 'Polanco / CDMX',
        serviceId: manualData.serviceId || 'serv-descontracturante',
        serviceName: manualData.serviceName || 'Masaje Descontracturante',
        durationMinutes: manualData.durationMinutes || 60,
        price: manualData.price || 1500,
        tip: manualData.tip || 0,
        total: manualData.total || 1500,
        date: manualData.date || nowIso.split('T')[0],
        time: manualData.time || '12:00',
        paymentMethod: manualData.paymentMethod || 'Efectivo / Pago al Recibir',
        paymentStatus: manualData.paymentStatus || 'pendiente',
        state: manualData.therapistId ? 'aceptada' : 'pendiente',
        dispatchState: manualData.therapistId ? 'asignada' : 'buscando',
        therapistId: manualData.therapistId,
        therapistName: manualData.therapistName,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...manualData
      } as Booking;

      await setDoc(doc(db, 'reservas', fallbackId), cleanForFirestore(fallbackBooking), { merge: true });
      setBookings(prev => [fallbackBooking, ...prev.filter(b => b.id !== fallbackId)]);
      return fallbackBooking;
    }
  };

  // Therapist Booking Acceptance & Rejection Handlers
  const handleAcceptBooking = async (bookingId: string, acceptingTherapist: Partial<Therapist>) => {
    // 1. Identify the authenticated therapist UID from sessions or context
    const therapistId = acceptingTherapist?.id || authTherapist?.id || authTherapist?.uid || firebaseUser?.uid;
    if (!therapistId) {
      throw new Error("No se pudo identificar la terapeuta autenticada.");
    }
    
    const therapistName = acceptingTherapist?.name || (authTherapist ? `${authTherapist.nombre} ${authTherapist.apellidos || ''}`.trim() : 'Terapeuta');
    const nowIso = new Date().toISOString();

    try {
      // 2. Obtain ID Token for secure backend call
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Sesión no válida o expirada. Por favor, vuelve a iniciar sesión.");
      }

      // 3. Call the Atomic Acceptance API on the backend
      // This ensures dispatch engine sync, client notifications and server-side atomic transaction
      const response = await fetch('/api/bookings/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al procesar la aceptación en el servidor.");
      }

      // 4. Update local state to reflect the server-side change immediately
      setBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          const isDual = b.requiresDualTherapist === true || b.serviceId === 'srv-pareja';
          
          if (!isDual) {
            return {
              ...b,
              state: 'aceptada',
              dispatchState: 'asignada',
              therapistId: result.therapistId || therapistId,
              therapistName: result.therapistName || therapistName,
              acceptedAt: nowIso,
              updatedAt: nowIso
            };
          } else {
            // Dual booking: the server returns which slot was assigned
            if (result.slotAssigned === 1) {
              return {
                ...b,
                therapistId: result.therapistId || therapistId,
                therapistName: result.therapistName || therapistName,
                assignedTherapistsCount: 1,
                acceptedAt: nowIso,
                updatedAt: nowIso
              };
            } else {
              return {
                ...b,
                state: 'aceptada',
                dispatchState: 'asignada',
                therapistId2: result.therapistId || therapistId,
                therapistName2: result.therapistName || therapistName,
                assignedTherapistsCount: 2,
                acceptedAt: nowIso,
                updatedAt: nowIso
              };
            }
          }
        }
        return b;
      }));

      // 5. Success Audit Log
      addLog(
        'Terapeuta',
        therapistName,
        'Aceptación de Reserva',
        `Terapeuta aceptó la reserva ${bookingId} vía API Central.`
      );
    } catch (err: any) {
      console.error("Error accepting booking:", err);
      // Ensure error is a string for UI display
      const friendlyError = typeof err === 'string' ? err : (err.message || "Error desconocido");
      throw new Error(friendlyError);
    }
  };

  const handleRejectBooking = async (bookingId: string, reason?: string) => {
    const therapistId = authTherapist?.id || authTherapist?.uid || firebaseUser?.uid;
    if (!therapistId) return;

    try {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const response = await fetch('/api/dispatch/reject', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ bookingId, reason: reason || 'Declinada por terapeuta' })
        });
        
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Error al rechazar en el servidor");
        }
      }

      // Local state update: remove from local bookings if it's no longer pending or relevant
      setBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          const rejectedBy = b.rejectedBy ? [...b.rejectedBy] : [];
          if (!rejectedBy.includes(therapistId)) {
             rejectedBy.push(therapistId);
          }
          return { ...b, rejectedBy };
        }
        return b;
      }));

      addLog(
        'Terapeuta',
        authTherapist?.nombre || 'Terapeuta',
        'Reserva Declinada',
        `Terapeuta declinó la reserva ${bookingId} vía API Central.`
      );
    } catch (err) {
      console.error("Error rejecting booking:", err);
      // Non-blocking for UI unless critical
    }
  };

  const handleAdminAcceptBooking = async (bookingId: string) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) {
      throw new Error('La reserva especificada no existe.');
    }
    if (targetBooking.state !== 'pendiente') {
      throw new Error(`La reserva no se puede aceptar porque su estado actual es "${targetBooking.state}".`);
    }

    const nowIso = new Date().toISOString();
    const updatePayload: any = {
      state: 'aceptada' as BookingState,
      dispatchState: 'asignada',
      adminApproved: true,
      adminApprovedAt: nowIso,
      acceptedAt: nowIso,
      updatedAt: nowIso
    };

    if (targetBooking.therapistId) {
      updatePayload.therapistIds = [targetBooking.therapistId];
      updatePayload.assignedTherapistsCount = 1;
      updatePayload.activeOfferTherapistIds = [];
      updatePayload.activeOffers = [];
    }

    try {
      if (targetBooking.therapistId) {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        await fetch('/api/admin/bookings/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ bookingId, therapistId: targetBooking.therapistId, state: 'aceptada' })
        }).catch(e => console.warn('[AdminAccept] API assign error:', e));
      }

      await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
      throw err;
    }

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          ...updatePayload
        };
      }
      return b;
    }));

    try {
      await addLog(
        'Administración',
        'Central ESSENYA',
        'Aceptación de Reserva',
        `Reserva ${targetBooking.code} de ${targetBooking.clientName} ha sido ACEPTADA por la Administración.`
      );
    } catch {}
  };

  const handleAdminRejectBooking = async (bookingId: string, reason: string) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) {
      throw new Error('La reserva especificada no existe.');
    }
    if (targetBooking.state !== 'pendiente') {
      throw new Error(`La reserva no se puede rechazar porque su estado actual es "${targetBooking.state}".`);
    }

    const updatePayload = {
      state: 'rechazada' as BookingState,
      motivoRechazo: reason,
      cancellationReason: reason,
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
      throw err;
    }

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          ...updatePayload
        };
      }
      return b;
    }));

    try {
      await addLog(
        'Administración',
        'Central ESSENYA',
        'Rechazo de Reserva',
        `Reserva ${targetBooking.code} de ${targetBooking.clientName} ha sido RECHAZADA por la Administración. Motivo: ${reason}`
      );
    } catch {}
  };

  const handleUpdateBookingState = async (bookingId: string, newState: BookingState) => {
    const nowIso = new Date().toISOString();
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, state: newState, updatedAt: nowIso };
      }
      return b;
    }));

    const updatePayload = { state: newState, updatedAt: nowIso };

    try {
      if (!navigator.onLine) {
        addToSyncQueue({ type: 'BOOKING_STATE', targetId: bookingId, payload: updatePayload });
      } else {
        await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore(updatePayload));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
      addToSyncQueue({ type: 'BOOKING_STATE', targetId: bookingId, payload: updatePayload });
    }

    const bk = bookings.find(b => b.id === bookingId);

    // If service finished, increment completed services in public therapist profile
    if (newState === 'servicio_finalizado' && bk?.therapistId) {
      try {
        const thDocRef = doc(db, 'terapeutas_publicos', bk.therapistId);
        const thDoc = await getDoc(thDocRef);
        if (thDoc.exists()) {
          const count = (thDoc.data()?.completedServicesCount || thDoc.data()?.serviciosCompletados || 0) + 1;
          await updateDoc(thDocRef, {
            completedServicesCount: count,
            serviciosCompletados: count,
            updatedAt: nowIso
          });
        }
      } catch {}
    }

    addLog(
      'Sistema / App',
      bk?.therapistName || 'ESSENYA Core',
      'Cambio de Estado',
      `Reserva ${bk?.code || bookingId} actualizada al estado "${newState}".`
    );
  };

  const handleUpdateLiveLocation = async (bookingId: string, lat: number, lng: number) => {
    if (!db) return;
    const nowIso = new Date().toISOString();
    const updatePayload = {
      liveLat: lat,
      liveLng: lng,
      updatedAt: nowIso
    };

    try {
      if (!navigator.onLine) {
        addToSyncQueue({ type: 'LIVE_LOCATION', targetId: bookingId, payload: updatePayload });
      } else {
        await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore(updatePayload));
      }
      setBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          return { ...b, liveLat: lat, liveLng: lng, updatedAt: nowIso };
        }
        return b;
      }));
    } catch (err) {
      console.error('Error updating live location:', err);
      addToSyncQueue({ type: 'LIVE_LOCATION', targetId: bookingId, payload: updatePayload });
    }
  };


  const handleReassignTherapist = async (bookingId: string, therapistId: string) => {
    let newTher = therapists.find(t => t.id === therapistId);
    if (!newTher) {
      try {
        const dSnap = await getDoc(doc(db, 'terapeutas_publicos', therapistId));
        if (dSnap.exists()) {
          const dData = dSnap.data();
          newTher = {
            id: dSnap.id,
            name: dData.name || dData.nombre || 'Terapeuta Certificada',
            photo: dData.photo || dData.fotografia || '',
            phone: dData.phone || dData.telefono || '525512345678',
            email: dData.email || dData.correo || 'terapeuta@essenya.mx',
            rating: dData.rating || 5.0,
            reviewCount: dData.reviewCount || 0,
            totalServices: dData.totalServices || dData.completedServicesCount || 0,
            gender: dData.gender || 'femenino',
            bio: dData.bio || dData.biografia || '',
            certifications: dData.certifications || ['Certificación Holística SEP-CONOCER'],
            specialties: dData.specialties || ['Masaje Relajante'],
            status: 'disponible',
            currentZone: dData.currentZone || dData.zonasCobertura?.[0] || 'Zona no configurada',
            coverageZones: dData.coverageZones || dData.zonasCobertura || [],
            vehicleType: dData.vehicleType || 'Auto Ejecutivo',
            lat: dData.lat || 19.4326,
            lng: dData.lng || -99.1332,
            completedServicesCount: dData.completedServicesCount || 0
          };
        }
      } catch {}
    }
    if (!newTher) return;

    const nowIso = new Date().toISOString();

    // 1. Optimistic local update so administration and UI see the assignment immediately
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          state: 'aceptada',
          dispatchState: 'asignada',
          therapistId: newTher!.id,
          therapistName: newTher!.name,
          therapistPhoto: newTher!.photo,
          therapistPhone: newTher!.phone,
          therapistIds: [newTher!.id],
          assignedTherapistsCount: 1,
          adminApproved: true,
          adminApprovedAt: nowIso,
          updatedAt: nowIso
        };
      }
      return b;
    }));

    // 2. Call backend assignment endpoint to synchronize with push notifications & database
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/admin/bookings/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, therapistId: newTher.id, state: 'aceptada' })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status} al asignar terapeuta`);
      }
    } catch (apiErr) {
      console.warn('[Ecosystem] API assignment fallback to direct Firestore:', apiErr);
      // Fallback: direct update to Firestore
      const updatePayload = {
        state: 'aceptada',
        dispatchState: 'asignada',
        therapistId: newTher.id,
        therapistName: newTher.name,
        therapistPhoto: newTher.photo,
        therapistPhone: newTher.phone,
        therapistIds: [newTher.id],
        assignedTherapistsCount: 1,
        activeOfferTherapistIds: [],
        activeOffers: [],
        adminApproved: true,
        adminApprovedAt: nowIso,
        updatedAt: nowIso
      };
      await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore(updatePayload));
    }

    addLog(
      'Administrador',
      'Director Operativo',
      'Asignación y Aprobación de Terapeuta',
      `Reserva ${bookingId} aprobada y asignada en tiempo real a ${newTher.name}.`
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
      await setDoc(doc(db, 'terapeutas_publicos', newTherapist.id), cleanForFirestore(newTherapist));
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
      await setDoc(doc(db, 'terapeutas_publicos', updatedTherapist.id), cleanForFirestore(updatedTherapist), { merge: true });
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
      await deleteDoc(doc(db, 'terapeutas_publicos', therapistId));
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

  const handleUpdateSystemConfig = React.useCallback(async (updates: Partial<{ googleMapsKey: string, autoCleanupDone: boolean }>) => {
    try {
      await setDoc(doc(db, 'configuraciones', 'global'), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'configuraciones/global', updates);
    }
  }, []);

  const handleSendMessage = async (bookingId: string, text: string, customSender?: string) => {
    const senderName = customSender || client?.name || (authTherapist as any)?.nombre || (authTherapist as any)?.name || 'Usuario VIP';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestamp = new Date().toISOString();
    const newMessage = { sender: senderName, text, time: timeStr, timestamp, read: false };

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        const existing = b.messages || [];
        return { ...b, messages: [...existing, newMessage] };
      }
      return b;
    }));

    try {
      const bookingRef = doc(db, 'reservas', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (bookingSnap.exists()) {
        const data = bookingSnap.data();
        const existing = data.messages || [];
        await updateDoc(bookingRef, {
          messages: [...existing, newMessage]
        });
      }
    } catch (err) {
      console.error("Error saving chat message to Firestore:", err);
    }

    addLog(
      'Mensajería',
      senderName,
      'Envío de Mensaje',
      `Mensaje enviado en chat de reserva ${bookingId}.`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('essenya_chat_message', {
          detail: {
            bookingId,
            sender: senderName,
            text,
            time: timeStr
          }
        })
      );
    }
  };

  const handleRateBooking = async (bookingId: string, rating: number, comment: string) => {
    const reviewedAt = new Date().toISOString();
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, rating, reviewComment: comment, reviewedAt };
      }
      return b;
    }));

    const updatePayload = {
      rating,
      reviewComment: comment,
      reviewedAt,
      updatedAt: reviewedAt
    };

    try {
      await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
    }

    const bk = bookings.find(b => b.id === bookingId);
    if (bk?.therapistId) {
      const currentTherapist = therapists.find(t => t.id === bk.therapistId);
      const prevCount = currentTherapist?.reviewCount || 0;
      const prevRating = currentTherapist?.rating || 5;
      const newCount = prevCount + 1;
      const newRating = Number(((prevRating * prevCount + rating) / newCount).toFixed(1));

      setTherapists(prev => prev.map(t => {
        if (t.id === bk.therapistId) {
          return { ...t, rating: newRating, reviewCount: newCount };
        }
        return t;
      }));

      // Persist rating & review count to Firestore terapeutas_publicos
      try {
        await updateDoc(doc(db, 'terapeutas_publicos', bk.therapistId), cleanForFirestore({
          rating: newRating,
          puntuacion: newRating,
          reviewCount: newCount,
          resenasCount: newCount,
          updatedAt: reviewedAt
        }));
      } catch {
        try {
          await setDoc(doc(db, 'terapeutas_publicos', bk.therapistId), cleanForFirestore({
            rating: newRating,
            puntuacion: newRating,
            reviewCount: newCount,
            resenasCount: newCount,
            updatedAt: reviewedAt
          }), { merge: true });
        } catch {}
      }

      // Also update private doc if exists
      try {
        await updateDoc(doc(db, 'terapeutas', bk.therapistId), cleanForFirestore({
          puntuacion: newRating,
          resenasCount: newCount,
          fechaActualizacion: reviewedAt
        }));
      } catch {}
    }

    addLog(
      'Cliente VIP',
      client.name,
      'Calificación y Reseña de Terapeuta',
      `Puntuación de ${rating} ⭐ estrellas asignada a ${bk?.therapistName || 'Masajista'} para reserva ${bk?.code || bookingId}. Mensaje: "${comment || 'Sin comentarios'}"`
    );
  };

  // Service CRUD & Status Handlers
  const handleAddService = async (newService: ServiceItem) => {
    const validated: ServiceItem = {
      ...newService,
      isActive: newService.isActive !== false,
      isVipFeatured: Boolean(newService.isVipFeatured),
      discountPercent: Number(newService.discountPercent || 0),
      basePrice: Number(newService.basePrice || 1100),
      price90: Number(newService.price90 || 1650),
      price120: Number(newService.price120 || 2200),
      allowedDurations: Array.isArray(newService.allowedDurations) && newService.allowedDurations.length > 0 
        ? newService.allowedDurations 
        : [60, 90, 120]
    };

    setServices(prev => [...prev.filter(s => s.id !== validated.id), validated]);
    try {
      await setDoc(doc(db, 'servicios', validated.id), cleanForFirestore(validated), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `servicios/${validated.id}`, validated);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Alta de Servicio',
      `Nuevo servicio "${validated.name}" registrado con precio base $${validated.basePrice} MXN.`
    );
  };

  const handleEditService = async (updatedService: ServiceItem) => {
    const previous = services.find(s => s.id === updatedService.id);
    const validated: ServiceItem = {
      ...updatedService,
      isActive: updatedService.isActive !== false,
      isVipFeatured: Boolean(updatedService.isVipFeatured),
      discountPercent: Number(updatedService.discountPercent || 0),
      basePrice: Number(updatedService.basePrice || 1100),
      price90: Number(updatedService.price90 || 1650),
      price120: Number(updatedService.price120 || 2200),
      allowedDurations: Array.isArray(updatedService.allowedDurations) && updatedService.allowedDurations.length > 0 
        ? updatedService.allowedDurations 
        : [60, 90, 120]
    };

    // Optimistic update
    setServices(prev => prev.map(s => s.id === validated.id ? validated : s));
    try {
      await setDoc(doc(db, 'servicios', validated.id), cleanForFirestore(validated), { merge: true });
    } catch (err) {
      if (previous) {
        setServices(prev => prev.map(s => s.id === validated.id ? previous : s));
      }
      handleFirestoreError(err, OperationType.UPDATE, `servicios/${validated.id}`, validated);
      throw err;
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Edición de Servicio',
      `Servicio "${validated.name}" actualizado (Precio: $${validated.basePrice} MXN, Estado: ${validated.isActive ? 'Activo' : 'Inactivo'}).`
    );
  };

  const handleToggleServiceActive = async (serviceId: string, isActive: boolean) => {
    const target = services.find(s => s.id === serviceId);
    if (!target) return;

    // Optimistic immediate UI reflection
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, isActive } : s));

    try {
      await setDoc(doc(db, 'servicios', serviceId), { isActive, active: isActive, estado: isActive ? 'activo' : 'inactivo' }, { merge: true });
    } catch (err) {
      // Revert upon failure
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, isActive: !isActive } : s));
      handleFirestoreError(err, OperationType.UPDATE, `servicios/${serviceId}`, { isActive });
      throw err;
    }

    addLog(
      'Administrador',
      'Panel Admin',
      isActive ? 'Activación de Servicio' : 'Desactivación de Servicio',
      `Servicio "${target.name}" marcado como ${isActive ? 'ACTIVO' : 'INACTIVO'} en el catálogo.`
    );
  };

  const handleBulkToggleServices = async (serviceIds: string[], isActive: boolean) => {
    if (!serviceIds.length) return;
    const idSet = new Set(serviceIds);

    // Optimistic immediate UI reflection
    setServices(prev => prev.map(s => idSet.has(s.id) ? { ...s, isActive } : s));

    try {
      await Promise.all(
        serviceIds.map(id => 
          setDoc(doc(db, 'servicios', id), { isActive, active: isActive, estado: isActive ? 'activo' : 'inactivo' }, { merge: true })
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `servicios/bulk`, { serviceIds, isActive });
      throw err;
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Modificación Masiva de Servicios',
      `${serviceIds.length} servicios marcados como ${isActive ? 'ACTIVOS' : 'INACTIVOS'}.`
    );
  };

  const handleDeleteService = async (serviceId: string) => {
    const target = services.find(s => s.id === serviceId);
    setServices(prev => prev.filter(s => s.id !== serviceId));
    try {
      await deleteDoc(doc(db, 'servicios', serviceId));
    } catch (err) {
      if (target) {
        setServices(prev => [...prev, target]);
      }
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
    if (client?.id === updatedClient.id) {
      setClient(prev => ({
        ...prev,
        name: updatedClient.name,
        phone: updatedClient.phone,
        membershipTier: updatedClient.membershipTier,
        address: updatedClient.address,
        cityZone: updatedClient.cityZone,
        specialNotes: updatedClient.specialNotes
      }));
    }

    try {
      await setDoc(doc(db, 'clientes', updatedClient.id), cleanForFirestore(updatedClient), { merge: true });
      try {
        await updateDoc(doc(db, 'users', updatedClient.id), {
          nombre: updatedClient.name,
          telefono: updatedClient.phone,
          membershipTier: updatedClient.membershipTier,
          fechaActualizacion: new Date().toISOString()
        });
      } catch {}
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

  const handleDeleteClient = async (clientId: string) => {
    const clientToDelete = clients.find(c => c.id === clientId);
    if (!clientToDelete) return;

    setClients(prev => prev.filter(c => c.id !== clientId));

    try {
      await deleteDoc(doc(db, 'clientes', clientId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clientes/${clientId}`);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Eliminación de Cliente VIP',
      `Expediente del socio VIP ${clientToDelete.name} eliminado del sistema.`
    );
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const bookingToDelete = bookings.find(b => b.id === bookingId);
    if (!bookingToDelete) return;

    setBookings(prev => prev.filter(b => b.id !== bookingId));

    try {
      await deleteDoc(doc(db, 'reservas', bookingId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reservas/${bookingId}`);
    }

    addLog(
      'Administrador',
      'Panel Admin',
      'Eliminación de Solicitud/Reserva',
      `La solicitud ${bookingToDelete.code} (${bookingToDelete.serviceName}) ha sido eliminada por administración.`
    );
  };

  // Booking Operational Handlers
  const handleRescheduleBooking = async (
    bookingId: string, 
    newDate: string, 
    newTime: string,
    preferences?: any,
    notes?: string,
    clientAddress?: string
  ) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, newDate, newTime, preferences, notes, clientAddress })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No fue posible reprogramar o modificar la reserva.');
      }

      setBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          return { 
            ...b, 
            date: newDate || b.date, 
            time: newTime || b.time,
            preferences: preferences ? { ...(b.preferences || {}), ...preferences } : b.preferences,
            notes: notes !== undefined ? notes : b.notes,
            clientAddress: clientAddress !== undefined ? clientAddress : b.clientAddress,
            updatedAt: new Date().toISOString()
          };
        }
        return b;
      }));

      addLog(
        'Operaciones',
        'Sistema',
        'Modificación/Reprogramación de Servicio',
        `Reserva ${bookingId} modificada/reprogramada exitosamente (fecha: ${newDate || 'sin cambio'}, hora: ${newTime || 'sin cambio'}).`
      );
    } catch (err: any) {
      console.error("Error al reprogramar/modificar reserva:", err);
      throw err;
    }
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, reason })
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Error ${response.status} al cancelar la reserva`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No fue posible cancelar la reserva.');
      }

      setBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          return { 
            ...b, 
            state: 'cancelado', 
            dispatchState: 'cancelada',
            activeOfferTherapistIds: [],
            activeOffers: [],
            cancellationReason: reason, 
            refundedAmount: data.refundedAmount,
            updatedAt: new Date().toISOString()
          };
        }
        return b;
      }));

      addLog(
        'Usuario/Admin',
        'Panel Operaciones',
        'Cancelación de Servicio',
        `Reserva ${bookingId} cancelada atómicamente. Motivo: "${reason}". Saldo reembolsado: $${data.refundedAmount || 0} MXN.`
      );
    } catch (err: any) {
      console.error("Error al cancelar reserva mediante endpoint:", err);
      throw err;
    }
  };

  const handleConfirmPayment = async (bookingId: string) => {
    const nowIso = new Date().toISOString();
    const targetBooking = bookings.find(b => b.id === bookingId);
    
    let paidMassageCounted = targetBooking?.paidMassageCounted || false;
    const updatePayload: any = {
      paymentStatus: 'pagado',
      paid: true,
      dispatchState: 'buscando',
      dispatchStartedAt: nowIso,
      updatedAt: nowIso
    };

    if (targetBooking && !paidMassageCounted && targetBooking.clientId) {
      const clientRef = doc(db, 'clientes', targetBooking.clientId);
      try {
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const cData = clientSnap.data();
          const currentTotal = Number(cData.totalBookings || cData.completedMassages || 0) + 1;
          await updateDoc(clientRef, {
            totalBookings: currentTotal,
            completedMassages: currentTotal,
            updatedAt: nowIso
          });
          setClients(prev => prev.map(c => c.id === targetBooking.clientId ? { ...c, totalBookings: currentTotal, completedMassages: currentTotal } : c));
        }
      } catch (err) {
        console.error("Error updating client massage count on payment confirmation:", err);
      }
      updatePayload.paidMassageCounted = true;
      paidMassageCounted = true;
    }

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, ...updatePayload };
      }
      return b;
    }));

    try {
      await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservas/${bookingId}`, updatePayload);
    }

    // Sync corresponding invoice if exists
    const relatedInvoice = invoices.find(inv => inv.bookingId === bookingId || inv.id === targetBooking?.invoiceId);
    if (relatedInvoice) {
      const invPayload = {
        paymentStatus: 'pagado' as const,
        status: 'pagada' as const,
        paidAt: nowIso,
        updatedAt: nowIso
      };
      setInvoices(prev => prev.map(inv => {
        if (inv.id === relatedInvoice.id) {
          return { ...inv, ...invPayload };
        }
        return inv;
      }));
      try {
        await updateDoc(doc(db, 'invoices', relatedInvoice.id), cleanForFirestore(invPayload));
      } catch {}
    }

    addLog(
      'Administrador',
      'Módulo Finanzas',
      'Confirmación de Pago SPEI/Transferencia',
      `Pago de la reserva ${bookingId} verificado y acreditado. Contador de masajes incrementado.`
    );
  };

  const handleRejectPayment = async (bookingId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'reservas', bookingId), cleanForFirestore({ paymentStatus: 'rechazado' }));
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

  const handleViewInvoice = (invoice: Invoice) => {
    setActiveInvoice(invoice);
  };

  const activeBookingCount = bookings.filter(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado').length;
  const activePanicAlertsCount = panicAlerts.filter(a => a.status === 'activa' || a.status === 'en_atencion').length;

  const value = useMemo(() => ({
    currentPortal,
    setCurrentPortal,
    services,
    therapists,
    activeTherapist,
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
    handleViewInvoice,
    handleNewBooking,
    handleCreateManualBooking,
    handleAcceptBooking,
    handleRejectBooking,
    handleAdminAcceptBooking,
    handleAdminRejectBooking,
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
    handleToggleServiceActive,
    handleBulkToggleServices,
    handleAddClient,
    handleEditClient,
    handleToggleBlockClient,
    handleDeleteClient,
    handleRescheduleBooking,
    handleCancelBooking,
    handleConfirmPayment,
    handleRejectPayment,
    handleDeleteBooking,
    handleDataCleanup,
    handleUpdateLiveLocation,
    handleResolvePanicAlert,
    handleAttendPanicAlert,
    handleUpdateSystemConfig,
    completedServicesCount,
    activeBookingCount,
    pendingSyncCount: pendingQueue.length,
    systemConfig
  }), [
    currentPortal, setCurrentPortal, services, therapists, activeTherapist,
    client, clients, bookings, invoices, zones, auditLogs, panicAlerts,
    activePanicAlertsCount, activeInvoice, setActiveInvoice, handleViewInvoice,
    handleNewBooking, handleCreateManualBooking, handleAcceptBooking, handleRejectBooking,
    handleAdminAcceptBooking, handleAdminRejectBooking, handleUpdateBookingState,
    handleReassignTherapist, handleToggleZoneSurge, handleAddTherapist,
    handleEditTherapist, handleDeleteTherapist, handleAddZone,
    handleEditZone, handleDeleteZone, handleSendMessage, handleRateBooking,
    handleAddService, handleEditService, handleDeleteService,
    handleToggleServiceActive, handleBulkToggleServices,
    handleAddClient, handleEditClient, handleToggleBlockClient, handleDeleteClient,
    handleRescheduleBooking, handleCancelBooking, handleConfirmPayment,
    handleRejectPayment, handleDeleteBooking, handleDataCleanup, handleUpdateLiveLocation,
    handleResolvePanicAlert, handleAttendPanicAlert, handleUpdateSystemConfig, completedServicesCount,
    activeBookingCount, pendingQueue.length, systemConfig
  ]);

  return (
    <EcosystemContext.Provider value={value}>
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

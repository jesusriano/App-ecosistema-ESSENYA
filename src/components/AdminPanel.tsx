import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { LuxuryButton } from './ui/LuxuryButton';
import { Booking, Therapist, ClientUser, CoverageZone, SystemAuditLog, BookingState } from '../types';
import { 
  Shield, TrendingUp, Users, Calendar, MapPin, DollarSign, 
  Activity, Search, Plus, Edit, Trash2, Star, Award, 
  CheckCircle2, AlertTriangle, X, Lock, UserPlus, Globe, Check
} from 'lucide-react';

interface AdminPanelProps {
  bookings: Booking[];
  therapists: Therapist[];
  clients: ClientUser[];
  zones: CoverageZone[];
  auditLogs: SystemAuditLog[];
  onUpdateBookingState: (bookingId: string, newState: BookingState) => void;
  onReassignTherapist: (bookingId: string, therapistId: string) => void;
  onToggleZoneSurge: (zoneId: string, multiplier: number) => void;
  onAddTherapist?: (therapist: Therapist) => void;
  onEditTherapist?: (therapist: Therapist) => void;
  onDeleteTherapist?: (therapistId: string) => void;
  onAddZone?: (zone: CoverageZone) => void;
  onEditZone?: (zone: CoverageZone) => void;
  onDeleteZone?: (zoneId: string) => void;
}

// Preset zones list for quick tagging
const PRESET_ZONES_SUGGESTIONS = [
  'Interlomas', 'Bosque Real', 'Country Club', 'Tecamachalco', 'Bosques', 'Cuajimalpa', 'Santa Fe',
  'Desierto de los Leones', 'Olivar de los Padres (Av. Toluca)', "Rómulo O'Farrill", 'Las Águilas',
  'Lomas de las Águilas', 'Villa Verdún', 'Axomiatla', 'Lomas de Guadalupe', 'San Ángel Inn', 'Los Alpes',
  'Av. de los Poetas (#100, #100A y #89)', 'Cumbres', 'Tres Cumbres', 'Av. San Bernabé',
  'Jardines del Pedregal', 'San Jerónimo Lídice', 'San Jerónimo', 'San Jerónimo Aculco', 'La Alcantarilla',
  'Guadalupe Inn', 'Av. Luis Cabrera', 'Lomas Quebradas', 'Magdalena Contreras', 'Jesús del Monte',
  'La Herradura', 'Lomas de Chapultepec', 'Bosques de las Lomas', 'Santa Fe (Tamarindos)', 'Polanco'
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  bookings,
  therapists,
  clients,
  zones,
  auditLogs,
  onUpdateBookingState,
  onReassignTherapist,
  onToggleZoneSurge,
  onAddTherapist,
  onEditTherapist,
  onDeleteTherapist,
  onAddZone,
  onEditZone,
  onDeleteZone,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'bookings' | 'therapists' | 'clients' | 'zones' | 'audit'>('dashboard');
  
  // Reassignment Modal State
  const [selectedBookingForReassign, setSelectedBookingForReassign] = useState<Booking | null>(null);
  const [newTherapistId, setNewTherapistId] = useState<string>('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('todos');

  // Therapist Modal State (Add / Edit)
  const [showTherapistModal, setShowTherapistModal] = useState<boolean>(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);
  const [therapistForm, setTherapistForm] = useState<{
    name: string;
    gender: 'femenino' | 'masculino';
    phone: string;
    email: string;
    photo: string;
    bio: string;
    certifications: string;
    vehicleType: 'Auto Ejecutivo' | 'SUV Premium' | 'Servicio Chofer';
    coverageZones: string[];
    newZoneTagInput: string;
  }>({
    name: '',
    gender: 'femenino',
    phone: '+52 55 ',
    email: '',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    bio: 'Fisioterapeuta y Terapeuta Holística Certificada.',
    certifications: 'CIBTAC International, Drenaje Linfático',
    vehicleType: 'Auto Ejecutivo',
    coverageZones: [],
    newZoneTagInput: ''
  });

  // Coverage Zone Modal State (Add / Edit)
  const [showZoneModal, setShowZoneModal] = useState<boolean>(false);
  const [editingZone, setEditingZone] = useState<CoverageZone | null>(null);
  const [zoneForm, setZoneForm] = useState<{
    name: string;
    coloniasesInput: string;
    surgeMultiplier: number;
  }>({
    name: '',
    coloniasesInput: '',
    surgeMultiplier: 1.0
  });

  // Metrics
  const totalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);
  const activeBookingsCount = bookings.filter(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado').length;
  const onlineTherapistsCount = therapists.filter(t => t.status !== 'desconectado').length;

  // Reassignment Handler
  const handleApplyReassignment = () => {
    if (selectedBookingForReassign && newTherapistId) {
      onReassignTherapist(selectedBookingForReassign.id, newTherapistId);
      setSelectedBookingForReassign(null);
      setNewTherapistId('');
    }
  };

  // Open Therapist Modal for Add
  const handleOpenAddTherapist = () => {
    setEditingTherapist(null);
    setTherapistForm({
      name: '',
      gender: 'femenino',
      phone: '+52 55 ',
      email: '',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      bio: 'Fisioterapeuta y Terapeuta Holística Certificada.',
      certifications: 'CIBTAC International, Masaje Holístico',
      vehicleType: 'Auto Ejecutivo',
      coverageZones: ['Interlomas', 'Santa Fe'],
      newZoneTagInput: ''
    });
    setShowTherapistModal(true);
  };

  // Open Therapist Modal for Edit
  const handleOpenEditTherapist = (t: Therapist) => {
    setEditingTherapist(t);
    setTherapistForm({
      name: t.name,
      gender: t.gender,
      phone: t.phone,
      email: t.email,
      photo: t.photo,
      bio: t.bio,
      certifications: t.certifications.join(', '),
      vehicleType: t.vehicleType,
      coverageZones: t.coverageZones || [],
      newZoneTagInput: ''
    });
    setShowTherapistModal(true);
  };

  // Save Therapist (Add or Edit)
  const handleSaveTherapist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapistForm.name.trim()) return;

    const certList = therapistForm.certifications
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    if (editingTherapist) {
      const updated: Therapist = {
        ...editingTherapist,
        name: therapistForm.name,
        gender: therapistForm.gender,
        phone: therapistForm.phone,
        email: therapistForm.email,
        photo: therapistForm.photo,
        bio: therapistForm.bio,
        certifications: certList,
        vehicleType: therapistForm.vehicleType,
        coverageZones: therapistForm.coverageZones,
      };
      if (onEditTherapist) onEditTherapist(updated);
    } else {
      const newTherapist: Therapist = {
        id: `ther-${Date.now()}`,
        name: therapistForm.name,
        gender: therapistForm.gender,
        rating: 5.0,
        reviewCount: 1,
        totalServices: 0,
        bio: therapistForm.bio,
        certifications: certList,
        status: 'disponible',
        currentZone: therapistForm.coverageZones[0] || 'Ciudad de México',
        coverageZones: therapistForm.coverageZones,
        phone: therapistForm.phone,
        email: therapistForm.email || `${therapistForm.name.toLowerCase().replace(/\s+/g, '.')}@essenya.com`,
        photo: therapistForm.photo,
        vehicleType: therapistForm.vehicleType,
        lat: 19.4100,
        lng: -99.2000
      };
      if (onAddTherapist) onAddTherapist(newTherapist);
    }

    setShowTherapistModal(false);
  };

  // Toggle coverage zone selection in form
  const handleToggleZoneInForm = (zoneName: string) => {
    setTherapistForm(prev => {
      const exists = prev.coverageZones.includes(zoneName);
      return {
        ...prev,
        coverageZones: exists 
          ? prev.coverageZones.filter(z => z !== zoneName)
          : [...prev.coverageZones, zoneName]
      };
    });
  };

  // Add custom zone tag in form
  const handleAddCustomZoneTag = () => {
    const val = therapistForm.newZoneTagInput.trim();
    if (val && !therapistForm.coverageZones.includes(val)) {
      setTherapistForm(prev => ({
        ...prev,
        coverageZones: [...prev.coverageZones, val],
        newZoneTagInput: ''
      }));
    }
  };

  // Open Zone Modal for Add
  const handleOpenAddZone = () => {
    setEditingZone(null);
    setZoneForm({
      name: '',
      coloniasesInput: '',
      surgeMultiplier: 1.0
    });
    setShowZoneModal(true);
  };

  // Open Zone Modal for Edit
  const handleOpenEditZone = (z: CoverageZone) => {
    setEditingZone(z);
    setZoneForm({
      name: z.name,
      coloniasesInput: z.coloniases.join(', '),
      surgeMultiplier: z.surgeMultiplier
    });
    setShowZoneModal(true);
  };

  // Save Zone (Add or Edit)
  const handleSaveZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) return;

    const coloniasesArr = zoneForm.coloniasesInput
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    if (editingZone) {
      const updated: CoverageZone = {
        ...editingZone,
        name: zoneForm.name,
        coloniases: coloniasesArr,
        surgeMultiplier: zoneForm.surgeMultiplier,
        isHighDemand: zoneForm.surgeMultiplier > 1.0
      };
      if (onEditZone) onEditZone(updated);
    } else {
      const newZ: CoverageZone = {
        id: `zone-${Date.now()}`,
        name: zoneForm.name,
        coloniases: coloniasesArr,
        activeTherapists: 0,
        surgeMultiplier: zoneForm.surgeMultiplier,
        isHighDemand: zoneForm.surgeMultiplier > 1.0,
        isCovered: true
      };
      if (onAddZone) onAddZone(newZ);
    }

    setShowZoneModal(false);
  };

  // Filtered Therapists
  const filteredTherapists = therapists.filter(t => {
    const term = (searchTerm || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    const matchesSearch = name.includes(term) ||
      (Array.isArray(t.coverageZones) && t.coverageZones.some(z => String(z || '').toLowerCase().includes(term)));
    
    if (selectedZoneFilter === 'todos') return matchesSearch;
    return matchesSearch && Array.isArray(t.coverageZones) && t.coverageZones.includes(selectedZoneFilter);
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white pb-20 transition-colors duration-300">
      
      {/* Confidential Admin Header Banner */}
      <div className="bg-amber-100 dark:bg-amber-950/20 border-b border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs px-4 py-2 text-center font-medium flex items-center justify-center space-x-2">
        <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
        <span>
          <strong>Uso Interno de Administración Operativa:</strong> Asignación automática de servicios, filtro de disponibilidad y gestión de zonas. Esta información es confidencial y NUNCA se muestra al cliente.
        </span>
      </div>

      {/* Top Admin Bar */}
      <section className="bg-white dark:bg-[#141414] border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] flex items-center justify-center text-black font-bold shadow-sm">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">Centro de Control Operativo ESSENYA</h2>
                <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Acceso Administrador
                </span>
              </div>
              <p className="text-xs text-[#6B655F] dark:text-[#888888]">Supervisión Ejecutiva, Terapeutas, Zonas de Cobertura & Despacho Inteligente</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-[#FAF6EE] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#C9A55B]/30 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
              <span className="text-[10px] text-[#6B655F] dark:text-[#888888] uppercase block font-semibold">Facturación del Día</span>
              <span className="text-sm font-bold text-[#806020] dark:text-gold-gradient">${(totalRevenue ?? 0).toLocaleString()} MXN</span>
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center space-x-2 mt-6 border-t border-[#E5DFD3] dark:border-[#C9A55B]/10 pt-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: TrendingUp },
            { id: 'bookings', label: 'Monitor de Reservas', icon: Calendar },
            { id: 'therapists', label: 'Terapeutas y Coberturas', icon: Users },
            { id: 'zones', label: 'Zonas & Tarifa Dinámica', icon: MapPin },
            { id: 'clients', label: 'Clientes VIP', icon: Award },
            { id: 'audit', label: 'Bitácora de Auditoría', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSubTab === tab.id
                  ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/50 shadow-xs'
                  : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* SUBTAB 1: DASHBOARD */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 space-y-2 shadow-sm">
                <div className="flex justify-between items-center text-[#6B655F] dark:text-[#888888]">
                  <span className="text-xs uppercase font-semibold">Facturación Bruta</span>
                  <DollarSign className="w-5 h-5 text-[#806020] dark:text-[#C9A55B]" />
                </div>
                <span className="text-3xl font-bold text-[#806020] dark:text-gold-gradient">${(totalRevenue ?? 0).toLocaleString()} MXN</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">+18.4% vs semana anterior</span>
              </div>

              <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 space-y-2 shadow-sm">
                <div className="flex justify-between items-center text-[#6B655F] dark:text-[#888888]">
                  <span className="text-xs uppercase font-semibold">Servicios Activos</span>
                  <Activity className="w-5 h-5 text-[#806020] dark:text-[#C9A55B]" />
                </div>
                <span className="text-3xl font-bold text-[#1C1917] dark:text-white">{activeBookingsCount} Reservas</span>
                <span className="text-[10px] text-[#6B655F] dark:text-[#888888] block">Tiempo medio de respuesta: 4.2 min</span>
              </div>

              <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 space-y-2 shadow-sm">
                <div className="flex justify-between items-center text-[#6B655F] dark:text-[#888888]">
                  <span className="text-xs uppercase font-semibold">Terapeutas Registradas</span>
                  <Users className="w-5 h-5 text-[#806020] dark:text-[#C9A55B]" />
                </div>
                <span className="text-3xl font-bold text-[#1C1917] dark:text-white">{onlineTherapistsCount} / {therapists.length} Online</span>
                <span className="text-[10px] text-[#6B655F] dark:text-[#888888] block">Interlomas, Santa Fe, San Ángel, Lomas</span>
              </div>

              <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 space-y-2 shadow-sm">
                <div className="flex justify-between items-center text-[#6B655F] dark:text-[#888888]">
                  <span className="text-xs uppercase font-semibold">CSAT de Servicio</span>
                  <Award className="w-5 h-5 text-[#806020] dark:text-[#C9A55B]" />
                </div>
                <span className="text-3xl font-bold text-[#1C1917] dark:text-white">4.98 ⭐</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">99.4% Calificación Máxima</span>
              </div>
            </div>

            {/* Dispatch Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-4 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-[#1C1917] dark:text-white flex items-center justify-between">
                  <span>Monitor de Despacho Operativo</span>
                  <span className="text-xs text-[#806020] dark:text-[#C9A55B] font-mono">En tiempo real</span>
                </h3>

                <div className="space-y-3">
                  {bookings.map((bk) => (
                    <div key={bk.id} className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#E5DFD3] dark:border-[#333333] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-[#806020] dark:text-[#C9A55B]">{bk.code}</span>
                          <span className="text-xs font-bold text-[#1C1917] dark:text-white">{bk.serviceName}</span>
                        </div>
                        <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
                          Cliente: {bk.clientName} ({bk.cityZone}) • Terapeuta: {bk.therapistName || 'Sin asignar'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-[11px] font-bold bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] px-2.5 py-1 rounded-full uppercase border border-[#C9A55B]/30">
                          {bk.state}
                        </span>

                        <button
                          onClick={() => setSelectedBookingForReassign(bk)}
                          className="px-3 py-1.5 bg-[#FAF6EE] dark:bg-[#222222] border border-[#C9A55B]/40 text-xs text-[#806020] dark:text-[#C9A55B] font-semibold rounded-lg hover:bg-[#C9A55B] hover:text-black transition-colors"
                        >
                          Asignar / Sugerir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coverage Zone Overview */}
              <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-4 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-[#1C1917] dark:text-white">Resumen de Zonas de Cobertura</h3>
                <div className="space-y-3">
                  {zones.map((z) => {
                    const coveringCount = therapists.filter(t => 
                      Array.isArray(t.coverageZones) && t.coverageZones.some(cz => Array.isArray(z.coloniases) && z.coloniases.some(col => String(col || '').toLowerCase().includes(String(cz || '').toLowerCase()) || String(cz || '').toLowerCase().includes(String(col || '').toLowerCase())))
                    ).length;

                    return (
                      <div key={z.id} className="p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-xl border border-[#E5DFD3] dark:border-[#333333] flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-[#1C1917] dark:text-white">{z.name}</h4>
                          <span className="text-[10px] text-[#6B655F] dark:text-[#888888]">
                            {coveringCount || z.activeTherapists} Terapeutas habilitadas
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-[#806020] dark:text-[#C9A55B]">{z.surgeMultiplier}x Tarifa</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: BOOKINGS MONITOR */}
        {activeSubTab === 'bookings' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Administrador de Reservaciones del Ecosistema</h3>

            <div className="space-y-4">
              {bookings.map((bk) => (
                <div key={bk.id} className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-bold text-[#806020] dark:text-[#C9A55B]">{bk.code}</span>
                      <span className="text-xs font-bold text-[#1C1917] dark:text-white">{bk.serviceName} ({bk.durationMinutes} min)</span>
                    </div>
                    <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                      Cliente: {bk.clientName} ({bk.clientPhone}) • Domicilio: {bk.clientAddress}
                    </p>
                    <p className="text-xs text-[#6B655F] dark:text-[#888888]">
                      Zona: <span className="text-[#1C1917] dark:text-white font-semibold">{bk.cityZone}</span> | Terapeuta: <span className="text-[#806020] dark:text-[#C9A55B] font-semibold">{bk.therapistName || 'Pendiente de Asignación'}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-xs text-[#6B655F] dark:text-[#888888] block">Monto Total</span>
                      <span className="text-lg font-bold text-[#806020] dark:text-gold-gradient">${(bk.total ?? 0).toLocaleString()} MXN</span>
                    </div>

                    <button
                      onClick={() => setSelectedBookingForReassign(bk)}
                      className="px-4 py-2 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-semibold text-xs rounded-xl gold-button-hover"
                    >
                      Asignar Terapeuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 3: THERAPISTS & COVERAGE ZONES MANAGEMENT (ADMIN ONLY) */}
        {activeSubTab === 'therapists' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Directorio Operativo de Terapeutas</h3>
                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    Uso Interno Admin
                  </span>
                </div>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">
                  Administra disponibilidad, datos personales y asigna las zonas de cobertura específicas a cada terapeuta.
                </p>
              </div>

              <button
                onClick={handleOpenAddTherapist}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-xs rounded-xl shadow-md gold-button-hover"
              >
                <UserPlus className="w-4 h-4 text-black" />
                <span>+ Agregar Nueva Terapeuta</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#141414] p-4 rounded-xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 shadow-sm">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-[#6B655F] dark:text-[#888888] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o zona..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-lg pl-9 pr-4 py-2 text-xs text-[#1C1917] dark:text-white placeholder-[#888888] focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="w-full sm:w-auto flex items-center space-x-2">
                <span className="text-xs text-[#6B655F] dark:text-[#888888] shrink-0">Filtrar Zona:</span>
                <select
                  value={selectedZoneFilter}
                  onChange={(e) => setSelectedZoneFilter(e.target.value)}
                  className="bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] text-xs text-[#1C1917] dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C9A55B]"
                >
                  <option value="todos" className="bg-white dark:bg-[#141414]">Todas las zonas</option>
                  {PRESET_ZONES_SUGGESTIONS.slice(0, 15).map(z => (
                    <option key={z} value={z} className="bg-white dark:bg-[#141414]">{z}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Therapists List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTherapists.map((t) => (
                <div key={t.id} className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-4 relative group shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <img src={t.photo || undefined} alt={t.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A55B] shadow-md" />
                      <div>
                        <h4 className="font-bold text-[#1C1917] dark:text-white text-base flex items-center gap-2">
                          <span>{t.name}</span>
                          <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                            {t.status}
                          </span>
                        </h4>
                        <p className="text-xs text-[#806020] dark:text-[#C9A55B] flex items-center mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-[#C9A55B] text-[#C9A55B] mr-1" />
                          <span>{t.rating} rating • {t.totalServices} servicios</span>
                        </p>
                        <p className="text-[11px] text-[#6B655F] dark:text-[#888888] mt-0.5">
                          📞 {t.phone} | ✉️ {t.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditTherapist(t)}
                        title="Editar Terapeuta y Zonas"
                        className="p-2 bg-[#FAF6EE] dark:bg-[#222222] hover:bg-[#C9A55B] hover:text-black text-[#806020] dark:text-[#C9A55B] rounded-lg transition-colors border border-[#C9A55B]/30"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {onDeleteTherapist && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar a ${t.name}?`)) {
                              onDeleteTherapist(t.id);
                            }
                          }}
                          title="Eliminar Terapeuta"
                          className="p-2 bg-red-100 dark:bg-red-950/20 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white rounded-lg transition-colors border border-red-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Coverage Zones Badges (ADMIN ONLY FEATURE) */}
                  <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3.5 rounded-xl border border-[#E5DFD3] dark:border-[#2B2B2B] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#806020] dark:text-[#C9A55B] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C9A55B]" />
                        <span>Zonas de Cobertura Asignadas ({t.coverageZones?.length || 0}):</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 no-scrollbar">
                      {t.coverageZones && t.coverageZones.length > 0 ? (
                        t.coverageZones.map((z, idx) => (
                          <span key={idx} className="bg-white dark:bg-[#262626] border border-[#E5DFD3] dark:border-[#C9A55B]/30 text-[#1C1917] dark:text-white text-[10px] font-semibold px-2.5 py-1 rounded-md">
                            {z}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400/80 italic">Sin zonas asignadas</span>
                      )}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="text-xs text-[#6B655F] dark:text-[#AAAAAA] space-y-1 pt-1">
                    <span className="font-bold text-[#1C1917] dark:text-white text-[11px]">Certificaciones Oficiales:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.certifications.map((c, idx) => (
                        <span key={idx} className="bg-[#FAF6EE] dark:bg-[#222222] text-[#6B655F] dark:text-[#888888] text-[10px] px-2 py-0.5 rounded border border-[#E5DFD3] dark:border-[#333333]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 4: COVERAGE ZONES MANAGEMENT (ADMIN ONLY) */}
        {activeSubTab === 'zones' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Gestión de Zonas de Cobertura</h3>
                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    Uso Interno Admin
                  </span>
                </div>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">
                  Administra las zonas habilitadas en la Ciudad de México y consulta qué terapeutas están asignadas a cada sector.
                </p>
              </div>

              <button
                onClick={handleOpenAddZone}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-xs rounded-xl shadow-md gold-button-hover"
              >
                <Globe className="w-4 h-4 text-black" />
                <span>+ Crear Nueva Zona</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {zones.map((z) => {
                // Find therapists whose coverageZones list contains any of this zone's subareas
                const assignedTherapists = therapists.filter(t => 
                  Array.isArray(t.coverageZones) && t.coverageZones.some(cz => 
                    String(z.name || '').toLowerCase().includes(String(cz || '').toLowerCase()) || 
                    (Array.isArray(z.coloniases) && z.coloniases.some(col => String(col || '').toLowerCase().includes(String(cz || '').toLowerCase()) || String(cz || '').toLowerCase().includes(String(col || '').toLowerCase())))
                  )
                );

                return (
                  <div key={z.id} className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-4 shadow-sm">
                    <div className="flex justify-between items-start border-b border-[#E5DFD3] dark:border-[#222222] pb-3">
                      <div>
                        <h4 className="font-bold text-[#1C1917] dark:text-white text-base">{z.name}</h4>
                        <span className="text-[10px] text-[#6B655F] dark:text-[#888888] block mt-0.5">ID: {z.id}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] bg-[#C9A55B]/15 px-3 py-1 rounded-full border border-[#C9A55B]/30">
                          Tarifa: {z.surgeMultiplier}x
                        </span>

                        <button
                          onClick={() => handleOpenEditZone(z)}
                          className="p-1.5 bg-[#FAF6EE] dark:bg-[#222222] hover:bg-[#C9A55B] hover:text-black text-[#806020] dark:text-[#C9A55B] rounded-lg transition-colors border border-[#C9A55B]/30"
                          title="Editar Zona"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteZone && (
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de eliminar la zona ${z.name}?`)) {
                                onDeleteZone(z.id);
                              }
                            }}
                            className="p-1.5 bg-red-100 dark:bg-red-950/20 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white rounded-lg transition-colors border border-red-500/30"
                            title="Eliminar Zona"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase block mb-1">Colonias y Puntos Incluidos:</span>
                      <div className="flex flex-wrap gap-1">
                        {z.coloniases.map((col, idx) => (
                          <span key={idx} className="bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA] text-[10px] px-2 py-0.5 rounded">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Assigned Therapists for this Zone */}
                    <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#2A2A2A] space-y-2">
                      <span className="text-xs font-bold text-[#1C1917] dark:text-white flex items-center justify-between">
                        <span>Terapeutas Disponibles para esta Zona ({assignedTherapists.length}):</span>
                        <Users className="w-3.5 h-3.5 text-[#C9A55B]" />
                      </span>

                      {assignedTherapists.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {assignedTherapists.map(t => (
                            <div key={t.id} className="flex items-center space-x-1.5 bg-white dark:bg-[#242424] px-2.5 py-1 rounded-lg border border-[#E5DFD3] dark:border-[#3a3a3a]">
                              <img src={t.photo || undefined} alt="" className="w-5 h-5 rounded-full object-cover" />
                              <span className="text-[11px] text-[#1C1917] dark:text-white font-medium">{t.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">⚠️ Ninguna terapeuta cubre actualmente esta zona directamente.</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[#6B655F] dark:text-[#888888]">Estado de Demanda: {z.isHighDemand ? '🔥 Alta Demanda' : 'Estándar'}</span>
                      <button
                        onClick={() => onToggleZoneSurge(z.id, z.surgeMultiplier === 1.0 ? 1.25 : 1.0)}
                        className="px-3 py-1.5 bg-[#FAF6EE] dark:bg-[#222222] border border-[#C9A55B]/40 text-[#806020] dark:text-[#C9A55B] font-semibold text-xs rounded-lg hover:bg-[#C9A55B] hover:text-black transition-colors"
                      >
                        {z.surgeMultiplier === 1.0 ? 'Activar Surge 1.25x' : 'Desactivar Surge'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 5: CLIENTS */}
        {activeSubTab === 'clients' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Clientes VIP y Socios de Club</h3>

            <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-4 shadow-sm">
              <div className="flex items-center space-x-4 border-b border-[#E5DFD3] dark:border-[#222222] pb-4">
                <img src={clients[0]?.photo || undefined} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A55B]" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-[#1C1917] dark:text-white text-lg">{clients[0]?.name}</h4>
                    <span className="bg-[#C9A55B] text-black font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                      Socio {clients[0]?.membershipTier}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">{clients[0]?.email} • {clients[0]?.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
                  <span className="text-[#6B655F] dark:text-[#888888] uppercase block text-[10px]">Total Reservas</span>
                  <span className="font-bold text-[#1C1917] dark:text-white text-base">{clients[0]?.totalBookings} Sesiones</span>
                </div>

                <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
                  <span className="text-[#6B655F] dark:text-[#888888] uppercase block text-[10px]">LTV Acumulado</span>
                  <span className="font-bold text-[#806020] dark:text-gold-gradient text-base">${(clients[0]?.spentTotal ?? 0).toLocaleString()} MXN</span>
                </div>

                <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
                  <span className="text-[#6B655F] dark:text-[#888888] uppercase block text-[10px]">Puntos VIP</span>
                  <span className="font-bold text-[#1C1917] dark:text-white text-base">{clients[0]?.rewardsPoints} Pts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 6: AUDIT LOGS */}
        {activeSubTab === 'audit' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Bitácora de Auditoría de Seguridad</h3>

            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF6EE] dark:bg-[#1F1F1F] text-[#806020] dark:text-[#C9A55B] uppercase text-[10px] font-bold border-b border-[#E5DFD3] dark:border-[#333333]">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Usuario / Rol</th>
                    <th className="p-4">Acción</th>
                    <th className="p-4">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD3] dark:divide-[#222222]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1A1A1A] transition-colors">
                      <td className="p-4 font-mono text-[#6B655F] dark:text-[#888888]">{log.timestamp}</td>
                      <td className="p-4 font-bold text-[#1C1917] dark:text-white">{log.userName} ({log.userRole})</td>
                      <td className="p-4 text-[#806020] dark:text-[#C9A55B] font-semibold">{log.action}</td>
                      <td className="p-4 text-[#6B655F] dark:text-[#AAAAAA]">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* SMART REASSIGNMENT & DISPATCH MODAL */}
      {selectedBookingForReassign && (() => {
        // Find matching therapists who cover the client's zone
        const bookingZone = selectedBookingForReassign.cityZone || '';
        const bookingAddress = selectedBookingForReassign.clientAddress || '';
        const fullLocation = `${bookingZone} ${bookingAddress}`.toLowerCase();

        const suggestedTherapists = therapists.filter(t => {
          if (!Array.isArray(t.coverageZones) || t.coverageZones.length === 0) return false;
          return t.coverageZones.some(cz => 
            fullLocation.includes(String(cz || '').toLowerCase()) || String(cz || '').toLowerCase().includes(bookingZone.toLowerCase())
          );
        });

        const hasMatchingTherapists = suggestedTherapists.length > 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#222222] pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
                    <span>Despacho Inteligente</span>
                    <span className="font-mono text-xs text-[#806020] dark:text-[#C9A55B]">[{selectedBookingForReassign.code}]</span>
                  </h3>
                  <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                    Cliente: {selectedBookingForReassign.clientName} | Ubicación: <strong className="text-[#1C1917] dark:text-white">{selectedBookingForReassign.cityZone}</strong>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedBookingForReassign(null)} 
                  className="p-1 rounded-lg text-[#6B655F] dark:text-[#888888] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#F5F1EA] dark:hover:bg-[#222222]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification Banner based on Zone Match */}
              {hasMatchingTherapists ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/40 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Sugerencia Automática por Cobertura de Zona</p>
                    <p className="text-[11px] opacity-90">
                      Se encontraron {suggestedTherapists.length} terapeuta(s) que cubren oficialmente la zona <span className="underline font-semibold">{bookingZone}</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/50 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">⚠️ Sin Terapeuta Directa Asignada a esta Zona</p>
                    <p className="text-[11px] opacity-90">
                      Ninguna terapeuta tiene registrada la zona <span className="font-bold">{bookingZone}</span> en su perfil. Por favor realiza una asignación manual por excepción.
                    </p>
                  </div>
                </div>
              )}

              {/* Suggested Therapists Quick Select */}
              {hasMatchingTherapists && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] uppercase block">
                    Terapeutas Recomendadas que Cubren la Zona:
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                    {suggestedTherapists.map(st => (
                      <div 
                        key={st.id}
                        onClick={() => setNewTherapistId(st.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          newTherapistId === st.id 
                            ? 'bg-[#C9A55B]/20 border-[#C9A55B] text-[#1C1917] dark:text-white font-bold' 
                            : 'bg-[#FAF8F5] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] hover:border-[#C9A55B]/50 text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <img src={st.photo || undefined} alt="" className="w-8 h-8 rounded-full object-cover border border-[#C9A55B]" />
                          <div>
                            <p className="text-xs font-bold text-[#1C1917] dark:text-white">{st.name}</p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">🟢 Cobertura Directa de Zona</p>
                          </div>
                        </div>
                        {newTherapistId === st.id && <Check className="w-4 h-4 text-[#C9A55B]" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Select Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#6B655F] dark:text-[#888888] uppercase block">
                  Todas las Terapeutas del Sistema:
                </label>
                <select
                  value={newTherapistId}
                  onChange={(e) => setNewTherapistId(e.target.value)}
                  className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-4 py-3 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                >
                  <option value="" className="bg-white dark:bg-[#141414]">-- Seleccionar Terapeuta --</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id} className="bg-white dark:bg-[#141414]">
                      {t.name} ({t.gender}) — {t.coverageZones?.length || 0} Zonas
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-[#E5DFD3] dark:border-[#222222]">
                <button
                  onClick={() => setSelectedBookingForReassign(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD3] dark:border-[#333333] text-xs text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyReassignment}
                  disabled={!newTherapistId}
                  className="px-5 py-2 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-xs rounded-xl gold-button-hover shadow-lg disabled:opacity-50"
                >
                  Confirmar Asignación Manual
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* THERAPIST ADD / EDIT MODAL */}
      {showTherapistModal && (
        <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#222222] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#C9A55B]" />
                <span>{editingTherapist ? 'Editar Terapeuta y Zonas de Cobertura' : 'Agregar Nueva Terapeuta'}</span>
              </h3>
              <button onClick={() => setShowTherapistModal(false)} className="p-1 rounded-lg text-[#6B655F] dark:text-[#888888] hover:text-[#1C1917] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTherapist} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={therapistForm.name}
                    onChange={(e) => setTherapistForm({ ...therapistForm, name: e.target.value })}
                    placeholder="Ej. Jaqueline Arroyo Fabián"
                    className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>

                <div>
                  <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Género</label>
                  <select
                    value={therapistForm.gender}
                    onChange={(e) => setTherapistForm({ ...therapistForm, gender: e.target.value as any })}
                    className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  >
                    <option value="femenino" className="bg-white dark:bg-[#141414]">Femenino</option>
                    <option value="masculino" className="bg-white dark:bg-[#141414]">Masculino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Teléfono Móvil (WhatsApp)</label>
                  <input
                    type="text"
                    value={therapistForm.phone}
                    onChange={(e) => setTherapistForm({ ...therapistForm, phone: e.target.value })}
                    className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>

                <div>
                  <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Correo Electrónico</label>
                  <input
                    type="email"
                    value={therapistForm.email}
                    onChange={(e) => setTherapistForm({ ...therapistForm, email: e.target.value })}
                    placeholder="terapeuta@essenya.com"
                    className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Certificaciones (separadas por coma)</label>
                <input
                  type="text"
                  value={therapistForm.certifications}
                  onChange={(e) => setTherapistForm({ ...therapistForm, certifications: e.target.value })}
                  className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              {/* COVERAGE ZONES ASSIGNMENT SECTION */}
              <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#E5DFD3] dark:border-[#333333] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#806020] dark:text-[#C9A55B] uppercase text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#C9A55B]" />
                    <span>Zonas de Cobertura Asignadas (Selección Múltiple):</span>
                  </label>
                  <span className="text-[10px] text-[#6B655F] dark:text-[#888888]">{therapistForm.coverageZones.length} zonas activas</span>
                </div>

                {/* Preset suggestions badges to toggle */}
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar border border-[#E5DFD3] dark:border-[#262626] p-2.5 rounded-lg bg-white dark:bg-[#141414]">
                  {PRESET_ZONES_SUGGESTIONS.map((zoneName) => {
                    const isSelected = therapistForm.coverageZones.includes(zoneName);
                    return (
                      <button
                        key={zoneName}
                        type="button"
                        onClick={() => handleToggleZoneInForm(zoneName)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-[#C9A55B] text-black font-bold shadow-xs'
                            : 'bg-[#F5F1EA] dark:bg-[#222222] text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#E5DFD3] dark:hover:bg-[#333333]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                        <span>{zoneName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Zone Tag Input */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    placeholder="Agregar otra colonia/zona específica..."
                    value={therapistForm.newZoneTagInput}
                    onChange={(e) => setTherapistForm({ ...therapistForm, newZoneTagInput: e.target.value })}
                    className="flex-1 bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#333333] rounded-lg px-3 py-1.5 text-xs text-[#1C1917] dark:text-white placeholder-[#888888] focus:outline-none focus:border-[#C9A55B]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomZoneTag}
                    className="px-3 py-1.5 bg-[#FAF6EE] dark:bg-[#2A2A2A] text-[#806020] dark:text-[#C9A55B] font-bold text-xs rounded-lg hover:bg-[#C9A55B] hover:text-black transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E5DFD3] dark:border-[#222222]">
                <button
                  type="button"
                  onClick={() => setShowTherapistModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD3] dark:border-[#333333] text-xs text-[#6B655F] dark:text-[#AAAAAA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-xs rounded-xl gold-button-hover shadow-md"
                >
                  Guardar Terapeuta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COVERAGE ZONE ADD / EDIT MODAL */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#222222] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#C9A55B]" />
                <span>{editingZone ? 'Editar Zona de Cobertura' : 'Crear Nueva Zona'}</span>
              </h3>
              <button onClick={() => setShowZoneModal(false)} className="p-1 rounded-lg text-[#6B655F] dark:text-[#888888] hover:text-[#1C1917] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Nombre de la Zona *</label>
                <input
                  type="text"
                  required
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  placeholder="Ej. Bosques & Virreyes"
                  className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Colonias Incluidas (separadas por coma)</label>
                <textarea
                  rows={3}
                  value={zoneForm.coloniasesInput}
                  onChange={(e) => setZoneForm({ ...zoneForm, coloniasesInput: e.target.value })}
                  placeholder="Ej. Interlomas, Bosque Real, Tecamachalco, La Herradura"
                  className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="block text-[#6B655F] dark:text-[#AAAAAA] mb-1 font-semibold">Multiplicador de Tarifa Dinámica</label>
                <select
                  value={zoneForm.surgeMultiplier}
                  onChange={(e) => setZoneForm({ ...zoneForm, surgeMultiplier: parseFloat(e.target.value) })}
                  className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                >
                  <option value={1.0} className="bg-white dark:bg-[#141414]">1.0x (Tarifa Estándar)</option>
                  <option value={1.15} className="bg-white dark:bg-[#141414]">1.15x (Alta Demanda Moderna)</option>
                  <option value={1.25} className="bg-white dark:bg-[#141414]">1.25x (Surge Peak Hours)</option>
                  <option value={1.5} className="bg-white dark:bg-[#141414]">1.5x (Zona Exclusiva Distante)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E5DFD3] dark:border-[#222222]">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD3] dark:border-[#333333] text-xs text-[#6B655F] dark:text-[#AAAAAA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-xs rounded-xl gold-button-hover shadow-md"
                >
                  Guardar Zona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

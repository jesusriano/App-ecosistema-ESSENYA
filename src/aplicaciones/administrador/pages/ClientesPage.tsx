import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Search, ShieldCheck, Mail, Phone, MapPin, 
  Award, Lock, Unlock, Clock, DollarSign, Edit, Plus, X, Heart, AlertTriangle
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { ClientUser } from '../../../shared/types';
import { calculateMembershipTier } from '../../cliente/services/membershipService';

export const sanitizeClientUser = (raw: any): ClientUser => {
  if (!raw) {
    return {
      id: `client-${Date.now()}`,
      name: 'Cliente VIP',
      email: '',
      phone: '',
      membershipTier: 'Platino',
      totalBookings: 0,
      spentTotal: 0,
      address: '',
      cityZone: 'Polanco / Reforma',
      photo: '',
      rewardsPoints: 0
    };
  }
  const name = raw.name || [raw.nombre, raw.apellidos].filter(Boolean).join(' ') || raw.displayName || 'Cliente VIP';
  const email = raw.email || raw.correo || '';
  const phone = raw.phone || raw.telefono || '';
  const cityZone = raw.cityZone || raw.ciudad || raw.zone || 'Ciudad de México';
  const address = raw.address || raw.direccion || '';
  const photo = raw.photo || raw.fotografia || raw.photoURL || '';
  const tier = (raw.membershipTier === 'Diamond' || raw.membershipTier === 'Gold' || raw.membershipTier === 'Platino')
    ? raw.membershipTier
    : 'Platino';

  return {
    ...raw,
    id: String(raw.id || raw.userId || `client-${Date.now()}`),
    name: String(name),
    email: String(email),
    phone: String(phone),
    membershipTier: tier,
    totalBookings: Number(raw.totalBookings || 0),
    spentTotal: Number(raw.spentTotal || 0),
    address: String(address),
    cityZone: String(cityZone),
    photo: String(photo),
    rewardsPoints: Number(raw.rewardsPoints || 0)
  };
};

export const ClientesPage: React.FC = () => {
  const { clients, bookings, handleEditClient, handleToggleBlockClient } = useAdmin();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('todos');

  // Selected Client Details Modal
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [editClientModal, setEditClientModal] = useState<ClientUser | null>(null);

  // Edit Form State - strictly Platino -> Gold -> Diamond hierarchy
  const [formState, setFormState] = useState<{
    name: string;
    email: string;
    phone: string;
    membershipTier: 'Platino' | 'Gold' | 'Diamond';
    address: string;
    cityZone: string;
    specialNotes: string;
    vipPreferences: string;
  }>({
    name: '',
    email: '',
    phone: '',
    membershipTier: 'Platino',
    address: '',
    cityZone: '',
    specialNotes: '',
    vipPreferences: ''
  });

  const getEffectiveTier = (c: ClientUser): 'Platino' | 'Gold' | 'Diamond' => {
    if (!c) return 'Platino';
    if (c.membershipTier === 'Diamond' || c.membershipTier === 'Gold' || c.membershipTier === 'Platino') {
      return c.membershipTier;
    }
    const clientBookings = (bookings || []).filter(b => b && b.clientId === c.id);
    const finishedAndPaid = clientBookings.filter(b => 
      b && b.state === 'servicio_finalizado' && (b.paymentStatus === 'pagado' || b.paid === true)
    ).length;
    const computed = calculateMembershipTier(finishedAndPaid || c.totalBookings || 0);
    return computed.tierName as any;
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'Diamond':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40';
      case 'Gold':
        return 'bg-[#C9A55B]/15 text-[#9A7B38] dark:text-[#C9A55B] border border-[#C9A55B]/40';
      case 'Platino':
      default:
        return 'bg-slate-400/15 text-slate-700 dark:text-slate-300 border border-slate-400/40';
    }
  };

  const filteredClients = (clients || [])
    .filter(Boolean)
    .map(sanitizeClientUser)
    .filter(c => {
      const effectiveTier = getEffectiveTier(c);
      const term = (searchTerm || '').toLowerCase().trim();
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = String(c.phone || '').toLowerCase();
      const cityZone = (c.cityZone || '').toLowerCase();

      const matchesSearch = 
        !term ||
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        cityZone.includes(term);

      const matchesTier = tierFilter === 'todos' || effectiveTier === tierFilter;
      return matchesSearch && matchesTier;
    });

  const handleOpenEdit = (c: ClientUser) => {
    setEditClientModal(c);
    const effectiveTier = getEffectiveTier(c);
    setFormState({
      name: c.name,
      email: c.email,
      phone: c.phone,
      membershipTier: effectiveTier,
      address: c.address,
      cityZone: c.cityZone,
      specialNotes: c.specialNotes || '',
      vipPreferences: c.vipPreferences || ''
    });
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientModal) return;

    const updated: ClientUser = {
      ...editClientModal,
      name: formState.name,
      email: formState.email,
      phone: formState.phone,
      membershipTier: formState.membershipTier,
      address: formState.address,
      cityZone: formState.cityZone,
      specialNotes: formState.specialNotes,
      vipPreferences: formState.vipPreferences
    };

    handleEditClient(updated);
    showToast(`Expediente de socio VIP ${updated.name} actualizado.`);
    setEditClientModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#C9A55B]" />
            <span>Gestión & Expedientes de Socios VIP</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Directorio exclusivo de clientes registrados, historial de consumos, niveles VIP unificados y control de acceso.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo, teléfono, zona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-[var(--text-muted)] shrink-0">Membresía:</span>
          {['todos', 'Platino', 'Gold', 'Diamond'].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tierFilter === tier
                  ? 'bg-[#C9A55B] text-black font-bold'
                  : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              {tier === 'todos' ? 'Todas' : tier}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((c, index) => {
          const clientBookings = (bookings || []).filter(b => b && b.clientId === c.id);
          const finishedCount = clientBookings.filter(b => b.state === 'servicio_finalizado' && (b.paymentStatus === 'pagado' || b.paid === true)).length;
          const effectiveTier = getEffectiveTier(c);

          return (
            <motion.div 
              key={c.id} 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#C9A55B]/40 rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-all relative"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center space-x-3">
                    <img
                      src={c?.photo || undefined}
                      alt={c.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-[#C9A55B]/40 bg-[var(--bg-subcard)]"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">{c.name}</h3>
                      <span className="text-[10px] font-mono text-[#C9A55B]">ID: {c.id}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getTierBadgeStyle(effectiveTier)}`}>
                      {effectiveTier} VIP
                    </span>
                    <span className="text-[9px] bg-[#C9A55B]/10 text-[#806020] dark:text-[#C9A55B] px-2 py-0.5 rounded-full border border-[#C9A55B]/20 font-bold">
                      {finishedCount} Masajes
                    </span>
                    {c.isBlocked && (
                      <span className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        SUSPENDIDO
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[var(--text-muted)] pt-1">
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" /> <span className="text-[var(--text-primary)]">{c.email}</span></p>
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" /> <span className="text-[var(--text-primary)]">{c.phone}</span></p>
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" /> <span className="text-[var(--text-primary)]">{c.address}</span></p>
                </div>

                {c.specialNotes && (
                  <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl p-2.5 text-[11px] text-amber-600 dark:text-amber-300">
                    <strong>⚠️ Nota VIP:</strong> {c.specialNotes}
                  </div>
                )}
              </div>

              {/* Stats & Controls Footer */}
              <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                <div className="grid grid-cols-2 text-center text-xs bg-[var(--bg-subcard)] rounded-xl p-2">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Reservas</span>
                    <strong className="text-[var(--text-primary)] font-bold">{clientBookings.length || c.totalBookings}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Consumo Total</span>
                    <strong className="text-[#C9A55B] font-bold">${c.spentTotal.toLocaleString()} MXN</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedClient(c)}
                    className="flex-1 py-2 bg-[var(--bg-subcard)] hover:bg-[var(--bg-active)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Ver Expediente
                  </button>

                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-2 bg-[var(--bg-subcard)] hover:bg-[var(--bg-active)] border border-[var(--border-color)] text-[#C9A55B] rounded-xl cursor-pointer"
                    title="Editar Expediente"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleBlockClient(c.id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      c.isBlocked
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                    }`}
                    title={c.isBlocked ? 'Reactivar Cliente' : 'Suspender Cliente'}
                  >
                    {c.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Client Expediente Details Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[#C9A55B]/40 rounded-3xl p-6 max-w-lg w-full space-y-4 relative shadow-2xl">
            <button
              onClick={() => setSelectedClient(null)}
              className="absolute right-5 top-5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 border-b border-[var(--border-color)] pb-4">
              <img
                src={selectedClient?.photo || undefined}
                alt={selectedClient.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C9A55B] bg-[var(--bg-subcard)]"
              />
              <div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getTierBadgeStyle(getEffectiveTier(selectedClient))}`}>
                  Socio VIP {getEffectiveTier(selectedClient)}
                </span>
                <h3 className="text-xl font-serif font-bold text-[var(--text-primary)] mt-1">{selectedClient.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedClient.email} • {selectedClient.phone}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-primary)]">
              <div>
                <strong className="text-[var(--text-primary)] block mb-1">📍 Domicilio Registrado:</strong>
                <p className="bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)]">{selectedClient.address} ({selectedClient.cityZone})</p>
              </div>

              <div>
                <strong className="text-[#C9A55B] block mb-1">✨ Preferencias VIP & Observaciones:</strong>
                <p className="bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)] italic text-[var(--text-primary)]">
                  {selectedClient.vipPreferences || 'Presión Firme. Aceite de Lavanda Francesa. Frecuencias 432Hz.'}
                </p>
              </div>

              {selectedClient.specialNotes && (
                <div>
                  <strong className="text-amber-600 dark:text-amber-400 block mb-1">⚠️ Instrucciones de Seguridad / Caseta:</strong>
                  <p className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-800 dark:text-amber-200">
                    {selectedClient.specialNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] flex justify-end">
              <LuxuryButton variant="gold" size="sm" onClick={() => setSelectedClient(null)}>
                Cerrar Expediente
              </LuxuryButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">Editar Expediente VIP</h3>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs text-[var(--text-muted)]">
              <div>
                <label className="block mb-1 font-semibold text-[var(--text-primary)]">Nombre Completo</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 rounded-xl focus:outline-none focus:border-[#C9A55B]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-[var(--text-primary)]">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 rounded-xl focus:outline-none focus:border-[#C9A55B]"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-[var(--text-primary)]">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 rounded-xl focus:outline-none focus:border-[#C9A55B]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-[var(--text-primary)]">Jerarquía de Membresía ESSENYA</label>
                <select
                  value={formState.membershipTier}
                  onChange={(e) => setFormState({ ...formState, membershipTier: e.target.value as any })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl focus:outline-none focus:border-[#C9A55B]"
                >
                  <option value="Platino">Platino VIP (Nivel Inicial: 0-2 Masajes)</option>
                  <option value="Gold">Gold VIP (3-4 Masajes)</option>
                  <option value="Diamond">Diamond VIP (5+ Masajes)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-[var(--text-primary)]">Domicilio de Servicio</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 rounded-xl focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-[#C9A55B]">Preferencias VIP</label>
                <input
                  type="text"
                  value={formState.vipPreferences}
                  onChange={(e) => setFormState({ ...formState, vipPreferences: e.target.value })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 rounded-xl focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-amber-600 dark:text-amber-400">Instrucciones Especiales / Caseta</label>
                <textarea
                  value={formState.specialNotes}
                  onChange={(e) => setFormState({ ...formState, specialNotes: e.target.value })}
                  rows={2}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] p-3 rounded-xl focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditClientModal(null)}
                  className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
                <LuxuryButton type="submit" variant="gold" size="sm">
                  Guardar Cambios
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

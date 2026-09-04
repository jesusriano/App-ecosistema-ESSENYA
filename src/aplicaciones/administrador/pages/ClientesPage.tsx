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

export const ClientesPage: React.FC = () => {
  const { clients, bookings, handleEditClient, handleToggleBlockClient } = useAdmin();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('todos');

  // Selected Client Details Modal
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [editClientModal, setEditClientModal] = useState<ClientUser | null>(null);

  // Edit Form State
  const [formState, setFormState] = useState<{
    name: string;
    email: string;
    phone: string;
    membershipTier: 'Gold' | 'Diamond' | 'Black';
    address: string;
    cityZone: string;
    specialNotes: string;
    vipPreferences: string;
  }>({
    name: '',
    email: '',
    phone: '',
    membershipTier: 'Gold',
    address: '',
    cityZone: '',
    specialNotes: '',
    vipPreferences: ''
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.cityZone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = tierFilter === 'todos' || c.membershipTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const handleOpenEdit = (c: ClientUser) => {
    setEditClientModal(c);
    setFormState({
      name: c.name,
      email: c.email,
      phone: c.phone,
      membershipTier: c.membershipTier,
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
    showToast(`Expediente de cliente VIP ${updated.name} actualizado.`);
    setEditClientModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#C9A55B]" />
            <span>Gestión & Expedientes de Socios VIP</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Directorio exclusivo de clientes registrados, historial de consumos, observaciones de servicio y control de acceso.
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
            className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-[var(--text-muted)] shrink-0">Membresía:</span>
          {['todos', 'Gold', 'Diamond', 'Black'].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tierFilter === tier
                  ? 'bg-[#C9A55B] text-black font-bold'
                  : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
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
          const clientBookings = bookings.filter(b => b.clientId === c.id);

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
                      className="w-12 h-12 rounded-2xl object-cover border border-[#C9A55B]/40"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-base text-white">{c.name}</h3>
                      <span className="text-[10px] font-mono text-[#C9A55B]">ID: {c.id}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-[#C9A55B]/15 text-[#C9A55B] border border-[#C9A55B]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      {c.membershipTier} VIP
                    </span>
                    {c.isBlocked && (
                      <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        SUSPENDIDO
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#AAAAAA] pt-1">
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" /> {c.email}</p>
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" /> {c.phone}</p>
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" /> {c.address}</p>
                </div>

                {c.specialNotes && (
                  <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl p-2.5 text-[11px] text-amber-300">
                    <strong>⚠️ Nota VIP:</strong> {c.specialNotes}
                  </div>
                )}
              </div>

              {/* Stats & Controls Footer */}
              <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                <div className="grid grid-cols-2 text-center text-xs bg-[var(--bg-subcard)] rounded-xl p-2">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Reservas</span>
                    <strong className="text-white font-bold">{clientBookings.length || c.totalBookings}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Consumo Total</span>
                    <strong className="text-[#C9A55B] font-bold">${c.spentTotal.toLocaleString()} MXN</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedClient(c)}
                    className="flex-1 py-2 bg-[var(--bg-subcard)] hover:bg-[#262626] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Ver Expediente
                  </button>

                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-2 bg-[var(--bg-subcard)] hover:bg-[#262626] border border-[var(--border-color)] text-[#C9A55B] rounded-xl cursor-pointer"
                    title="Editar Expediente"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleBlockClient(c.id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      c.isBlocked
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[#C9A55B]/40 rounded-3xl p-6 max-w-lg w-full space-y-4 relative">
            <button
              onClick={() => setSelectedClient(null)}
              className="absolute right-5 top-5 text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 border-b border-[var(--border-color)] pb-4">
              <img
                src={selectedClient?.photo || undefined}
                alt={selectedClient.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C9A55B]"
              />
              <div>
                <span className="bg-[#C9A55B]/20 text-[#C9A55B] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Socio VIP {selectedClient.membershipTier}
                </span>
                <h3 className="text-xl font-serif font-bold text-white mt-1">{selectedClient.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedClient.email} • {selectedClient.phone}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#CCCCCC]">
              <div>
                <strong className="text-white block mb-1">📍 Domicilio Registrado:</strong>
                <p className="bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)]">{selectedClient.address} ({selectedClient.cityZone})</p>
              </div>

              <div>
                <strong className="text-[#C9A55B] block mb-1">✨ Preferencias VIP & Observaciones:</strong>
                <p className="bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)] italic">
                  {selectedClient.vipPreferences || 'Presión Firme. Aceite de Lavanda Francesa. Frecuencias 432Hz.'}
                </p>
              </div>

              {selectedClient.specialNotes && (
                <div>
                  <strong className="text-amber-400 block mb-1">⚠️ Instrucciones de Seguridad / Caseta:</strong>
                  <p className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-lg w-full space-y-4">
            <h3 className="font-serif font-bold text-lg text-white">Editar Expediente VIP</h3>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs text-[var(--text-muted)]">
              <div>
                <label className="block mb-1 text-white">Nombre Completo</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white px-3 py-2 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-white">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white px-3 py-2 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-white">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white px-3 py-2 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-white">Categoría de Membresía</label>
                <select
                  value={formState.membershipTier}
                  onChange={(e) => setFormState({ ...formState, membershipTier: e.target.value as any })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white px-3 py-2 rounded-xl"
                >
                  <option value="Gold">Gold VIP</option>
                  <option value="Diamond">Diamond VIP</option>
                  <option value="Black">Black Exclusivo</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-white">Domicilio de Servicio</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white px-3 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block mb-1 text-[#C9A55B]">Preferencias VIP</label>
                <input
                  type="text"
                  value={formState.vipPreferences}
                  onChange={(e) => setFormState({ ...formState, vipPreferences: e.target.value })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white px-3 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block mb-1 text-amber-400">Instrucciones Especiales / Caseta</label>
                <textarea
                  value={formState.specialNotes}
                  onChange={(e) => setFormState({ ...formState, specialNotes: e.target.value })}
                  rows={2}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-white p-3 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditClientModal(null)}
                  className="px-4 py-2 text-[var(--text-muted)] hover:text-white"
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

import React, { useState } from 'react';
import { 
  Settings, MapPin, Zap, ShieldCheck, Plus, 
  Trash2, Edit, Check, Lock, Shield, Clock, AlertTriangle, Users
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { CoverageZone } from '../../../shared/types';

export const ConfiguracionPage: React.FC = () => {
  const { 
    zones, auditLogs, handleToggleZoneSurge, 
    handleAddZone, handleEditZone, handleDeleteZone 
  } = useAdmin();
  const { showToast } = useToast();

  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<CoverageZone | null>(null);

  const [zoneForm, setZoneForm] = useState<{
    name: string;
    coloniases: string;
    surgeMultiplier: number;
  }>({
    name: '',
    coloniases: 'Polanco I, Polanco II, Campos Elíseos',
    surgeMultiplier: 1.0
  });

  const handleOpenAdd = () => {
    setEditingZone(null);
    setZoneForm({
      name: '',
      coloniases: 'Lomas de Chapultepec, Bosques',
      surgeMultiplier: 1.0
    });
    setShowZoneModal(true);
  };

  const handleOpenEdit = (z: CoverageZone) => {
    setEditingZone(z);
    setZoneForm({
      name: z.name,
      coloniases: z.coloniases ? z.coloniases.join(', ') : '',
      surgeMultiplier: z.surgeMultiplier || 1.0
    });
    setShowZoneModal(true);
  };

  const handleSaveZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name) return;

    const coloniasesArray = zoneForm.coloniases.split(',').map(c => c.trim()).filter(Boolean);

    if (editingZone) {
      const updated: CoverageZone = {
        ...editingZone,
        name: zoneForm.name,
        coloniases: coloniasesArray,
        surgeMultiplier: Number(zoneForm.surgeMultiplier),
        isHighDemand: Number(zoneForm.surgeMultiplier) > 1.0
      };
      handleEditZone(updated);
      showToast(`Zona "${updated.name}" actualizada.`);
    } else {
      const newZ: CoverageZone = {
        id: `zone-${Date.now()}`,
        name: zoneForm.name,
        coloniases: coloniasesArray,
        activeTherapists: 4,
        surgeMultiplier: Number(zoneForm.surgeMultiplier),
        isHighDemand: Number(zoneForm.surgeMultiplier) > 1.0,
        isCovered: true
      };
      handleAddZone(newZ);
      showToast(`Nueva zona de cobertura "${newZ.name}" agregada.`);
    }

    setShowZoneModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#262626] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#C9A55B]" />
            <span>Configuración de Zonas & Tarifa Dinámica Surge</span>
          </h1>
          <p className="text-xs text-[#888888] mt-1">
            Gestión de zonas de cobertura VIP en Ciudad de México, multiplicadores de alta demanda y políticas de seguridad.
          </p>
        </div>

        <LuxuryButton variant="gold" size="sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Nueva Zona</span>
        </LuxuryButton>
      </div>

      {/* Coverage Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-[#141414] border border-[#262626] hover:border-[#C9A55B]/40 rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">{zone.name}</h3>
                  <p className="text-xs text-[#888888]">
                    Terapeutas activas en zona: <strong className="text-white">{zone.activeTherapists}</strong>
                  </p>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                  zone.surgeMultiplier > 1.0 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {zone.surgeMultiplier > 1.0 ? `Surge ${zone.surgeMultiplier}x Activo` : 'Tarifa Normal'}
                </span>
              </div>

              <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 space-y-1 text-xs">
                <span className="text-[#888888] text-[10px] uppercase font-bold block">Colonias Cubiertas:</span>
                <p className="text-stone-300 font-sans">
                  {zone.coloniases ? zone.coloniases.join(', ') : 'Zonas exclusivas integradas'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center pt-3 border-t border-[#262626]">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(zone)}
                  className="p-2 bg-[#1A1A1A] hover:bg-[#262626] text-stone-300 hover:text-[#C9A55B] rounded-xl cursor-pointer"
                  title="Editar Zona"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    handleDeleteZone(zone.id);
                    showToast(`Zona ${zone.name} eliminada.`);
                  }}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl cursor-pointer"
                  title="Eliminar Zona"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <LuxuryButton
                variant={zone.surgeMultiplier > 1.0 ? 'outline' : 'gold'}
                size="sm"
                onClick={() => {
                  const nextSurge = zone.surgeMultiplier > 1.0 ? 1.0 : 1.25;
                  handleToggleZoneSurge(zone.id, nextSurge);
                  showToast(`Multiplicador Surge para ${zone.name} ajustado a ${nextSurge}x`);
                }}
              >
                <Zap className="w-3.5 h-3.5 mr-1 text-[#C9A55B]" />
                <span>{zone.surgeMultiplier > 1.0 ? 'Desactivar Surge' : 'Activar Surge 1.25x'}</span>
              </LuxuryButton>
            </div>
          </div>
        ))}
      </div>

      {/* Security Policies Section */}
      <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 space-y-4">
        <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#C9A55B]" />
          <span>Políticas de Seguridad & Cierre de Sesión Automático</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#1A1A1A] border border-[#262626] p-4 rounded-2xl space-y-1">
            <strong className="text-white block font-bold">Bloqueo por Inactividad</strong>
            <p className="text-[#888888]">15 Minutos de inactividad requieren reautenticación del administrador.</p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#262626] p-4 rounded-2xl space-y-1">
            <strong className="text-white block font-bold">Cambio Forzado Primer Login</strong>
            <p className="text-emerald-400 font-semibold">100% Activo para terapeutas y coordinadores.</p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#262626] p-4 rounded-2xl space-y-1">
            <strong className="text-white block font-bold">Cifrado de Sesiones</strong>
            <p className="text-[#888888]">Tokens JWT firmados con Firebase Admin Auth y reglas de Firestore.</p>
          </div>
        </div>
      </div>

      {/* Add / Edit Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-serif font-bold text-lg text-white">
              {editingZone ? 'Editar Zona de Cobertura' : 'Nueva Zona de Cobertura'}
            </h3>

            <form onSubmit={handleSaveZone} className="space-y-3 text-xs text-[#888888]">
              <div>
                <label className="block mb-1 text-white">Nombre de la Zona</label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  placeholder="ej. Bosque Real & Interlomas"
                  required
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 text-white">Colonias (Separadas por coma)</label>
                <textarea
                  value={zoneForm.coloniases}
                  onChange={(e) => setZoneForm({ ...zoneForm, coloniases: e.target.value })}
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white p-3 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 text-white">Multiplicador Surge Inicial</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="2.5"
                  value={zoneForm.surgeMultiplier}
                  onChange={(e) => setZoneForm({ ...zoneForm, surgeMultiplier: Number(e.target.value) })}
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 text-[#888888] hover:text-white"
                >
                  Cancelar
                </button>
                <LuxuryButton type="submit" variant="gold" size="sm">
                  Guardar Zona
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

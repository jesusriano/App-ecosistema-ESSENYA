import React, { useState } from 'react';
import { EssenyaLogo } from '../../../shared/components/EssenyaLogo';
import { Star, ShieldAlert, AlertTriangle, ToggleLeft, ToggleRight, Radio, LogOut } from 'lucide-react';
import { Therapist } from '../../../shared/types/index';
import { useAuth } from '../../../shared/context/AuthContext';

interface TherapistHeaderProps {
  therapist: Therapist;
  onOpenPanicModal: () => void;
}

export const TherapistHeader: React.FC<TherapistHeaderProps> = ({ therapist, onOpenPanicModal }) => {
  const { logout } = useAuth();
  const [isAvailable, setIsAvailable] = useState<boolean>(therapist?.status === 'disponible');

  const activeTherapist = therapist || {
    id: 'ther-1',
    name: 'Elena Rostova',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    phone: '525512345678',
    rating: 4.9,
    reviewCount: 128,
    specialties: ['Masaje Tejido Profundo', 'Descontracturante VIP'],
    status: 'disponible',
    coverageZones: ['Polanco', 'Lomas de Chapultepec'],
    completedServicesCount: 342,
    bio: 'Especialista certificada con 8 años de experiencia en masajes terapéuticos de alto nivel.'
  };

  return (
    <div className="bg-white dark:bg-[#141414] border-b border-[#E5DFD3] dark:border-[#262626] px-2.5 sm:px-4 py-2 sm:py-3 sticky top-0 z-30 transition-colors w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3 w-full">
        {/* Profile info */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <img
            src={activeTherapist.photo || undefined}
            alt={activeTherapist.name}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#C9A55B] shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="font-serif font-bold text-xs sm:text-sm text-[#1C1917] dark:text-white">{activeTherapist.name}</h2>
              <span className="text-[9px] sm:text-[10px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] px-2 py-0.5 rounded-full font-bold border border-[#C9A55B]/30 shrink-0">
                Terapeuta Senior
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#6B655F] dark:text-[#888888] flex items-center space-x-1.5 sm:space-x-2 mt-0.5">
              <span className="flex items-center text-[#806020] dark:text-[#C9A55B] font-bold">
                <Star className="w-3 h-3 fill-[#C9A55B] text-[#C9A55B] mr-0.5" />
                {activeTherapist.rating}
              </span>
              <span>•</span>
              <span>{activeTherapist.completedServicesCount} Servicios</span>
            </p>
          </div>
        </div>

        {/* Status Toggle, SOS & Logout */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              isAvailable
                ? 'bg-[#16A34A]/10 text-[#16A34A] dark:text-[#22C55E] border-[#22C55E]/40'
                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 shrink-0 ${isAvailable ? 'text-[#22C55E]' : ''}`} />
            <span>{isAvailable ? 'RADAR ON' : 'DESCONECTADO'}</span>
          </button>

          <button
            onClick={onOpenPanicModal}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/40 text-red-600 dark:text-red-400 font-bold text-[11px] sm:text-xs rounded-xl cursor-pointer transition-all"
            title="S.O.S. Seguridad Terapeuta"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
            <span>S.O.S.</span>
          </button>

          <button
            onClick={() => logout('terapeuta')}
            title="Cerrar Sesión de Terapeuta"
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:text-red-500 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};

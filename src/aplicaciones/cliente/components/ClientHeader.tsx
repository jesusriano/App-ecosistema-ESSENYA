import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { EssenyaLogo } from '../../../shared/components/EssenyaLogo';
import { Shield, Sparkles, Award, AlertTriangle, LogOut, User, Crown, Gem, ChevronRight } from 'lucide-react';
import { ClientUser } from '../../../shared/types/index';
import { useAuth } from '../../../shared/context/AuthContext';
import { useCliente } from '../hooks/useCliente';
import { calculateMembershipTier, getCompletedAndPaidBookings } from '../services/membershipService';
import { ClientRoutePath } from '../components/ClientNavigation';

interface ClientHeaderProps {
  client: ClientUser;
  onOpenPanicModal: () => void;
  onNavigate?: (route: ClientRoutePath) => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ client, onOpenPanicModal, onNavigate }) => {
  const { logout, getUser } = useAuth();
  const authUser = getUser('cliente');
  const { bookings } = useCliente();

  // Calcular la categoría actual dinámicamente con base en las sesiones concluidas y pagadas
  const completedAndPaidBookings = useMemo(() => {
    return getCompletedAndPaidBookings(bookings, client?.id);
  }, [bookings, client?.id]);

  const completedCount = completedAndPaidBookings.length;

  const currentTier = useMemo(() => {
    return calculateMembershipTier(completedCount);
  }, [completedCount]);

  const displayName = authUser?.nombre 
    ? `${authUser.nombre} ${authUser.apellidos || ''}`.trim() 
    : (client?.name || 'Socio VIP');

  const getTierIcon = () => {
    switch (currentTier.iconType) {
      case 'crown':
        return <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 shrink-0" />;
      case 'gem':
        return <Gem className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300 shrink-0 animate-pulse" />;
      case 'sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />;
    }
  };

  const handleGoToPerfil = () => {
    if (onNavigate) {
      onNavigate('/perfil');
    }
  };

  return (
    <div className="bg-white/90 dark:bg-[#141414]/90 backdrop-blur-xl border-b border-[#E5DFD3] dark:border-[#262626] px-3 sm:px-4 py-2.5 sm:py-3 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
        {/* Brand & Dynamic Client Tier (Categoría Actual al lado del Logo) */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <EssenyaLogo size="xs" showText={true} align="left" />
          
          <div className="flex items-center space-x-1.5 pl-2 sm:pl-3 border-l border-[#E5DFD3] dark:border-[#333333]">
            <button
              type="button"
              onClick={handleGoToPerfil}
              className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full tracking-wide flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                currentTier.level === 1 
                  ? 'bg-gradient-to-r from-slate-100 via-slate-200 to-zinc-200 dark:from-slate-800 dark:via-zinc-800 dark:to-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                  : currentTier.level === 2
                  ? 'bg-gradient-to-r from-[#FDE047]/30 via-[#D4AF37]/25 to-[#B38728]/30 text-amber-900 dark:text-amber-300 border border-amber-400/60 font-black'
                  : currentTier.level === 3
                  ? 'bg-sky-500/15 text-sky-900 dark:text-sky-300 border border-sky-400/60 font-black'
                  : currentTier.level === 4
                  ? 'bg-zinc-900 text-amber-300 border border-amber-400/80 dark:bg-black ring-1 ring-amber-400/40 font-black'
                  : 'bg-rose-950 text-amber-300 border border-amber-300 ring-1 ring-amber-300 font-black'
              }`}
              title={`Categoría Actual: ${currentTier.fullLabel} (${completedCount} ${completedCount === 1 ? 'masaje concluido' : 'masajes concluidos'}). Clic para ver perfil y beneficios.`}
            >
              {getTierIcon()}
              <span className="whitespace-nowrap font-serif font-bold">{currentTier.fullLabel}</span>
              <span className="bg-black/10 dark:bg-white/15 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold">
                {completedCount} {completedCount === 1 ? 'masaje' : 'masajes'}
              </span>
            </button>
          </div>
        </div>

        {/* SOS Button, User Badge & Logout */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleGoToPerfil}
            className="hidden sm:flex items-center space-x-2 bg-[#FAF8F5] dark:bg-[#1A1A1A] hover:bg-[#F2ECE1] dark:hover:bg-[#222222] border border-[#E5DFD3] dark:border-[#2A2A2A] px-2.5 py-1 rounded-xl text-xs transition-colors cursor-pointer"
            title="Ver tu perfil de socio y membresía"
          >
            <User className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span className="font-semibold text-[#1C1917] dark:text-white max-w-[120px] truncate">
              {displayName}
            </span>
          </button>

          <motion.button
            id="client-header-panic-btn"
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenPanicModal}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/40 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl cursor-pointer transition-all min-h-[36px]"
            title="Botón de Pánico SOS 24/7"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
            <span className="text-[11px] sm:text-xs">SOS</span>
            <span className="hidden sm:inline"> 24/7</span>
          </motion.button>

          <button
            onClick={() => logout('cliente')}
            title="Cerrar Sesión de Cliente"
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};



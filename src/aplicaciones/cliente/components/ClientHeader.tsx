import React from 'react';
import { motion } from 'motion/react';
import { EssenyaLogo } from '../../../shared/components/EssenyaLogo';
import { Shield, Sparkles, Award, AlertTriangle, PhoneCall, LogOut, User } from 'lucide-react';
import { ClientUser } from '../../../shared/types/index';
import { useAuth } from '../../../shared/context/AuthContext';

interface ClientHeaderProps {
  client: ClientUser;
  onOpenPanicModal: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ client, onOpenPanicModal }) => {
  const { logout, getUser } = useAuth();
  const authUser = getUser('cliente');

  return (
    <div className="bg-white/90 dark:bg-[#141414]/90 backdrop-blur-xl border-b border-[#E5DFD3] dark:border-[#262626] px-4 py-3 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Brand & Client Tier */}
        <div className="flex items-center space-x-3">
          <EssenyaLogo size="xs" showText={true} align="left" />
          <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-[#E5DFD3] dark:border-[#333333]">
            <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3 text-[#C9A55B]" />
              <span>Socio {client?.membershipTier || 'Club Black VIP'}</span>
            </span>
          </div>
        </div>

        {/* SOS Button, User Badge & Logout */}
        <div className="flex items-center space-x-2">
          {authUser && (
            <div className="hidden lg:flex items-center space-x-2 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] px-2.5 py-1 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-[#C9A55B]" />
              <span className="font-semibold text-[#1C1917] dark:text-white max-w-[120px] truncate">
                {authUser.nombre}
              </span>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenPanicModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/40 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl cursor-pointer transition-all"
            title="Botón de Pánico SOS 24/7"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="hidden sm:inline">Botón SOS 24/7</span>
          </motion.button>

          <button
            onClick={() => logout('cliente')}
            title="Cerrar Sesión de Cliente"
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};


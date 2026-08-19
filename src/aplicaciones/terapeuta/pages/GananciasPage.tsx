import React from 'react';
import { DollarSign, ShieldCheck, Award, TrendingUp, CalendarCheck } from 'lucide-react';
import { useTerapeuta } from '../hooks/useTerapeuta';

export const GananciasPage: React.FC = () => {
  const { bookings, therapist } = useTerapeuta();

  const completed = bookings.filter(b => b.state === 'servicio_finalizado');
  const totalEarnings = completed.reduce((acc, b) => acc + ((b.total || b.price || 0) * 0.70), 0) + 1450; // Base minimum guaranteed earnings

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-[#C9A55B]" />
          <span>Ganancias & Mínimo Garantizado ESSENYA</span>
        </h1>
        <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
          Panel de ingresos transparentes, propinas ejecutivas y esquema de bono por zona.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-2">
          <span className="text-[#6B655F] dark:text-[#888888] text-xs font-semibold block">Ganancias del Periodo</span>
          <p className="text-2xl font-serif font-bold text-[#806020] dark:text-[#C9A55B]">${(totalEarnings ?? 0).toLocaleString()} MXN</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18% vs semana previa</span>
          </span>
        </div>

        <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-2">
          <span className="text-[#6B655F] dark:text-[#888888] text-xs font-semibold block">Propinas Recibidas</span>
          <p className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">$1,850 MXN</p>
          <span className="text-[10px] text-[#6B655F] dark:text-[#888888]">100% abonado directo a tu cuenta</span>
        </div>

        <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-2">
          <span className="text-[#6B655F] dark:text-[#888888] text-xs font-semibold block">Servicios Completados</span>
          <p className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">{therapist?.totalServices || 342}</p>
          <span className="text-[10px] text-[#806020] dark:text-[#C9A55B] font-bold">Nivel Senior Certificado</span>
        </div>
      </div>
    </div>
  );
};

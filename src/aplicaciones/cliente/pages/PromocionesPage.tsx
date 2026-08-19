import React from 'react';
import { Gift, Award, Sparkles, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

interface PromocionesPageProps {
  onStartBooking: () => void;
}

export const PromocionesPage: React.FC<PromocionesPageProps> = ({ onStartBooking }) => {
  const { client } = useCliente();

  const promos = [
    {
      id: 'promo-1',
      title: 'Paquete Ritual Pareja Gold',
      code: 'PAREJA-GOLD-2026',
      discount: '15% OFF',
      description: '2 Masajes Terapéuticos de 90 min simultáneos con dobles fisioterapeutas certifcados en tu residencia.',
      badge: 'Exclusivo Club Black',
    },
    {
      id: 'promo-2',
      title: 'Upgrade Aceites Escenciales Ylang Ylang',
      code: 'ESSENTIAL-VIP',
      discount: 'Cortesía VIP',
      description: 'Infusión botánica orgánica de grado farmacéutico sin costo adicional en tus siguientes 3 masajes.',
      badge: 'Beneficio de Membresía',
    },
    {
      id: 'promo-3',
      title: 'Tarjeta de Regalo Haute Wellness',
      code: 'GIFT-ESSENYA',
      discount: '$1,000 MXN',
      description: 'Abono aplicable para regalar a familiares o ejecutivos de tu empresa.',
      badge: 'Validez 12 Meses',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-[#C9A55B]" />
          <span>Beneficios & Promociones VIP</span>
        </h1>
        <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
          Privilegios especiales exclusivos para miembros de {client?.membershipTier || 'Club Black VIP'}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {promos.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-6 space-y-4 shadow-sm hover:border-[#C9A55B] transition-all relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {p.badge}
              </span>
              <span className="font-extrabold text-lg text-[#C9A55B]">{p.discount}</span>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">{p.title}</h3>
              <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1 leading-relaxed">{p.description}</p>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-2.5 rounded-xl border border-[#E5DFD3] dark:border-[#2A2A2A] flex justify-between items-center text-xs">
              <span className="text-[#6B655F] dark:text-[#888888] text-[11px]">Código:</span>
              <span className="font-mono font-bold text-[#806020] dark:text-[#C9A55B]">{p.code}</span>
            </div>

            <LuxuryButton variant="gold" fullWidth size="sm" onClick={onStartBooking}>
              Usar Cupón en Reserva
            </LuxuryButton>
          </div>
        ))}
      </div>
    </div>
  );
};

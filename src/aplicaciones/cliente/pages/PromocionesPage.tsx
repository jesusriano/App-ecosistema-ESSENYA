import React, { useMemo, useState } from 'react';
import { 
  Gift, Award, Sparkles, CheckCircle2, ShieldCheck, Lock, 
  Copy, Check, Clock, ArrowRight, Wallet, Gem, Crown 
} from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { 
  calculateMembershipTier, 
  getCompletedAndPaidBookings, 
  getVipCourtesyStatus,
  validatePromotionCode 
} from '../services/membershipService';
import { getGiftCards } from '../services/billeteraService';
import { useToast } from '../../../shared/context/ToastContext';

interface PromocionesPageProps {
  onStartBooking: () => void;
}

export const PromocionesPage: React.FC<PromocionesPageProps> = ({ onStartBooking }) => {
  const { client, bookings } = useCliente();
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Masajes concluidos y pagados
  const completedAndPaidBookings = useMemo(() => {
    return getCompletedAndPaidBookings(bookings, client?.id);
  }, [bookings, client?.id]);

  const completedCount = completedAndPaidBookings.length;
  const tierInfo = useMemo(() => calculateMembershipTier(completedCount), [completedCount]);

  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [vipCourtesy, setVipCourtesy] = useState<{
    unlocked: boolean;
    used: boolean;
    massagesCompleted: number;
    massagesNeeded: number;
    code: string;
    discountPercent: number;
  }>({
    unlocked: false,
    used: false,
    massagesCompleted: 0,
    massagesNeeded: 5,
    code: 'VIP15',
    discountPercent: 15
  });

  // Fetch async security-sensitive data from Firestore
  React.useEffect(() => {
    const fetchSecurityData = async () => {
      if (client?.id) {
        const cards = await getGiftCards(client.id);
        const courtesy = await getVipCourtesyStatus(client.id, completedCount);
        setGiftCards(cards);
        setVipCourtesy(courtesy);
      }
    };
    fetchSecurityData();
  }, [client?.id, completedCount]);

  const primaryGiftCard = giftCards[0] || { code: 'REGALO-ESS-1400', currentBalance: 1400 };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('Código Copiado', `El código ${code} ha sido copiado. Aplícalo al confirmar tu reserva.`, 'gold');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-[#E5DFD3] dark:border-[#262626] pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-[#C9A55B]/15 border border-[#C9A55B]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#806020] dark:text-[#C9A55B] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Beneficios y Promociones Exclusivas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] dark:text-white">
            Promociones y Cortesías de Membresía
          </h1>
          <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1 max-w-xl">
            Descuentos especiales validados por categoría de socio y recompensas por fidelidad acumulada en ESSENYA.
          </p>
        </div>

        <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs">
          <div>
            <span className="text-[#888888] block text-[10px]">Tu Estatus Actual:</span>
            <span className="font-bold text-[#806020] dark:text-[#E6CA65]">{tierInfo.fullLabel}</span>
          </div>
          <div className="border-l border-[#E5DFD3] dark:border-[#333333] pl-3">
            <span className="text-[#888888] block text-[10px]">Sesiones Pagadas:</span>
            <span className="font-bold text-[#1C1917] dark:text-white">{completedCount}</span>
          </div>
          {tierInfo.perk && (
            <div className="border-l border-[#E5DFD3] dark:border-[#333333] pl-3 max-w-xs">
              <span className="text-[#888888] block text-[10px]">Beneficio de tu Rango:</span>
              <span className="text-[#1C1917] dark:text-[#E5DFD3] text-[11px] font-medium block truncate">
                {tierInfo.perk}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Promotions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PROMO 1: EXCLUSIVA DIAMOND+ (10% de descuento) */}
        <div 
          id="promo-diamond-10"
          className={`rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden ${
            tierInfo.isDiamondOrHigher
              ? 'bg-gradient-to-br from-white via-[#FAF8F5] to-white dark:from-[#141414] dark:via-[#1A1A1A] dark:to-[#141414] border-[#C9A55B] ring-1 ring-[#C9A55B]/40'
              : 'bg-[#FAF8F5]/80 dark:bg-[#121212] border-gray-300 dark:border-zinc-800 opacity-90'
          }`}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                tierInfo.isDiamondOrHigher
                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-400/40'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
              }`}>
                {tierInfo.isDiamondOrHigher ? (
                  <>
                    <Gem className="w-3 h-3 text-sky-500" />
                    <span>Exclusivo Diamante+</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Bloqueado para tu Nivel</span>
                  </>
                )}
              </span>

              <span className="font-serif font-extrabold text-xl text-[#806020] dark:text-[#E6CA65]">
                10% de Descuento
              </span>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">
                Promoción Exclusiva Diamond
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1 leading-relaxed">
                {tierInfo.isDiamondOrHigher
                  ? 'Descuento especial del 10% en cualquiera de tus reservas de masaje terapéutico de autor.'
                  : `Disponible únicamente para socios Diamante en adelante. Tu categoría actual es "${tierInfo.fullLabel}". Te faltan ${Math.max(1, 3 - completedCount)} masajes concluidos para desbloquear este beneficio.`}
              </p>
            </div>

            {/* Code Box */}
            <div className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
              tierInfo.isDiamondOrHigher
                ? 'bg-white dark:bg-[#202020] border-[#C9A55B]/30'
                : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800'
            }`}>
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#888888] uppercase block">Código Promocional:</span>
                <span className={`font-mono font-bold tracking-wider ${
                  tierInfo.isDiamondOrHigher ? 'text-[#806020] dark:text-[#E6CA65]' : 'text-zinc-400 dark:text-zinc-600'
                }`}>
                  DIAMOND10
                </span>
              </div>

              {tierInfo.isDiamondOrHigher ? (
                <button
                  onClick={() => handleCopyCode('DIAMOND10')}
                  className="px-2.5 py-1 bg-[#C9A55B]/20 hover:bg-[#C9A55B] text-[#806020] dark:text-[#E6CA65] hover:text-black rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedCode === 'DIAMOND10' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'DIAMOND10' ? 'Copiado' : 'Copiar'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const validation = validatePromotionCode('DIAMOND10', completedCount, tierInfo);
                    showToast(validation.title, validation.message, 'error');
                  }}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Haz clic para ver motivo de restricción"
                >
                  <Lock className="w-3 h-3" />
                  <span>Restringido</span>
                </button>
              )}
            </div>
          </div>

          <LuxuryButton 
            variant={tierInfo.isDiamondOrHigher ? 'gold' : 'outline'} 
            fullWidth 
            size="sm" 
            onClick={onStartBooking}
          >
            {tierInfo.isDiamondOrHigher ? 'Aplicar en Reserva' : 'Reservar Masaje para Subir'}
          </LuxuryButton>
        </div>

        {/* PROMO 2: BENEFICIO DE MEMBRESÍA "CORTESÍA VIP" (15% de descuento a partir de 5 masajes) */}
        <div 
          id="beneficio-cortesia-vip"
          className={`rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden ${
            vipCourtesy.unlocked && !vipCourtesy.used
              ? 'bg-gradient-to-br from-white via-[#FAF8F5] to-white dark:from-[#141414] dark:via-[#1A1A1A] dark:to-[#141414] border-emerald-500/50 ring-1 ring-emerald-500/30'
              : 'bg-[#FAF8F5]/80 dark:bg-[#121212] border-gray-300 dark:border-zinc-800 opacity-90'
          }`}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                vipCourtesy.used
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  : vipCourtesy.unlocked
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}>
                {vipCourtesy.used ? (
                  <span>Utilizado (Uso Único)</span>
                ) : vipCourtesy.unlocked ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Desbloqueado (5+ Masajes)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Requiere 5 Masajes ({completedCount}/5)</span>
                  </>
                )}
              </span>

              <span className="font-serif font-extrabold text-xl text-[#806020] dark:text-[#E6CA65]">
                15% de Descuento
              </span>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">
                Beneficio: Cortesía VIP
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1 leading-relaxed">
                {vipCourtesy.used
                  ? 'Este beneficio de lealtad de uso único ya ha sido canjeado en tu cuenta.'
                  : vipCourtesy.unlocked
                  ? '¡Felicitaciones por tu fidelidad! Aplica este 15% de descuento especial en tu siguiente sesión.'
                  : `Se desbloquea al acumular 5 masajes concluidos y pagados. Llevas ${completedCount}/5 masajes acumulados.`}
              </p>
            </div>

            {/* Code Box */}
            <div className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
              vipCourtesy.unlocked && !vipCourtesy.used
                ? 'bg-white dark:bg-[#202020] border-emerald-500/30'
                : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800'
            }`}>
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#888888] uppercase block">Código de Beneficio:</span>
                <span className={`font-mono font-bold tracking-wider ${
                  vipCourtesy.unlocked && !vipCourtesy.used
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-400 dark:text-zinc-600'
                }`}>
                  VIP15
                </span>
              </div>

              {vipCourtesy.unlocked && !vipCourtesy.used ? (
                <button
                  onClick={() => handleCopyCode('VIP15')}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedCode === 'VIP15' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'VIP15' ? 'Copiado' : 'Copiar'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const validation = validatePromotionCode('VIP15', completedCount, tierInfo);
                    showToast(validation.title, validation.message, 'error');
                  }}
                  className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>{vipCourtesy.used ? 'Canjeado' : 'Restringido'}</span>
                </button>
              )}
            </div>
          </div>

          <LuxuryButton 
            variant={vipCourtesy.unlocked && !vipCourtesy.used ? 'gold' : 'outline'} 
            fullWidth 
            size="sm" 
            onClick={onStartBooking}
            disabled={vipCourtesy.used}
          >
            {vipCourtesy.used ? 'Beneficio Ya Canjeado' : vipCourtesy.unlocked ? 'Usar Código VIP15' : 'Reservar Masajes para Acumular'}
          </LuxuryButton>
        </div>

      </div>
    </div>
  );
};

import { Booking, ClientUser } from '../../../shared/types/index';

export interface TierInfo {
  tierName: string;
  fullLabel: string;
  level: number;
  badgeStyle: string;
  iconType: 'shield' | 'crown' | 'gem' | 'sparkles';
  accentColor: string;
  nextTier: string;
  neededForNext: number;
  progressPercent: number;
  incentiveMessage: string;
  perk: string;
  perks: string[];
  isDiamondOrHigher: boolean;
}

export interface VipCourtesyStatus {
  unlocked: boolean;
  used: boolean;
  massagesCompleted: number;
  massagesNeeded: number;
  code: string;
  discountPercent: number;
}

/**
 * Filtra los masajes concluidos y pagados correspondientes a un cliente.
 */
export function getCompletedAndPaidBookings(bookings: Booking[], clientId?: string): Booking[] {
  return bookings.filter(b => {
    const isClientBooking = !b.clientId || !clientId || b.clientId === clientId;
    const isFinished = b.state === 'servicio_finalizado';
    const isPaid = b.paymentStatus === 'pagado' || (
      b.paymentStatus !== 'rechazado' && 
      b.paymentStatus !== 'pendiente' && 
      b.paymentMethod !== 'Efectivo (Pago al Recibir)'
    );
    return isClientBooking && isFinished && isPaid;
  });
}

/**
 * Calcula dinámicamente la información de categoría y nivel de membresía.
 * Escalafón:
 * - Socio Platino: 0 masajes concluidos (Punto de inicio)
 * - Socio Gold: 1 a 2 masajes concluidos
 * - Socio Diamante / Diamond: 3 a 5 masajes concluidos (Habilita promociones exclusivas 10% OFF)
 * - Socio Black Diamond: 6 a 9 masajes concluidos
 * - Socio Imperial VIP: 10 o más masajes concluidos
 */
export function calculateMembershipTier(completedMassagesCount: number): TierInfo {
  if (completedMassagesCount === 0) {
    return {
      tierName: 'Platino',
      fullLabel: 'Socio Platino',
      level: 1,
      badgeStyle: 'bg-gradient-to-r from-slate-200 via-slate-100 to-zinc-300 dark:from-slate-700 dark:via-zinc-600 dark:to-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-500 shadow-xs ring-1 ring-slate-400/30',
      iconType: 'shield',
      accentColor: '#94A3B8',
      nextTier: 'Socio Gold',
      neededForNext: 1,
      progressPercent: 0,
      incentiveMessage: 'Adquiere y concluye tu primer masaje pagado para ascender al rango de Socio Gold.',
      perk: 'Beneficio actual: Tarifa preferencial de bienvenida y kit de spa esterilizado.',
      perks: [
        'Tarifa de bienvenida preferencial en masajes terapéuticos',
        'Kit de spa esterilizado individual de grado hospitalario',
        'Garantía de terapeuta certificada en tu domicilio'
      ],
      isDiamondOrHigher: false,
    };
  } else if (completedMassagesCount >= 1 && completedMassagesCount < 3) {
    const target = 3;
    const prev = 1;
    const needed = target - completedMassagesCount;
    const progress = Math.min(100, Math.round(((completedMassagesCount - prev) / (target - prev)) * 100));
    return {
      tierName: 'Gold',
      fullLabel: 'Socio Gold',
      level: 2,
      badgeStyle: 'bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#B38728] text-black border border-[#F6D06D] shadow-md shadow-[#C9A55B]/40 ring-1 ring-[#FDE047]/60 font-black',
      iconType: 'crown',
      accentColor: '#EAB308',
      nextTier: 'Socio Diamante',
      neededForNext: needed,
      progressPercent: progress,
      incentiveMessage: `¡Excelente progreso! Te ${needed === 1 ? 'falta 1 masaje pagado' : `faltan ${needed} masajes pagados`} para desbloquear Socio Diamante y sus promociones exclusivas.`,
      perk: 'Beneficio actual: 10% de bonificación en recompensas y prioridad de asignación.',
      perks: [
        '10% de bonificación en recompensas por cada sesión',
        'Prioridad de asignación en horarios pico de CDMX',
        'Aromaterapia botánica de autor incluida en cada masaje'
      ],
      isDiamondOrHigher: false,
    };
  } else if (completedMassagesCount >= 3 && completedMassagesCount < 6) {
    const target = 6;
    const prev = 3;
    const needed = target - completedMassagesCount;
    const progress = Math.min(100, Math.round(((completedMassagesCount - prev) / (target - prev)) * 100));
    return {
      tierName: 'Diamante',
      fullLabel: 'Socio Diamante',
      level: 3,
      badgeStyle: 'bg-gradient-to-r from-[#E0F2FE] via-[#7DD3FC] to-[#38BDF8] dark:from-sky-950 dark:via-cyan-900 dark:to-sky-800 text-sky-950 dark:text-sky-100 border border-sky-300 dark:border-sky-400 shadow-md shadow-sky-400/40 ring-1 ring-sky-300/70 font-black',
      iconType: 'gem',
      accentColor: '#38BDF8',
      nextTier: 'Socio Black Diamond',
      neededForNext: needed,
      progressPercent: progress,
      incentiveMessage: `Categoría Élite. Te ${needed === 1 ? 'falta 1 masaje' : `faltan ${needed} masajes`} para ascender al exclusivo Socio Black Diamond.`,
      perk: 'Beneficio actual: 10% OFF con código DIAMOND10, aceites franceses de autor y prioridad express.',
      perks: [
        'Acceso exclusivo a promociones VIP (10% OFF con código DIAMOND10)',
        'Aceites esenciales franceses de autor sin costo adicional',
        'Prioridad express de asignación con terapeutas Senior'
      ],
      isDiamondOrHigher: true,
    };
  } else if (completedMassagesCount >= 6 && completedMassagesCount < 10) {
    const target = 10;
    const prev = 6;
    const needed = target - completedMassagesCount;
    const progress = Math.min(100, Math.round(((completedMassagesCount - prev) / (target - prev)) * 100));
    return {
      tierName: 'Black Diamond',
      fullLabel: 'Socio Black Diamond',
      level: 4,
      badgeStyle: 'bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0A0A0A] text-amber-200 border border-amber-400/90 shadow-lg shadow-black/60 ring-1 ring-amber-400/50 font-black tracking-wide',
      iconType: 'sparkles',
      accentColor: '#F59E0B',
      nextTier: 'Socio Imperial VIP',
      neededForNext: needed,
      progressPercent: progress,
      incentiveMessage: `Prestigio casi absoluto. Solo te ${needed === 1 ? 'falta 1 sesión pagada' : `faltan ${needed} sesiones pagadas`} para alcanzar el rango supremo Socio Imperial VIP.`,
      perk: 'Beneficio actual: Acceso total a promociones (DIAMOND10), concierge dedicado 24/7 y toallas de algodón egipcio.',
      perks: [
        'Acceso a todas las promociones exclusivas (código DIAMOND10)',
        'Concierge dedicado 24/7 para citas inmediatas',
        'Kit de cortesía de lujo y toallas de algodón egipcio en cada servicio'
      ],
      isDiamondOrHigher: true,
    };
  } else {
    return {
      tierName: 'Imperial VIP',
      fullLabel: 'Socio Imperial VIP',
      level: 5,
      badgeStyle: 'bg-gradient-to-r from-[#4C0519] via-[#881337] to-[#1C1917] text-amber-300 border border-[#FCD34D] shadow-xl shadow-rose-950/70 ring-2 ring-[#FCD34D]/70 font-black tracking-wide',
      iconType: 'crown',
      accentColor: '#FCD34D',
      nextTier: 'Nivel Máximo de Excelencia',
      neededForNext: 0,
      progressPercent: 100,
      incentiveMessage: 'Has conquistado la cúspide del bienestar ESSENYA. Eres socio vitalicio del más alto rango.',
      perk: 'Beneficio actual: Promociones de élite, asignación prioritaria inmediata, lencería de seda y terapeutas Master.',
      perks: [
        'Acceso total a promociones y descuentos de élite',
        'Asignación prioritaria inmediata garantizada',
        'Lencería de seda exclusiva y terapeutas Master certificadas'
      ],
      isDiamondOrHigher: true,
    };
  }
}

const VIP_COURTESY_STORAGE_KEY = 'essenya_vip_courtesy_used';

/**
 * Obtiene el estado del beneficio "Cortesía VIP" (15% de descuento a partir de 5 masajes acumulados).
 */
export function getVipCourtesyStatus(completedMassagesCount: number): VipCourtesyStatus {
  const isUsed = localStorage.getItem(VIP_COURTESY_STORAGE_KEY) === 'true';
  const unlocked = completedMassagesCount >= 5;
  const massagesNeeded = Math.max(0, 5 - completedMassagesCount);

  return {
    unlocked,
    used: isUsed,
    massagesCompleted: completedMassagesCount,
    massagesNeeded,
    code: 'VIP15',
    discountPercent: 15,
  };
}

/**
 * Marca el beneficio "Cortesía VIP" como utilizado (uso único).
 */
export function markVipCourtesyAsUsed(): void {
  localStorage.setItem(VIP_COURTESY_STORAGE_KEY, 'true');
}

export interface PromoValidationResult {
  valid: boolean;
  title: string;
  message: string;
  code?: string;
  label?: string;
  discountPercent?: number;
  fixedDiscount?: number;
  type?: 'DIAMOND10' | 'VIP15' | 'STANDARD';
  requiredTierLevel?: number;
  requiredTierLabel?: string;
  currentTierLabel?: string;
  currentTierLevel?: number;
  massagesNeeded?: number;
}

/**
 * Valida estrictamente si un código promocional puede ser aplicado según el nivel de membresía del usuario.
 * - DIAMOND10: Requiere nivel 3 (Socio Diamante en adelante, 3+ masajes concluidos y pagados).
 *   Rechaza de forma taxativa a categorías inferiores (Socio Platino nivel 1 y Socio Gold nivel 2).
 * - VIP15: Requiere al menos 5 masajes concluidos y pagados (Cortesía VIP un solo uso).
 * - GOLD2026: Requiere categoría Socio Gold en adelante (Nivel 2+, 1+ masajes concluidos).
 * - ESSENYABLACK: Requiere categoría Socio Black Diamond en adelante (Nivel 4+, 6+ masajes concluidos).
 */
export function validatePromotionCode(
  rawCode: string,
  completedMassagesCount: number,
  clientTier?: TierInfo
): PromoValidationResult {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      title: 'Ingresa un código',
      message: 'Por favor escribe un código promocional o de beneficio de membresía.'
    };
  }

  const tier = clientTier || calculateMembershipTier(completedMassagesCount);

  // 1. Promoción DIAMOND10: 10% de descuento exclusivo para Socios Diamante en adelante (Nivel >= 3)
  if (code === 'DIAMOND10') {
    if (tier.level < 3) {
      const needed = Math.max(1, 3 - completedMassagesCount);
      return {
        valid: false,
        title: 'Promoción Exclusiva Diamante',
        message: `El código DIAMOND10 es exclusivo para socios de categoría Diamante en adelante (mínimo 3 masajes concluidos y pagados). Tu categoría actual es "${tier.fullLabel}" con ${completedMassagesCount} ${completedMassagesCount === 1 ? 'masaje concluido' : 'masajes concluidos'}. Te ${needed === 1 ? 'falta 1 masaje' : `faltan ${needed} masajes`} para ascender y desbloquear el 10% de descuento.`,
        requiredTierLevel: 3,
        requiredTierLabel: 'Socio Diamante',
        currentTierLabel: tier.fullLabel,
        currentTierLevel: tier.level,
        massagesNeeded: needed,
        type: 'DIAMOND10'
      };
    }

    return {
      valid: true,
      title: 'Promoción Diamante Aplicada',
      message: '¡10% de descuento exclusivo para Socios Diamante aplicado con éxito!',
      code: 'DIAMOND10',
      label: '10% de Descuento Promoción Diamante',
      discountPercent: 10,
      type: 'DIAMOND10',
      requiredTierLevel: 3,
      currentTierLabel: tier.fullLabel
    };
  }

  // 2. Beneficio Cortesía VIP: 15% de descuento a partir de 5 masajes concluidos y pagados
  if (code === 'VIP15') {
    const vipStatus = getVipCourtesyStatus(completedMassagesCount);
    if (vipStatus.used) {
      return {
        valid: false,
        title: 'Beneficio Ya Utilizado',
        message: 'La Cortesía VIP (código VIP15) es de uso único y ya fue canjeada en una cita previa.',
        type: 'VIP15'
      };
    }
    if (!vipStatus.unlocked) {
      return {
        valid: false,
        title: 'Requisito No Cumplido',
        message: `El beneficio Cortesía VIP (código VIP15) requiere un mínimo de 5 masajes concluidos y pagados. Actualmente tienes ${completedMassagesCount}/5 masajes acumulados. Te faltan ${vipStatus.massagesNeeded} para desbloquearlo.`,
        massagesNeeded: vipStatus.massagesNeeded,
        type: 'VIP15'
      };
    }
    return {
      valid: true,
      title: 'Cortesía VIP Desbloqueada',
      message: '¡15% de descuento por fidelidad aplicado a tu reserva!',
      code: 'VIP15',
      label: '15% de Descuento Cortesía VIP (5+ Masajes)',
      discountPercent: 15,
      type: 'VIP15'
    };
  }

  // 3. Promoción Socio Gold: GOLD2026 ($500 MXN para Gold en adelante, Nivel >= 2)
  if (code === 'GOLD2026') {
    if (tier.level < 2) {
      return {
        valid: false,
        title: 'Promoción Exclusiva Socio Gold',
        message: `El código GOLD2026 requiere pertenecer a la categoría Socio Gold o superior (mínimo 1 masaje concluido). Tu categoría actual es "${tier.fullLabel}". Concluye tu primer masaje pagado para calificar.`,
        requiredTierLevel: 2,
        requiredTierLabel: 'Socio Gold',
        currentTierLabel: tier.fullLabel,
        type: 'STANDARD'
      };
    }
    return {
      valid: true,
      title: 'Cupón Gold Aplicado',
      message: 'Se ha descontado $500 MXN de tu reserva como beneficio Socio Gold.',
      code: 'GOLD2026',
      label: 'Descuento Promocional Socio Gold $500 MXN',
      fixedDiscount: 500,
      type: 'STANDARD'
    };
  }

  // 4. Promoción Black Diamond: ESSENYABLACK ($500 MXN para Black Diamond en adelante, Nivel >= 4)
  if (code === 'ESSENYABLACK') {
    if (tier.level < 4) {
      return {
        valid: false,
        title: 'Promoción Exclusiva Black Diamond',
        message: `El código ESSENYABLACK es exclusivo para Socios Black Diamond en adelante (mínimo 6 masajes concluidos). Tu categoría actual es "${tier.fullLabel}".`,
        requiredTierLevel: 4,
        requiredTierLabel: 'Socio Black Diamond',
        currentTierLabel: tier.fullLabel,
        type: 'STANDARD'
      };
    }
    return {
      valid: true,
      title: 'Cupón Élite Aplicado',
      message: 'Se ha descontado $500 MXN de tu reserva de élite.',
      code: 'ESSENYABLACK',
      label: 'Descuento Élite Black Diamond $500 MXN',
      fixedDiscount: 500,
      type: 'STANDARD'
    };
  }

  return {
    valid: false,
    title: 'Código No Válido',
    message: 'El código ingresado no existe, está vencido o tu membresía no cumple los requisitos necesarios.'
  };
}

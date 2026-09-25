import { MembershipTier } from '../../../shared/types';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface TierInfo {
  tierName: MembershipTier;
  fullLabel: string;
  level: number;
  badgeStyle: string;
  iconType: string;
  accentColor: string;
  nextTier?: MembershipTier | string;
  neededForNext: number;
  progressPercent: number;
  incentiveMessage: string;
  perk: string;
  perks: string[];
  isDiamondOrHigher: boolean;
}

export const calculateMembershipTier = (completedMassages: number): TierInfo => {
  if (completedMassages >= 16) {
    return {
      tierName: 'Imperial VIP',
      fullLabel: 'Socio Imperial VIP',
      level: 5,
      badgeStyle: 'bg-rose-950 text-amber-300 border border-amber-400/30',
      iconType: 'crown',
      accentColor: '#fbbf24',
      nextTier: 'Rango Supremo Alcanzado',
      neededForNext: 0,
      progressPercent: 100,
      incentiveMessage: 'Has alcanzado el estatus Imperial. Disfrutas de 20% OFF siempre.',
      perk: '20% de descuento automático permanente',
      perks: ['20% de descuento siempre', 'Terapeuta Master asignado', 'Sábanas de seda para camilla'],
      isDiamondOrHigher: true
    };
  } else if (completedMassages >= 11) {
    return {
      tierName: 'Black Diamond',
      fullLabel: 'Socio Black Diamond',
      level: 4,
      badgeStyle: 'bg-zinc-900 text-amber-400 border border-slate-700',
      iconType: 'sparkles',
      accentColor: '#fbbf24',
      nextTier: 'Imperial VIP',
      neededForNext: 16 - completedMassages,
      progressPercent: (completedMassages / 16) * 100,
      incentiveMessage: `Te faltan ${16 - completedMassages} masajes para el rango Imperial.`,
      perk: '15% de descuento automático permanente',
      perks: ['15% de descuento siempre', 'Concierge Privado 24/7', 'Toallas de algodón egipcio'],
      isDiamondOrHigher: true
    };
  } else if (completedMassages >= 9) {
    return {
      tierName: 'Diamond',
      fullLabel: 'Socio Diamond',
      level: 3,
      badgeStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-400/50',
      iconType: 'gem',
      accentColor: '#94a3b8',
      nextTier: 'Black Diamond',
      neededForNext: 11 - completedMassages,
      progressPercent: (completedMassages / 11) * 100,
      incentiveMessage: `Te faltan ${11 - completedMassages} masajes para Black Diamond.`,
      perk: '15% de descuento en tus 2 servicios de este nivel',
      perks: ['15% de descuento en masajes 9 y 10', 'Terapeuta preferido'],
      isDiamondOrHigher: true
    };
  } else if (completedMassages >= 5) {
    return {
      tierName: 'Gold',
      fullLabel: 'Socio Gold',
      level: 2,
      badgeStyle: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      iconType: 'sparkles',
      accentColor: '#fbbf24',
      nextTier: 'Diamond',
      neededForNext: 9 - completedMassages,
      progressPercent: (completedMassages / 9) * 100,
      incentiveMessage: `Te faltan ${9 - completedMassages} masajes para ser Diamond.`,
      perk: '10% de descuento en tus primeros 2 servicios de este nivel',
      perks: ['10% de descuento en masajes 5 y 6', 'Aromaterapia Premium'],
      isDiamondOrHigher: false
    };
  } else {
    return {
      tierName: 'Platino',
      fullLabel: 'Socio Platino',
      level: 1,
      badgeStyle: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700',
      iconType: 'shield',
      accentColor: '#94a3b8',
      nextTier: 'Gold',
      neededForNext: 5 - completedMassages,
      progressPercent: (completedMassages / 5) * 100,
      incentiveMessage: `Te faltan ${5 - completedMassages} masajes para ascender a Gold.`,
      perk: 'Acceso a rituales exclusivos de bienestar',
      perks: ['Acceso a reservas 24/7', 'Atención estándar'],
      isDiamondOrHigher: false
    };
  }
};

export const getCompletedAndPaidBookings = (bookings: any[], clientId?: string) => {
  if (!bookings || !Array.isArray(bookings)) return [];
  return bookings.filter(b => (!clientId || b.clientId === clientId) && b.state === 'servicio_finalizado' && (b.paymentStatus === 'pagado' || b.paid === true));
};

export interface VipCourtesyStatus {
  unlocked: boolean;
  used: boolean;
  massagesCompleted: number;
  massagesNeeded: number;
  code: string;
  discountPercent: number;
}

export async function getVipCourtesyStatus(clientId: string, completedMassagesCount: number): Promise<VipCourtesyStatus> {
  let isUsed = false;
  if (clientId) {
    try {
      const clientSnap = await getDoc(doc(db, 'clientes', clientId));
      if (clientSnap.exists()) {
        isUsed = clientSnap.data().courtesyUsed === true;
      }
    } catch (e) {
      console.error('Error fetching courtesy status from Firestore:', e);
    }
  }
  
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

export async function markVipCourtesyAsUsed(clientId: string): Promise<void> {
  if (!clientId) return;
  try {
    const clientRef = doc(db, 'clientes', clientId);
    await updateDoc(clientRef, { courtesyUsed: true });
  } catch (e) {
    console.error('Error marking courtesy as used in Firestore:', e);
  }
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

export function validatePromotionCode(
  rawCode: string,
  completedMassagesCount: number,
  clientTier?: TierInfo
): PromoValidationResult {
  const code = (rawCode || '').trim().toUpperCase();
  const tier = clientTier || calculateMembershipTier(completedMassagesCount);

  if (code === 'VIP15') {
    if (tier.isDiamondOrHigher) {
      return {
        valid: true,
        title: 'Beneficio Aplicado',
        message: 'Has utilizado tu beneficio VIP del 15% de descuento.',
        discountPercent: 15,
        type: 'VIP15'
      };
    } else {
      return {
        valid: false,
        title: 'Código No Válido Aún',
        message: 'El código VIP15 requiere nivel Diamond (5+ masajes concluidos).',
        discountPercent: 0
      };
    }
  }

  return {
    valid: false,
    title: 'Código Inválido',
    message: 'El código ingresado no existe o ha expirado.',
  };
}

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
  if (completedMassages >= 5) {
    return {
      tierName: 'Diamond',
      fullLabel: 'Socio Diamond',
      level: 3,
      badgeStyle: 'bg-emerald-500 text-white',
      iconType: 'sparkles',
      accentColor: '#10B981',
      nextTier: 'Nivel Máximo',
      neededForNext: 0,
      progressPercent: 100,
      incentiveMessage: 'Has alcanzado el máximo nivel de beneficios.',
      perk: '15% de descuento (VIP15)',
      perks: ['15% de descuento permanente', 'Prioridad en reservas'],
      isDiamondOrHigher: true
    };
  } else if (completedMassages >= 3) {
    return {
      tierName: 'Gold',
      fullLabel: 'Socio Gold',
      level: 2,
      badgeStyle: 'bg-yellow-500 text-white',
      iconType: 'star',
      accentColor: '#EAB308',
      nextTier: 'Diamond',
      neededForNext: 5 - completedMassages,
      progressPercent: (completedMassages / 5) * 100,
      incentiveMessage: `Te faltan ${5 - completedMassages} masajes para ser Diamond.`,
      perk: 'Descuento especial',
      perks: ['Descuento ocasional'],
      isDiamondOrHigher: false
    };
  } else {
    return {
      tierName: 'Platino',
      fullLabel: 'Socio Platino',
      level: 1,
      badgeStyle: 'bg-slate-300 text-black',
      iconType: 'shield',
      accentColor: '#94A3B8',
      nextTier: 'Gold',
      neededForNext: 3 - completedMassages,
      progressPercent: (completedMassages / 3) * 100,
      incentiveMessage: `Te faltan ${3 - completedMassages} masajes para ser Gold.`,
      perk: 'Bienvenida',
      perks: ['Bienvenida'],
      isDiamondOrHigher: false
    };
  }
};

export const getCompletedAndPaidBookings = (bookings: any[], clientId: string) => {
  return bookings.filter(b => b.clientId === clientId && b.state === 'servicio_finalizado' && (b.paymentStatus === 'pagado' || b.paid === true)).length;
};

export interface VipCourtesyStatus {
  unlocked: boolean;
  used: boolean;
  massagesCompleted: number;
  massagesNeeded: number;
  code: string;
  discountPercent: number;
}

const VIP_COURTESY_STORAGE_KEY = 'essenya_vip_courtesy_used';

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

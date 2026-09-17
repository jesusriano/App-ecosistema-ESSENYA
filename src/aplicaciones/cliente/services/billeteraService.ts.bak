import { db } from '../../../lib/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';

export interface GiftCardTransaction {
  id: string;
  date: string;
  bookingCode?: string;
  serviceName?: string;
  amountDeducted: number;
  remainingBalance: number;
  description: string;
}

export interface GiftCard {
  id: string;
  code: string;
  title: string;
  initialAmount: number; 
  purchasePrice: number; 
  currentBalance: number;
  status: 'activa' | 'parcialmente_usada' | 'agotada' | 'vencida';
  expirationDate: string; 
  createdAt: string;
  recipientName?: string; 
  recipientContact?: string; 
  senderName?: string; 
  customMessage?: string; 
  paymentMethod?: 'tarjeta' | 'transferencia';
  isGiftForSomeoneElse?: boolean;
  history: GiftCardTransaction[];
}

export interface PurchaseGiftCardParams {
  recipientName: string;
  recipientContact?: string;
  senderName: string;
  customMessage: string;
  paymentMethod: 'tarjeta' | 'transferencia';
}

/**
 * Fecha por defecto de vencimiento: 12 meses a partir de la emisión
 */
function getDefaultExpiration(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export async function getGiftCards(clientId: string): Promise<GiftCard[]> {
  if (!clientId) return [];
  try {
    const billeteraRef = collection(db, 'clientes', clientId, 'billetera');
    const snap = await getDocs(billeteraRef);
    const cards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GiftCard));
    
    // Filter any residual fake demo cards
    return cards.filter(c => c.id !== 'gc-demo-comprada-01' && c.code !== 'REGALO-ESS-1400');
  } catch (e) {
    console.error('Error obteniendo billetera de Firestore:', e);
    return [];
  }
}

/**
 * Saldo en cuenta disponible para que el cliente pague sus propias reservas.
 */
export async function getBilleteraTotalBalance(clientId: string): Promise<number> {
  const cards = await getGiftCards(clientId);
  return cards.reduce((sum, c) => {
    const isPersonal = !c.isGiftForSomeoneElse;
    const isActive = c.status !== 'agotada' && c.status !== 'vencida';
    return sum + (isPersonal && isActive ? c.currentBalance : 0);
  }, 0);
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  card?: GiftCard;
}

/**
 * Valida si un código de tarjeta de regalo existe, está activo, no vencido y con saldo disponible.
 */
export async function validateGiftCardCode(clientId: string, rawCode: string): Promise<ValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, message: 'Por favor introduce el código de la tarjeta de regalo.' };
  }

  const cards = await getGiftCards(clientId);
  const card = cards.find(c => c.code.toUpperCase() === code);

  if (!card) {
    return { valid: false, message: 'El código de tarjeta de regalo no existe en el sistema o es incorrecto.' };
  }

  const today = new Date().toISOString().split('T')[0];
  if (card.expirationDate && card.expirationDate < today) {
    return { valid: false, message: 'Esta tarjeta de regalo ha vencido su periodo de vigencia (12 meses).', card };
  }

  if (card.currentBalance <= 0 || card.status === 'agotada') {
    return { valid: false, message: 'Esta tarjeta de regalo ya fue utilizada en su totalidad ($0 MXN disponible).', card };
  }

  return {
    valid: true,
    message: `Tarjeta de regalo válida con saldo disponible de $${card.currentBalance.toLocaleString()} MXN.`,
    card
  };
}

/**
 * Aplica el saldo disponible de una tarjeta de regalo al monto de una reserva.
 */
export async function applyGiftCardToBooking(
  clientId: string,
  cardCode: string,
  bookingTotal: number,
  bookingCode: string,
  serviceName?: string
): Promise<{
  amountDeducted: number;
  newBalance: number;
  card: GiftCard;
}> {
  const cards = await getGiftCards(clientId);
  const card = cards.find(c => c.code.toUpperCase() === cardCode.trim().toUpperCase());

  if (!card) {
    throw new Error('Tarjeta de regalo no encontrada.');
  }

  const amountToDeduct = Math.min(card.currentBalance, bookingTotal);
  const remaining = Math.max(0, card.currentBalance - amountToDeduct);

  const updatedCard: Partial<GiftCard> = {
    currentBalance: remaining,
    status: remaining === 0 ? 'agotada' : 'parcialmente_usada',
    history: [
      {
        id: `tx-${Date.now()}`,
        date: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        bookingCode,
        serviceName,
        amountDeducted: amountToDeduct,
        remainingBalance: remaining,
        description: `Consumo aplicado a la reserva ${bookingCode} (${serviceName || 'Masaje'})`
      },
      ...card.history
    ]
  };

  const cardRef = doc(db, 'clientes', clientId, 'billetera', card.id);
  await updateDoc(cardRef, updatedCard);

  return {
    amountDeducted: amountToDeduct,
    newBalance: remaining,
    card: { ...card, ...updatedCard } as GiftCard
  };
}

/**
 * Compra una Tarjeta de Regalo de $1,400 MXN para obsequiar a otra persona.
 */
export async function purchaseGiftCard(clientId: string, params: PurchaseGiftCardParams): Promise<GiftCard> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newCard: Omit<GiftCard, 'id'> = {
    code: `REGALO-ESS-${randomSuffix}`,
    title: `Tarjeta de Regalo ESSENYA $1,400 MXN para ${params.recipientName}`,
    initialAmount: 1400,
    purchasePrice: 1400,
    currentBalance: 1400,
    status: 'activa',
    expirationDate: getDefaultExpiration(),
    createdAt: new Date().toISOString().split('T')[0],
    recipientName: params.recipientName.trim(),
    recipientContact: params.recipientContact?.trim(),
    senderName: params.senderName.trim() || 'Un cliente distinguido',
    customMessage: params.customMessage.trim() || '¡Espero que disfrutes mucho de este masaje relajante!',
    paymentMethod: params.paymentMethod,
    isGiftForSomeoneElse: true,
    history: []
  };

  const billeteraRef = collection(db, 'clientes', clientId, 'billetera');
  const docRef = await addDoc(billeteraRef, newCard);
  
  return { id: docRef.id, ...newCard };
}

/**
 * Canjea o agrega a la billetera una tarjeta de regalo.
 */
export async function redeemExternalGiftCard(clientId: string, code: string): Promise<ValidationResult> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, message: 'Por favor introduce el código de regalo a canjear.' };
  }

  const cards = await getGiftCards(clientId);
  const existing = cards.find(c => c.code.toUpperCase() === cleanCode);

  if (existing) {
    if (existing.currentBalance <= 0 || existing.status === 'agotada') {
      return { valid: false, message: 'Esta tarjeta de regalo ya ha sido consumida en su totalidad ($0 MXN disponible).' };
    }
    
    const cardRef = doc(db, 'clientes', clientId, 'billetera', existing.id);
    await updateDoc(cardRef, { isGiftForSomeoneElse: false });
    existing.isGiftForSomeoneElse = false;
    
    return {
      valid: true,
      message: `¡Tarjeta canjeada con éxito! Tu saldo de $${existing.currentBalance.toLocaleString()} MXN está listo para utilizarse en tus reservas.`,
      card: existing
    };
  }

  if (/^REGALO-ESS-\d{4}$/.test(cleanCode)) {
    const newRedeemedCard: Omit<GiftCard, 'id'> = {
      code: cleanCode,
      title: 'Tarjeta de Regalo ESSENYA Canjeada ($1,400 MXN)',
      initialAmount: 1400,
      purchasePrice: 1400,
      currentBalance: 1400,
      status: 'activa',
      expirationDate: getDefaultExpiration(),
      createdAt: new Date().toISOString().split('T')[0],
      recipientName: 'Mi Cuenta',
      senderName: 'Obsequio de un ser querido',
      customMessage: 'Tarjeta de regalo canjeada en billetera para agendar masajes terapéuticos de autor.',
      paymentMethod: 'tarjeta',
      isGiftForSomeoneElse: false,
      history: []
    };
    
    const billeteraRef = collection(db, 'clientes', clientId, 'billetera');
    const docRef = await addDoc(billeteraRef, newRedeemedCard);
    
    return {
      valid: true,
      message: '¡Tarjeta de regalo de $1,400 MXN canjeada exitosamente! Se ha añadido a tu saldo para agendar masajes.',
      card: { id: docRef.id, ...newRedeemedCard }
    };
  }

  return {
    valid: false,
    message: 'El código ingresado no existe o no corresponde a una tarjeta de regalo válida de ESSENYA.'
  };
}

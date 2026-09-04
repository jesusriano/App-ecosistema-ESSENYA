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
  initialAmount: number; // 1400 MXN (Valor del regalo)
  purchasePrice: number; // 1400 MXN (Costo que el cliente pagó al comprarla)
  currentBalance: number;
  status: 'activa' | 'parcialmente_usada' | 'agotada' | 'vencida';
  expirationDate: string; // 12 meses
  createdAt: string;
  recipientName?: string; // Para quién es el regalo
  recipientContact?: string; // Teléfono / WhatsApp del destinatario
  senderName?: string; // Quién lo regala
  customMessage?: string; // Dedicatoria
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

const BILLETERA_STORAGE_KEY = 'essenya_billetera_gift_cards';

/**
 * Fecha por defecto de vencimiento: 12 meses a partir de la emisión
 */
function getDefaultExpiration(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Tarjetas de regalo iniciales de demostración:
 * Vacío por defecto: ningún socio nuevo tiene saldo falso ni tarjetas inventadas.
 */
const DEFAULT_GIFT_CARDS: GiftCard[] = [];

export function getGiftCards(): GiftCard[] {
  try {
    const raw = localStorage.getItem(BILLETERA_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as GiftCard[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Depurar cualquier tarjeta demo residual que inyectaba saldo ficticio de $1,400
    const filtered = parsed.filter(c => c.id !== 'gc-demo-comprada-01' && c.code !== 'REGALO-ESS-1400');
    if (filtered.length !== parsed.length) {
      saveGiftCards(filtered);
    }
    return filtered;
  } catch {
    return [];
  }
}

export function saveGiftCards(cards: GiftCard[]): void {
  try {
    localStorage.setItem(BILLETERA_STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('Error guardando tarjetas en la Billetera:', e);
  }
}

/**
 * Saldo en cuenta disponible para que el cliente pague sus propias reservas.
 * Solo computa tarjetas canjeadas / recibidas para uso propio (isGiftForSomeoneElse === false).
 * Las tarjetas compradas para obsequiar a otras personas NO forman parte del saldo en cuenta del comprador.
 */
export function getBilleteraTotalBalance(): number {
  const cards = getGiftCards();
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
export function validateGiftCardCode(rawCode: string): ValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, message: 'Por favor introduce el código de la tarjeta de regalo.' };
  }

  const cards = getGiftCards();
  const card = cards.find(c => c.code.toUpperCase() === code);

  if (!card) {
    return { valid: false, message: 'El código de tarjeta de regalo no existe en el sistema o es incorrecto.' };
  }

  // Verificar fecha de vencimiento
  const today = new Date().toISOString().split('T')[0];
  if (card.expirationDate && card.expirationDate < today) {
    return { valid: false, message: 'Esta tarjeta de regalo ha vencido su periodo de vigencia (12 meses).', card };
  }

  // Verificar si está agotada
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
 * Maneja consumos parciales conservando el saldo restante.
 */
export function applyGiftCardToBooking(
  cardCode: string,
  bookingTotal: number,
  bookingCode: string,
  serviceName?: string
): {
  amountDeducted: number;
  newBalance: number;
  card: GiftCard;
} {
  const cards = getGiftCards();
  const index = cards.findIndex(c => c.code.toUpperCase() === cardCode.trim().toUpperCase());

  if (index === -1) {
    throw new Error('Tarjeta de regalo no encontrada.');
  }

  const card = cards[index];
  const amountToDeduct = Math.min(card.currentBalance, bookingTotal);
  const remaining = Math.max(0, card.currentBalance - amountToDeduct);

  const updatedCard: GiftCard = {
    ...card,
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

  cards[index] = updatedCard;
  saveGiftCards(cards);

  return {
    amountDeducted: amountToDeduct,
    newBalance: remaining,
    card: updatedCard
  };
}

/**
 * Compra una Tarjeta de Regalo de $1,400 MXN para obsequiar a otra persona.
 * El cliente paga $1,400 MXN y genera un cupón de regalo digital con dedicatoria.
 */
export function purchaseGiftCard(params: PurchaseGiftCardParams): GiftCard {
  const cards = getGiftCards();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newCard: GiftCard = {
    id: `gc-gift-${Date.now()}-${randomSuffix}`,
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

  const updated = [newCard, ...cards];
  saveGiftCards(updated);
  return newCard;
}

/**
 * Canjea o agrega a la billetera una tarjeta de regalo que alguien le regaló al cliente.
 * Al canjearla, el saldo se añade a su cuenta personal para pagar reservas.
 */
export function redeemExternalGiftCard(code: string): ValidationResult {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, message: 'Por favor introduce el código de regalo a canjear.' };
  }

  const cards = getGiftCards();
  const existing = cards.find(c => c.code.toUpperCase() === cleanCode);

  if (existing) {
    if (existing.currentBalance <= 0 || existing.status === 'agotada') {
      return { valid: false, message: 'Esta tarjeta de regalo ya ha sido consumida en su totalidad ($0 MXN disponible).' };
    }
    // Al canjearla pasa a ser saldo personal del cliente
    existing.isGiftForSomeoneElse = false;
    saveGiftCards(cards);
    return {
      valid: true,
      message: `¡Tarjeta canjeada con éxito! Tu saldo de $${existing.currentBalance.toLocaleString()} MXN está listo para utilizarse en tus reservas.`,
      card: existing
    };
  }

  // Si es un código válido emitido de regalo ESSENYA (ej. REGALO-ESS-XXXX)
  if (/^REGALO-ESS-\d{4}$/.test(cleanCode)) {
    const newRedeemedCard: GiftCard = {
      id: `gc-redeemed-${Date.now()}`,
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
    saveGiftCards([newRedeemedCard, ...cards]);
    return {
      valid: true,
      message: '¡Tarjeta de regalo de $1,400 MXN canjeada exitosamente! Se ha añadido a tu saldo para agendar masajes.',
      card: newRedeemedCard
    };
  }

  return {
    valid: false,
    message: 'El código ingresado no existe o no corresponde a una tarjeta de regalo válida de ESSENYA.'
  };
}

const fs = require('fs');
const content = `import { auth } from '../../../lib/firebase';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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
  status: 'activa' | 'parcialmente_usada' | 'agotada' | 'vencida' | 'canjeada';
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

export interface ValidationResult {
  valid: boolean;
  message: string;
  card?: GiftCard;
}

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = await auth.currentUser?.getIdToken();
  if (token) headers['Authorization'] = \`Bearer \${token}\`;
  return headers;
}

export async function getGiftCards(clientId: string): Promise<GiftCard[]> {
  if (!clientId) return [];
  try {
    const billeteraRef = collection(db, 'clientes', clientId, 'billetera');
    const snap = await getDocs(billeteraRef);
    const cards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GiftCard));
    return cards.filter(c => c.id !== 'gc-demo-comprada-01' && c.code !== 'REGALO-ESS-1400');
  } catch (e) {
    console.error('Error obteniendo billetera de Firestore:', e);
    return [];
  }
}

export async function getBilleteraTotalBalance(clientId: string): Promise<number> {
  const cards = await getGiftCards(clientId);
  return cards.reduce((sum, c) => {
    const isPersonal = !c.isGiftForSomeoneElse;
    const isActive = c.status !== 'agotada' && c.status !== 'vencida' && c.status !== 'canjeada';
    return sum + (isPersonal && isActive ? c.currentBalance : 0);
  }, 0);
}

export async function validateGiftCardCode(clientId: string, rawCode: string): Promise<ValidationResult> {
  // This is a dummy validation to avoid failing immediately, actual atomic validation happens in backend
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, message: 'Código vacío.' };
  return { valid: true, message: 'Validación provisional, se procesará atómicamente.' };
}

export async function applyGiftCardToBooking() {
  throw new Error("Deprecado. El saldo se aplica automáticamente mediante el backend atómico (/api/bookings/atomic).");
}

export async function purchaseGiftCard(clientId: string, params: PurchaseGiftCardParams): Promise<GiftCard> {
  const response = await fetch('/api/wallet/purchase', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(params)
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.card;
}

export async function redeemExternalGiftCard(clientId: string, code: string): Promise<ValidationResult> {
  const response = await fetch('/api/wallet/redeem', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ code })
  });
  const data = await response.json();
  if (!data.success) {
    return { valid: false, message: data.error };
  }
  return { valid: true, message: data.message, card: data.card };
}
`;
fs.writeFileSync('src/aplicaciones/cliente/services/billeteraService.ts', content);
console.log("Patched billeteraService.ts");

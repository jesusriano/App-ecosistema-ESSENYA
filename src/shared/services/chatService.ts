import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc,
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: 'cliente' | 'terapeuta' | 'administrador';
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ConversationSummary {
  id: string; // bookingId
  bookingId: string;
  bookingCode: string;
  clientId: string;
  clientName: string;
  therapistId?: string;
  therapistName?: string;
  serviceName?: string;
  cityZone?: string;
  lastMessage?: string;
  lastSenderId?: string;
  lastSenderName?: string;
  lastSenderRole?: 'cliente' | 'terapeuta' | 'administrador';
  updatedAt: string;
  createdAt: string;
  unreadByClient?: number;
  unreadByTherapist?: number;
}

/**
 * Initializes or updates the conversation metadata document in Firestore
 */
export async function ensureConversationDoc(
  bookingId: string, 
  data: {
    bookingCode: string;
    clientId: string;
    clientName: string;
    therapistId?: string;
    therapistName?: string;
    serviceName?: string;
    cityZone?: string;
  }
): Promise<void> {
  if (!db || !bookingId) return;

  try {
    const convRef = doc(db, 'conversaciones', bookingId);
    const nowIso = new Date().toISOString();

    const initialData: Record<string, any> = {
      id: bookingId,
      bookingId,
      bookingCode: data.bookingCode || 'ESS-0000',
      serviceName: data.serviceName || 'Servicio ESSENYA',
      cityZone: data.cityZone || 'CDMX',
      updatedAt: nowIso
    };
    if (data.clientId) initialData.clientId = data.clientId;
    if (data.clientName) initialData.clientName = data.clientName;
    if (data.therapistId) initialData.therapistId = data.therapistId;
    if (data.therapistName) initialData.therapistName = data.therapistName;

    await setDoc(convRef, initialData, { merge: true });
  } catch (err) {
    console.warn('[chatService] Error ensuring conversation doc:', err);
  }
}

/**
 * Sends a message in a reservation chat
 */
export async function sendChatMessage(params: {
  bookingId: string;
  bookingCode?: string;
  senderId: string;
  senderName: string;
  senderRole: 'cliente' | 'terapeuta' | 'administrador';
  text: string;
  clientId?: string;
  clientName?: string;
  therapistId?: string;
  therapistName?: string;
}): Promise<ChatMessage> {
  const cleanText = (params.text || '').trim();
  if (!cleanText) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  const nowIso = new Date().toISOString();
  const convRef = doc(db, 'conversaciones', params.bookingId);
  const msgCollectionRef = collection(db, 'conversaciones', params.bookingId, 'mensajes');

  // 1. Ensure parent conversation exists
  await ensureConversationDoc(params.bookingId, {
    bookingCode: params.bookingCode || 'ESS-0000',
    clientId: params.clientId || '',
    clientName: params.clientName || 'Cliente VIP',
    therapistId: params.therapistId || '',
    therapistName: params.therapistName || ''
  });

  // 2. Add message to subcollection
  const newMsgDoc = await addDoc(msgCollectionRef, {
    bookingId: params.bookingId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    text: cleanText,
    createdAt: nowIso,
    read: false
  });

  // 3. Update conversation parent summary
  await updateDoc(convRef, {
    lastMessage: cleanText,
    lastSenderId: params.senderId,
    lastSenderName: params.senderName,
    lastSenderRole: params.senderRole,
    updatedAt: nowIso
  }).catch(() => {});

  // 4. Trigger Web Push Notification to recipient
  try {
    const isClientSender = params.senderRole === 'cliente';
    let targetUserId = isClientSender ? params.therapistId : params.clientId;

    // Safe resolution of targetUserId if omitted in UI call parameters
    if (!targetUserId) {
      try {
        const convSnap = await getDoc(convRef);
        if (convSnap.exists()) {
          const convData = convSnap.data();
          targetUserId = isClientSender ? convData?.therapistId : convData?.clientId;
        }
        if (!targetUserId) {
          const bookingSnap = await getDoc(doc(db, 'reservas', params.bookingId));
          if (bookingSnap.exists()) {
            const bData = bookingSnap.data();
            targetUserId = isClientSender ? (bData?.therapistId || bData?.therapistId2) : bData?.clientId;
          }
        }
      } catch (lookupErr) {
        console.warn('[chatService] Error al resolver targetUserId de conversación/reserva en Firestore:', lookupErr);
      }
    }

    if (targetUserId && typeof targetUserId === 'string' && targetUserId.trim()) {
      const targetRole = isClientSender ? 'terapeuta' : 'cliente';
      const recipientTitle = `💬 Mensaje de ${params.senderName}`;
      const truncatedBody = cleanText.length > 90 ? cleanText.substring(0, 87) + '...' : cleanText;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          console.warn('[chatService] Usuario no autenticado al obtener token Bearer para Push de chat.');
        }
      } catch (authErr) {
        console.warn('[chatService] Error al obtener token de autenticación para Push de chat:', authErr);
      }

      try {
        const pushRes = await fetch('/api/push/send', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userId: targetUserId,
            role: targetRole,
            title: recipientTitle,
            body: truncatedBody,
            url: targetRole === 'terapeuta' ? '/terapeuta' : '/cliente',
            tag: `chat-${params.bookingId}`,
            soundPreset: 'bell',
            data: {
              type: 'chat_message',
              bookingId: params.bookingId,
              senderName: params.senderName
            }
          })
        });

        if (!pushRes.ok) {
          const errorData = await pushRes.json().catch(() => null);
          console.warn('[chatService] Error del servidor en Push de chat:', pushRes.status, errorData?.error || pushRes.statusText);
        } else {
          const pushResult = await pushRes.json().catch(() => null);
          if (pushResult && !pushResult.success) {
            console.warn('[chatService] Push de chat no entregado:', pushResult.error);
          } else {
            console.log(`[chatService] Push de chat enviado exitosamente a ${targetUserId}`);
          }
        }
      } catch (fetchErr) {
        console.warn('[chatService] Error de red en enviando Push de chat a /api/push/send:', fetchErr);
      }
    } else {
      console.warn(`[chatService] No se pudo enviar Push de chat: destinatario no especificado y no encontrado para reserva ${params.bookingId}`);
    }
  } catch (e: any) {
    console.warn('[chatService] Error general en flujo secundario de Push de chat:', e?.message || e);
  }

  return {
    id: newMsgDoc.id,
    bookingId: params.bookingId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    text: cleanText,
    createdAt: nowIso,
    read: false
  };
}

/**
 * Subscribes to real-time messages for a specific booking
 */
export function subscribeToChatMessages(
  bookingId: string, 
  callback: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db || !bookingId) {
    callback([]);
    return () => {};
  }

  const msgQuery = query(
    collection(db, 'conversaciones', bookingId, 'mensajes'),
    orderBy('createdAt', 'asc'),
    limit(200)
  );

  return onSnapshot(
    msgQuery,
    (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          bookingId: d.bookingId || bookingId,
          senderId: d.senderId || '',
          senderName: d.senderName || 'Usuario',
          senderRole: d.senderRole || 'cliente',
          text: d.text || '',
          createdAt: d.createdAt || new Date().toISOString(),
          read: Boolean(d.read)
        };
      });
      callback(msgs);
    },
    (err) => {
      console.warn('[chatService] Snapshot error on messages:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to all active conversations for the Admin supervisor panel
 */
export function subscribeToAllConversations(
  callback: (conversations: ConversationSummary[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  const convQuery = query(
    collection(db, 'conversaciones'),
    orderBy('updatedAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    convQuery,
    (snapshot) => {
      const list: ConversationSummary[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          bookingId: d.bookingId || doc.id,
          bookingCode: d.bookingCode || 'ESS-0000',
          clientId: d.clientId || '',
          clientName: d.clientName || 'Cliente VIP',
          therapistId: d.therapistId,
          therapistName: d.therapistName,
          serviceName: d.serviceName,
          cityZone: d.cityZone,
          lastMessage: d.lastMessage || '',
          lastSenderId: d.lastSenderId,
          lastSenderName: d.lastSenderName,
          lastSenderRole: d.lastSenderRole,
          updatedAt: d.updatedAt || new Date().toISOString(),
          createdAt: d.createdAt || new Date().toISOString()
        };
      });
      callback(list);
    },
    (err) => {
      console.warn('[chatService] Snapshot error on all conversations:', err);
      if (onError) onError(err);
    }
  );
}

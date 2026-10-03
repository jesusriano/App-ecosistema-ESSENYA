import { useState, useEffect } from 'react';
import { Booking, Therapist } from '../types';
import { sendChatMessage, subscribeToChatMessages } from '../shared/services/chatService';
import { notifyTherapistNewMessage, isUrgentChatMessage } from '../shared/utils/notificationAudio';

interface ChatMessageItem {
  sender: string;
  text: string;
  time: string;
  read?: boolean;
}

interface UseTherapistChatOptions {
  currentBooking: Booking | null;
  activeTherapist: Therapist;
  activeTab: string;
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info' | 'gold') => void;
}

export function useTherapistChat({
  currentBooking,
  activeTherapist,
  activeTab,
  showToast
}: UseTherapistChatOptions) {
  const [chatInput, setChatInput] = useState<string>('');
  const [isClientTyping, setIsClientTyping] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('essenya_therapist_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('essenya_therapist_vibration_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const [recentMessageAlert, setRecentMessageAlert] = useState<{
    sender: string;
    text: string;
    time: string;
    isUrgent: boolean;
  } | null>(null);

  const [isNotifyingPulse, setIsNotifyingPulse] = useState<boolean>(false);

  // Auto-dismiss floating notification banner after 6 seconds
  useEffect(() => {
    if (!recentMessageAlert) return;
    const timer = setTimeout(() => {
      setRecentMessageAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [recentMessageAlert]);

  const handleIncomingMessage = (text: string, senderName?: string) => {
    setIsClientTyping(false);
    const resolvedSender = senderName || currentBooking?.clientName || 'Cliente';
    const isUrgent = isUrgentChatMessage(text);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessageItem = {
      sender: resolvedSender,
      text,
      time: timeStr,
      read: activeTab === 'active'
    };

    setMessages(prev => [...prev, newMsg]);

    setIsNotifyingPulse(true);
    setTimeout(() => setIsNotifyingPulse(false), 1500);

    notifyTherapistNewMessage({
      soundEnabled,
      vibrationEnabled,
      isUrgent
    });

    setRecentMessageAlert({
      sender: resolvedSender,
      text,
      time: timeStr,
      isUrgent
    });

    if (activeTab !== 'active') {
      setUnreadChatCount(prev => prev + 1);
    }

    showToast(
      isUrgent ? '⚠️ Petición Urgente del Cliente' : '💬 Mensaje de la Cita Activa',
      `${resolvedSender}: "${text.length > 55 ? text.substring(0, 52) + '...' : text}"`,
      isUrgent ? 'error' : 'gold'
    );
  };

  // Real-time listener for incoming messages from active booking client via window event
  useEffect(() => {
    const handleRemoteMessage = (event: any) => {
      const { bookingId, text, sender } = event?.detail || {};
      if (text) {
        if (!bookingId || !currentBooking?.id || bookingId === currentBooking.id) {
          handleIncomingMessage(text, sender || currentBooking?.clientName || 'Cliente');
        }
      }
    };

    window.addEventListener('essenya_chat_message', handleRemoteMessage);
    return () => {
      window.removeEventListener('essenya_chat_message', handleRemoteMessage);
    };
  }, [currentBooking?.id, currentBooking?.clientName, activeTab, soundEnabled, vibrationEnabled]);

  // Real-time chat listener for active reservation
  useEffect(() => {
    if (!currentBooking?.id) return;

    const unsubscribe = subscribeToChatMessages(currentBooking.id, (realMsgs) => {
      if (realMsgs.length > 0) {
        setMessages(realMsgs.map(m => ({
          sender: m.senderName,
          text: m.text,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: m.read
        })));
      }
    });

    return () => unsubscribe();
  }, [currentBooking?.id]);

  const handleSendChat = async () => {
    const textToSend = chatInput.trim();
    if (!textToSend || !currentBooking) return;

    setChatInput('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { 
      sender: activeTherapist.name || 'Terapeuta', 
      text: textToSend, 
      time: timeStr,
      read: false
    }]);

    try {
      await sendChatMessage({
        bookingId: currentBooking.id,
        bookingCode: currentBooking.code,
        senderId: activeTherapist.id,
        senderName: activeTherapist.name || 'Terapeuta',
        senderRole: 'terapeuta',
        text: textToSend,
        clientId: currentBooking.clientId,
        clientName: currentBooking.clientName,
        therapistId: activeTherapist.id,
        therapistName: activeTherapist.name
      });
    } catch (err: any) {
      console.error('[TherapistApp] Error sending chat message:', err);
      showToast('Error de Mensajería', 'No se pudo enviar el mensaje al cliente.', 'error');
    }
  };

  const handleSimulateClientMessage = (type: 'urgent' | 'access' | 'routine') => {
    setIsClientTyping(true);
    setTimeout(() => {
      let msg = '';
      if (type === 'urgent') {
        msg = 'Por favor tomen nota: tengo alergia al aceite de almendras y ligera molestia en cervicales, requiero toallas adicionales tibias.';
      } else if (type === 'access') {
        msg = 'El timbre principal no funciona, por favor toca el interfón 4B o avísame al llegar para abrir el portón.';
      } else {
        const firstName = activeTherapist?.name ? activeTherapist.name.split(' ')[0] : 'Terapeuta';
        msg = `Hola ${firstName}, ¿podrías confirmarme si traen el difusor aromático de lavanda? Muchas gracias.`;
      }
      handleIncomingMessage(msg);
    }, 1000);
  };

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    try {
      localStorage.setItem('essenya_therapist_sound_enabled', String(nextState));
    } catch {}

    if (nextState) {
      notifyTherapistNewMessage({ soundEnabled: true, vibrationEnabled: false, isUrgent: false });
      showToast('Notificación Sonora Activada', 'Campanilla sutil activada para nuevos mensajes.', 'gold');
    } else {
      showToast('Sonido Silenciado', 'Los mensajes se recibirán en modo silencioso.', 'info');
    }
  };

  const handleToggleVibration = () => {
    const nextState = !vibrationEnabled;
    setVibrationEnabled(nextState);
    try {
      localStorage.setItem('essenya_therapist_vibration_enabled', String(nextState));
    } catch {}

    if (nextState) {
      notifyTherapistNewMessage({ soundEnabled: false, vibrationEnabled: true, isUrgent: false });
      showToast('Vibración Hábiles Activada', 'Vibración suave activada para nuevos mensajes.', 'gold');
    } else {
      showToast('Vibración Desactivada', 'Vibración desactivada.', 'info');
    }
  };

  const handleTestNotificationSound = (urgent: boolean = false) => {
    setIsNotifyingPulse(true);
    setTimeout(() => setIsNotifyingPulse(false), 1500);

    notifyTherapistNewMessage({
      soundEnabled: true,
      vibrationEnabled: true,
      isUrgent: urgent
    });

    showToast(
      urgent ? '⚠️ Petición Urgente (Prueba)' : '🔔 Notificación Spa (Prueba)',
      urgent 
        ? 'Campanilla distintiva de 3 armónicos y vibración háptica triple ejecutadas.'
        : 'Campanilla armónica sutil de 2 tonos y vibración táctil suave ejecutadas.',
      urgent ? 'error' : 'gold'
    );
  };

  return {
    chatInput,
    setChatInput,
    isClientTyping,
    messages,
    unreadChatCount,
    setUnreadChatCount,
    soundEnabled,
    vibrationEnabled,
    recentMessageAlert,
    setRecentMessageAlert,
    isNotifyingPulse,
    handleSendChat,
    handleSimulateClientMessage,
    handleToggleSound,
    handleToggleVibration,
    handleTestNotificationSound
  };
}

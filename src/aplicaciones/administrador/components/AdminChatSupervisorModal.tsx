import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MessageSquare, Shield, Clock, Send, User, Sparkles, CheckCircle2, AlertCircle, Eye 
} from 'lucide-react';
import { 
  ChatMessage, 
  sendChatMessage, 
  subscribeToChatMessages,
  ensureConversationDoc 
} from '../../../shared/services/chatService';
import { Booking } from '../../../shared/types';
import { useAuth } from '../../../shared/context/AuthContext';

interface AdminChatSupervisorModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminChatSupervisorModal: React.FC<AdminChatSupervisorModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  const { getUser } = useAuth();
  const adminUser = getUser('administrador');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interventionInput, setInterventionInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !booking) return;

    ensureConversationDoc(booking.id, {
      bookingCode: booking.code,
      clientId: booking.clientId,
      clientName: booking.clientName,
      therapistId: booking.therapistId,
      therapistName: booking.therapistName,
      serviceName: booking.serviceName,
      cityZone: booking.cityZone
    });

    const unsubscribe = subscribeToChatMessages(
      booking.id,
      (newMsgs) => {
        setMessages(newMsgs);
        setTimeout(scrollToBottom, 100);
      },
      (err) => console.warn('[AdminChatSupervisor] Error:', err)
    );

    return () => unsubscribe();
  }, [isOpen, booking]);

  const handleAdminSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!interventionInput.trim() || sending || !booking) return;

    setSending(true);
    try {
      await sendChatMessage({
        bookingId: booking.id,
        bookingCode: booking.code,
        senderId: adminUser?.uid || 'admin_central',
        senderName: 'Central ESSENYA (Supervisión)',
        senderRole: 'administrador',
        text: interventionInput.trim(),
        clientId: booking.clientId,
        clientName: booking.clientName,
        therapistId: booking.therapistId,
        therapistName: booking.therapistName
      });
      setInterventionInput('');
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('[AdminChatSupervisor] Error sending admin message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-color)] bg-[var(--bg-subcard)] flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A55B]/15 border border-[#C9A55B]/30 flex items-center justify-center text-[#C9A55B] shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-base text-[var(--text-primary)] truncate">
                  Supervisión de Chat: {booking.code}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {booking.serviceName} • {booking.cityZone || 'CDMX'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Participants Overview Bar */}
        <div className="grid grid-cols-2 gap-3 p-3 sm:px-5 bg-[var(--bg-subcard)]/50 border-b border-[var(--border-color)] text-xs shrink-0">
          <div className="bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-color)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A55B] block">
              Cliente VIP
            </span>
            <span className="font-bold text-[var(--text-primary)] block truncate mt-0.5">
              {booking.clientName || 'Cliente'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate block">
              ID: {booking.clientId ? booking.clientId.substring(0, 12) + '...' : 'N/A'}
            </span>
          </div>

          <div className="bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-color)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
              Terapeuta Asignada
            </span>
            <span className="font-bold text-[var(--text-primary)] block truncate mt-0.5">
              {booking.therapistName || 'Sin asignar'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate block">
              ID: {booking.therapistId ? booking.therapistId.substring(0, 12) + '...' : 'Pendiente'}
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[var(--bg-main)] min-h-[280px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-[var(--text-muted)]">
              <MessageSquare className="w-8 h-8 opacity-40 text-[#C9A55B]" />
              <p className="text-xs font-semibold">No se han registrado mensajes en esta reserva todavía.</p>
              <p className="text-[11px] opacity-70">Los mensajes enviados entre el cliente y la terapeuta aparecerán aquí en tiempo real.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.senderRole === 'administrador';
              const isClient = msg.senderRole === 'cliente';
              const isTherapist = msg.senderRole === 'terapeuta';

              const roleLabel = isAdmin 
                ? 'Central Admin' 
                : isClient 
                ? 'Cliente VIP' 
                : 'Terapeuta';

              const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });

              return (
                <div 
                  key={msg.id} 
                  className={`p-3 rounded-2xl border transition-all ${
                    isAdmin
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isClient
                      ? 'bg-[#C9A55B]/10 border-[#C9A55B]/30'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <strong className={`font-bold ${
                        isAdmin ? 'text-amber-400' : isClient ? 'text-[#C9A55B]' : 'text-emerald-400'
                      }`}>
                        {msg.senderName}
                      </strong>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full uppercase font-mono font-bold bg-white/10 text-[var(--text-muted)]">
                        {roleLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{timeStr}</span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Admin Intervention Send Bar */}
        <form 
          onSubmit={handleAdminSend}
          className="p-3 sm:p-4 bg-[var(--bg-subcard)] border-t border-[var(--border-color)] flex items-center space-x-2 shrink-0"
        >
          <input
            type="text"
            value={interventionInput}
            onChange={(e) => setInterventionInput(e.target.value)}
            placeholder="Enviar mensaje de mediación como Central ESSENYA..."
            disabled={sending}
            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#C9A55B] rounded-xl px-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!interventionInput.trim() || sending}
            className="px-4 py-2 bg-[#C9A55B] hover:bg-[#B89448] disabled:opacity-40 text-black font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Intervenir</span>
          </button>
        </form>

      </div>
    </div>
  );
};

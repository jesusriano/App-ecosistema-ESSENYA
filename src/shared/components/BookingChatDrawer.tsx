import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, ShieldCheck, Lock, Clock, User, Sparkles, MessageCircle, AlertCircle 
} from 'lucide-react';
import { 
  ChatMessage, 
  sendChatMessage, 
  subscribeToChatMessages,
  ensureConversationDoc
} from '../services/chatService';
import { auth } from '../../lib/firebase';

interface BookingChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingCode: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'cliente' | 'terapeuta' | 'administrador';
  otherUserName: string;
  otherUserRole?: 'cliente' | 'terapeuta';
  clientId?: string;
  clientName?: string;
  therapistId?: string;
  therapistName?: string;
}

export const BookingChatDrawer: React.FC<BookingChatDrawerProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingCode,
  currentUserId,
  currentUserName,
  currentUserRole,
  otherUserName,
  otherUserRole,
  clientId,
  clientName,
  therapistId,
  therapistName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    // Initialize conversation document
    ensureConversationDoc(bookingId, {
      bookingCode,
      clientId: clientId || (currentUserRole === 'cliente' ? currentUserId : ''),
      clientName: clientName || (currentUserRole === 'cliente' ? currentUserName : otherUserName),
      therapistId: therapistId || (currentUserRole === 'terapeuta' ? currentUserId : ''),
      therapistName: therapistName || (currentUserRole === 'terapeuta' ? currentUserName : otherUserName)
    });

    // Real-time listener for messages
    const unsubscribe = subscribeToChatMessages(
      bookingId,
      (newMsgs) => {
        setMessages(newMsgs);
        setTimeout(scrollToBottom, 100);
      },
      (err) => {
        console.warn('[BookingChatDrawer] Error loading messages:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, bookingId, bookingCode, currentUserId, currentUserName, currentUserRole, otherUserName, clientId, clientName, therapistId, therapistName]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 150);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputValue.trim();
    if (!textToSend || sending) return;

    setSending(true);
    setErrorMsg(null);
    const effectiveSenderId = auth.currentUser?.uid || currentUserId;
    try {
      await sendChatMessage({
        bookingId,
        bookingCode,
        senderId: effectiveSenderId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        text: textToSend,
        clientId: clientId || (currentUserRole === 'cliente' ? effectiveSenderId : undefined),
        clientName: clientName || (currentUserRole === 'cliente' ? currentUserName : otherUserName),
        therapistId: therapistId || (currentUserRole === 'terapeuta' ? effectiveSenderId : undefined),
        therapistName: therapistName || (currentUserRole === 'terapeuta' ? currentUserName : otherUserName)
      });
      setInputValue('');
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error('[BookingChatDrawer] Error sending message:', err);
      setErrorMsg(err.message || 'No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const displayOtherRoleLabel = otherUserRole === 'terapeuta' 
    ? 'Terapeuta Certificada' 
    : otherUserRole === 'cliente' 
    ? 'Socio VIP' 
    : 'Usuario';

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-[#141414] border-l border-[#E5DFD3] dark:border-[#262626] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5DFD3] dark:border-[#262626] bg-[#FAF8F5] dark:bg-[#1A1A1A] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#C9A55B]/15 border border-[#C9A55B]/40 flex items-center justify-center text-[#806020] dark:text-[#C9A55B] font-serif font-bold text-sm shrink-0">
              {otherUserName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                  {otherUserName}
                </h3>
                <span className="text-[9px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  {displayOtherRoleLabel}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                <span>Reserva:</span>
                <span className="font-mono font-bold text-[#C9A55B]">{bookingCode}</span>
                <span>• En línea</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Cerrar chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy & Safety Notice Banner */}
        <div className="bg-[#FAF8F5]/80 dark:bg-[#141414]/90 border-b border-[#E5DFD3]/60 dark:border-[#262626] px-4 py-2.5 flex items-center space-x-2.5 text-[11px] text-[#806020] dark:text-[#C9A55B] shrink-0">
          <Lock className="w-4 h-4 shrink-0 text-[#C9A55B]" />
          <span>
            <strong>Privacidad protegida:</strong> La comunicación es directa e interna. Los números de teléfono se mantienen 100% privados.
          </span>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-[#FAF8F5]/40 to-transparent dark:from-[#0D0D0D]/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 flex items-center justify-center text-[#C9A55B]">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Inicia la conversación
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                  Escribe un mensaje para coordinar detalles de llegada o preferencias con {otherUserName}.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId || (msg.senderRole === currentUserRole);
              const isAdminMsg = msg.senderRole === 'administrador';
              const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Name label */}
                  <span className="text-[10px] font-bold text-[var(--text-muted)] mb-1 px-1">
                    {msg.senderName} {isAdminMsg ? '(Soporte Central)' : isMine ? '(Tú)' : ''}
                  </span>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                      isAdminMsg
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200'
                        : isMine
                        ? 'bg-[#C9A55B] text-black font-medium rounded-br-xs'
                        : 'bg-[#FAF8F5] dark:bg-[#1E1E1E] border border-[#E5DFD3] dark:border-[#2E2E2E] text-[var(--text-primary)] rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </p>
                    <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
                      isMine ? 'text-black/60 font-semibold' : 'text-[var(--text-muted)]'
                    }`}>
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message if send fails */}
        {errorMsg && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Bar */}
        <form 
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-[#FAF8F5] dark:bg-[#1A1A1A] border-t border-[#E5DFD3] dark:border-[#262626] flex items-center space-x-2 shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Escribe un mensaje para ${otherUserName}...`}
            disabled={sending}
            maxLength={500}
            className="flex-1 bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#333333] focus:border-[#C9A55B] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sending}
            className="p-2.5 sm:px-4 sm:py-2.5 bg-[#C9A55B] hover:bg-[#B89448] disabled:opacity-40 disabled:hover:bg-[#C9A55B] text-black font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>

      </div>
    </div>
  );
};

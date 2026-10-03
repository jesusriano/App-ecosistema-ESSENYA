import React, { useState } from 'react';
import { X, Send, AlertTriangle, Key, ShieldCheck, Sparkles } from 'lucide-react';
import { sendChatMessage } from '../services/chatService';
import { auth } from '../../lib/firebase';

interface ClientQuickAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'urgent' | 'access';
  bookingId: string;
  bookingCode: string;
  currentUserId: string;
  currentUserName: string;
  therapistId?: string;
  therapistName?: string;
  onSuccess?: (msg: string) => void;
}

export const ClientQuickAlertModal: React.FC<ClientQuickAlertModalProps> = ({
  isOpen,
  onClose,
  type,
  bookingId,
  bookingCode,
  currentUserId,
  currentUserName,
  therapistId,
  therapistName = 'Terapeuta',
  onSuccess
}) => {
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const urgentPresets = [
    'Alergia o sensibilidad a aceites / esencia neutra',
    'Solicitar cambio de nivel de presión (Suave / Firme)',
    'Toallas adicionales sanitizadas de repuesto',
    'Modificación especial de horario de entrada'
  ];

  const accessPresets = [
    'Tocar el interfón / timbre y decir ESSENYA',
    'Llamarme al teléfono móvil al llegar al domicilio',
    'Anunciarse en la caseta de seguridad de la privada',
    'El timbre principal no sirve, tocar directamente la puerta'
  ];

  const presets = type === 'urgent' ? urgentPresets : accessPresets;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = customText.trim();
    if (!cleanText || sending) return;

    setSending(true);
    setErrorMsg(null);

    const effectiveSenderId = auth.currentUser?.uid || currentUserId;
    const prefix = type === 'urgent' ? '⚠️ [PETICIÓN URGENTE]: ' : '🚪 [ACCESO INTERFÓN / ALERTA]: ';
    const fullText = `${prefix}${cleanText}`;

    try {
      await sendChatMessage({
        bookingId,
        bookingCode,
        senderId: effectiveSenderId,
        senderName: currentUserName || 'Cliente VIP',
        senderRole: 'cliente',
        text: fullText,
        therapistId,
        therapistName
      });

      if (onSuccess) {
        onSuccess(
          type === 'urgent'
            ? 'Petición urgente enviada con éxito a tu terapeuta.'
            : 'Instrucciones de interfón y acceso notificadas con éxito.'
        );
      }
      setCustomText('');
      onClose();
    } catch (err: any) {
      console.error('[ClientQuickAlertModal] Error enviando mensaje:', err);
      setErrorMsg(err.message || 'No se pudo enviar la alerta. Intenta nuevamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#141414] border border-[#C9A55B]/40 rounded-2xl shadow-2xl overflow-hidden p-6 text-white space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#262626] pb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              type === 'urgent'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
            }`}>
              {type === 'urgent' ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <Key className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-white">
                {type === 'urgent' ? '⚠️ Enviar Petición Urgente' : '🚪 Acceso Interfón & Alerta de Llegada'}
              </h3>
              <p className="text-xs text-[#AAAAAA]">
                Cita <span className="font-mono font-bold text-[#C9A55B]">{bookingCode}</span> • {therapistName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle instructions */}
        <p className="text-xs text-[#CCCCCC] leading-relaxed">
          {type === 'urgent'
            ? 'Puedes escribir cualquier petición urgente o requisito especial que tu terapeuta deba considerar de inmediato antes o durante la sesión.'
            : 'Escribe cualquier indicación personalizada de acceso, interfón o timbre que quieras indicar a tu terapeuta para activar la alerta.'}
        </p>

        {/* Preset suggestions */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">
            Sugerencias rápidas (Haz clic para agregar):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCustomText(preset)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1A1A1A] hover:bg-[#282828] border border-[#333333] hover:border-[#C9A55B]/50 text-[#DDDDDD] transition-all text-left cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Textarea */}
        <form onSubmit={handleSend} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#C9A55B] block">
              {type === 'urgent' ? 'Detalle de tu Petición Urgente:' : 'Instrucciones Personalizadas de Acceso / Interfón:'}
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={
                type === 'urgent'
                  ? 'Escribe aquí cualquier indicación urgente para tu terapeuta...'
                  : 'Escribe lo que quieras decir (ej: Tocar timbre 3B o llamar al cel)...'
              }
              rows={3}
              maxLength={300}
              className="w-full bg-[#1A1A1A] border border-[#333333] focus:border-[#C9A55B] rounded-xl p-3 text-xs text-white placeholder-[#666666] focus:outline-none transition-colors"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end space-x-3 pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#888888] hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!customText.trim() || sending}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-black flex items-center space-x-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                type === 'urgent'
                  ? 'bg-amber-400 hover:bg-amber-300'
                  : 'bg-[#C9A55B] hover:bg-[#E6CA65]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Enviando...' : type === 'urgent' ? 'Enviar Petición Urgente' : 'Activar Alerta / Interfón'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

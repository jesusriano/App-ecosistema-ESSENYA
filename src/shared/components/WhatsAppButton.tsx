import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phone?: string;
  phoneNumber?: string;
  recipientName?: string;
  messagePreset?: string;
  message?: string;
  variant?: 'primary' | 'outline' | 'compact';
  label?: string;
  buttonText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  phoneNumber,
  recipientName = 'Contacto',
  messagePreset,
  message,
  variant = 'primary',
  label,
  buttonText,
}) => {
  const targetPhone = phone || phoneNumber || '';
  const targetMsg = messagePreset || message || 'Hola, te contacto desde la aplicación ESSENYA Haute Massage para coordinar los detalles del servicio.';
  const displayLabel = label || buttonText || 'WhatsApp Directo';

  // Clean phone number safely (strip non-digits)
  const cleanPhone = targetPhone ? String(targetPhone).replace(/[^0-9]/g, '') : '525512345678';
  const encodedMsg = encodeURIComponent(targetMsg);
  const waUrl = `https://wa.me/${cleanPhone.startsWith('52') ? cleanPhone : '52' + cleanPhone}?text=${encodedMsg}`;

  if (variant === 'compact') {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Contactar a ${recipientName} por WhatsApp`}
        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-xl transition-all shadow-xs"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>WhatsApp</span>
      </a>
    );
  }

  if (variant === 'outline') {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-950/20 hover:bg-emerald-900/40 border border-emerald-500/50 text-emerald-600 dark:text-emerald-300 font-semibold text-xs rounded-xl transition-all shadow-xs"
      >
        <MessageCircle className="w-4 h-4 text-emerald-500" />
        <span>{displayLabel}</span>
      </a>
    );
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
    >
      <MessageCircle className="w-4 h-4" />
      <span>{displayLabel}</span>
    </a>
  );
};

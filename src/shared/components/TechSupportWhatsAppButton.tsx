import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, ShieldAlert, X, ExternalLink, Headphones, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEcosystem } from '../context/EcosystemContext';

interface TechSupportWhatsAppButtonProps {
  role?: 'cliente' | 'terapeuta' | 'general';
  variant?: 'floating' | 'button' | 'compact' | 'card';
  className?: string;
  label?: string;
}

export const TechSupportWhatsAppButton: React.FC<TechSupportWhatsAppButtonProps> = ({
  role = 'general',
  variant = 'floating',
  className = '',
  label = 'Soporte Técnico'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { firebaseUser, sessions } = useAuth();
  const { systemConfig } = useEcosystem();

  // Prevent background scrolling and enable Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Support phone number: prioritize systemConfig, fallback to official ESSENYA support line
  const configuredPhone = (systemConfig as any)?.whatsappSupport || (systemConfig as any)?.soporteTelefono || '525539469253';
  const cleanPhone = String(configuredPhone).replace(/[^0-9]/g, '') || '525539469253';
  const fullPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;

  // Identify user name
  const userProfile = role === 'cliente' 
    ? sessions.cliente 
    : role === 'terapeuta' 
      ? sessions.terapeuta 
      : (sessions.cliente || sessions.terapeuta || sessions.administrador);

  const userName = userProfile?.nombre 
    ? `${userProfile.nombre} ${userProfile.apellidos || ''}`.trim() 
    : firebaseUser?.displayName || firebaseUser?.email || 'Usuario';

  // Role-specific technical support message
  const prefilledMessage = role === 'terapeuta'
    ? `Hola equipo de Soporte Técnico ESSENYA. Soy el terapeuta ${userName} (UID: ${firebaseUser?.uid || 'N/A'}). Solicito asistencia técnica con la aplicación de terapeutas sobre el siguiente inconveniente: `
    : role === 'cliente'
      ? `Hola equipo de Soporte Técnico ESSENYA. Soy el cliente ${userName} (UID: ${firebaseUser?.uid || 'N/A'}). Solicito asistencia técnica con la aplicación móvil/web sobre el siguiente inconveniente: `
      : `Hola equipo de Soporte Técnico ESSENYA. Solicito asistencia técnica con la aplicación (UID: ${firebaseUser?.uid || 'N/A'}). Detalle del problema técnico: `;

  const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  const handleOpenWhatsApp = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Card embedded view (e.g. for settings or profile sections)
  if (variant === 'card') {
    return (
      <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/30 bg-emerald-950/10 dark:bg-emerald-950/20 text-left space-y-3 ${className}`}>
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">Soporte Técnico de la Aplicación</h4>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] line-clamp-1">Canal exclusivo para incidencias técnicas del sistema</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-2 text-[11px] text-amber-700 dark:text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Aviso:</strong> Canal exclusivo para <strong>soporte técnico de la plataforma</strong>.
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full min-h-[44px] py-2.5 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-900/20 cursor-pointer touch-manipulation"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">Contactar Soporte Técnico vía WhatsApp</span>
        </button>

        {isOpen && renderModal()}
      </div>
    );
  }

  // Button standard view
  if (variant === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium text-xs shadow-sm transition-all cursor-pointer touch-manipulation ${className}`}
          title="Soporte Técnico exclusivo vía WhatsApp"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
        {isOpen && renderModal()}
      </>
    );
  }

  // Compact badge view (ideal for navigation bars and headers on mobile/desktop)
  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 min-h-[30px] rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 active:bg-emerald-600/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${className}`}
          title="Soporte Técnico exclusivo vía WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <span className="inline sm:hidden">Soporte</span>
            <span className="hidden sm:inline">{label}</span>
          </span>
        </button>
        {isOpen && renderModal()}
      </>
    );
  }

  // Floating button by default: fully responsive layout for mobile and desktop
  const positionClasses = className.trim() || 'bottom-16 right-2.5 sm:bottom-6 sm:right-6';

  return (
    <>
      <div className={`fixed z-[9999] flex flex-col items-end pointer-events-none max-w-[calc(100vw-1rem)] ${positionClasses}`}>
        <button
          id="btn-tech-support-whatsapp"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Soporte Técnico WhatsApp"
          className="pointer-events-auto group flex items-center space-x-1.5 sm:space-x-2 pl-2 pr-2.5 py-1.5 sm:pl-3.5 sm:pr-4 sm:py-2.5 min-h-[40px] sm:min-h-[44px] rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xl shadow-emerald-950/30 border border-emerald-400/40 transition-all duration-300 hover:scale-105 cursor-pointer touch-manipulation max-w-full truncate"
        >
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-100"></span>
          </span>
          <MessageCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white shrink-0" />
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[7.5px] sm:text-[9px] uppercase tracking-wider text-emerald-100 font-bold leading-none truncate">
              WhatsApp
            </span>
            <span className="text-[10px] sm:text-xs font-bold leading-tight truncate">
              <span className="inline sm:hidden">Soporte</span>
              <span className="hidden sm:inline">Soporte Técnico</span>
            </span>
          </div>
        </button>
      </div>

      {isOpen && renderModal()}
    </>
  );

  function renderModal() {
    return createPortal(
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="tech-support-title"
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
      >
        <div 
          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4 shadow-2xl relative text-[var(--text-primary)] my-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button with large mobile touch target */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar modal de soporte"
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-full hover:bg-[var(--bg-subcard)] active:bg-[var(--bg-subcard)] transition-colors cursor-pointer touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center space-x-3 pr-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 block truncate">
                ESSENYA Concierge Tech
              </span>
              <h3 id="tech-support-title" className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-tight">
                Soporte Técnico por WhatsApp
              </h3>
            </div>
          </div>

          {/* MANDATORY EMPHASIS: Exclusively for Technical Support */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-1.5 sm:space-y-2">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="font-bold text-xs uppercase tracking-wider">
                Aviso Importante de Servicio
              </p>
            </div>
            <p className="text-[11px] sm:text-xs leading-relaxed">
              Este canal de WhatsApp es <strong>única y exclusivamente para soporte técnico</strong> de la aplicación o eventualidades operativas de la plataforma.
            </p>
            <ul className="text-[10px] sm:text-[11px] list-disc list-inside opacity-90 space-y-0.5 pt-0.5 text-amber-700 dark:text-amber-300">
              <li>No se gestionan reservas directas ni agendamiento.</li>
              <li>No se procesan cobros ni transferencias directas.</li>
              <li>Para detalles de tu cita en curso, usa el chat de la reserva.</li>
            </ul>
          </div>

          {/* User details summary */}
          <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl p-2.5 sm:p-3 text-xs space-y-1 sm:space-y-1.5">
            <div className="flex justify-between items-center text-[11px] sm:text-xs">
              <span className="text-[var(--text-muted)]">Perfil detectado:</span>
              <span className="font-semibold capitalize text-[var(--text-primary)]">
                {role === 'terapeuta' ? 'Terapeuta Acreditado' : role === 'cliente' ? 'Cliente VIP' : 'Usuario'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] sm:text-xs">
              <span className="text-[var(--text-muted)]">Usuario:</span>
              <span className="font-semibold text-[var(--text-primary)] truncate max-w-[170px] sm:max-w-[200px] text-right">{userName}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] sm:text-xs">
              <span className="text-[var(--text-muted)]">Canal oficial:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+52 (55) 1234-5678</span>
            </div>
          </div>

          {/* CTA Actions */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full min-h-[44px] py-2.5 sm:py-3 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/30 cursor-pointer touch-manipulation"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">Abrir WhatsApp de Soporte Técnico</span>
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 opacity-80 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full min-h-[38px] py-2 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] active:text-[var(--text-primary)] rounded-xl transition-colors cursor-pointer touch-manipulation"
            >
              Volver a la aplicación
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }
};


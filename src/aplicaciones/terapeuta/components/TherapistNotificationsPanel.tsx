/**
 * TherapistNotificationsPanel
 * Modal/Dropdown panel for therapist notification history ensuring zero missed alerts.
 */

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, X, Shield, Clock, AlertCircle, MessageSquare, Calendar, Mic } from 'lucide-react';
import { NotificationHistoryService, TherapistNotification } from '../../../shared/services/NotificationHistoryService';

interface TherapistNotificationsPanelProps {
  therapistId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TherapistNotificationsPanel: React.FC<TherapistNotificationsPanelProps> = ({
  therapistId,
  isOpen,
  onClose
}) => {
  const [notifications, setNotifications] = useState<TherapistNotification[]>([]);

  const loadNotifications = () => {
    const list = NotificationHistoryService.getNotifications(therapistId);
    setNotifications(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
    const handleNewNotif = () => {
      loadNotifications();
    };
    window.addEventListener('essenya_new_notification', handleNewNotif as EventListener);
    return () => {
      window.removeEventListener('essenya_new_notification', handleNewNotif as EventListener);
    };
  }, [isOpen, therapistId]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    NotificationHistoryService.markAllAsRead(therapistId);
    loadNotifications();
  };

  const handleClearAll = () => {
    if (confirm('¿Eliminar todo el histórico de notificaciones?')) {
      NotificationHistoryService.clearAll(therapistId);
      loadNotifications();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'service_request':
        return <Calendar className="w-4 h-4 text-[#C9A55B]" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'voice':
        return <Mic className="w-4 h-4 text-emerald-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#C9A55B]/40 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-[#262626] flex items-center justify-between bg-[#1A1A1A]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#C9A55B]/15 text-[#C9A55B] border border-[#C9A55B]/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                <span>Historial de Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white font-extrabold px-2 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#888888]">
                Registro de notificaciones push, avisos y alertas no visualizadas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#888888] hover:text-white rounded-xl hover:bg-[#262626] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-3 bg-[#1A1A1A]/50 border-b border-[#262626] flex justify-between items-center text-xs">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="text-[#C9A55B] hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Marcar todas como leídas</span>
          </button>

          <button
            onClick={handleClearAll}
            className="text-red-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar Histórico</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-[#262626]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-[#888888] space-y-2">
              <Bell className="w-10 h-10 mx-auto text-[#444444]" />
              <p className="text-sm font-semibold">No hay notificaciones en el histórico</p>
              <p className="text-xs">Las alertas push recibidas aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            notifications.map((notif, idx) => (
              <div
                key={notif.id}
                className={`pt-3 first:pt-0 flex items-start space-x-3 transition-all ${
                  !notif.read ? 'bg-[#C9A55B]/5 -mx-3 p-3 rounded-2xl border border-[#C9A55B]/20' : ''
                }`}
              >
                <div className="p-2.5 rounded-xl bg-[#1E1E1E] border border-[#333333] shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-serif font-bold text-xs text-white truncate">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-[#888888] font-mono shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notif.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-[#CCCCCC] leading-relaxed">
                    {notif.message}
                  </p>

                  {!notif.read && (
                    <span className="inline-block text-[9px] bg-[#C9A55B]/20 text-[#C9A55B] font-bold px-2 py-0.5 rounded mt-1">
                      No leída
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#1A1A1A] border-t border-[#262626] text-center text-[11px] text-[#888888]">
          🛡️ Sincronización activa con el sistema de alertas push de ESSENYA Cloud.
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { usePush } from '../context/PushContext';
import { Bell, Check, CheckCheck, Trash2, X, Calendar, MessageSquare, Shield, Clock } from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const { inAppNotifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = usePush();
  const [activeTab, setActiveTab] = useState<'todas' | 'no_leidas' | 'reservas' | 'mensajes' | 'sistema'>('todas');

  if (!isOpen) return null;

  const filteredNotifications = inAppNotifications.filter(item => {
    if (activeTab === 'no_leidas') return !item.read;
    if (activeTab === 'reservas') return item.category === 'reservas';
    if (activeTab === 'mensajes') return item.category === 'mensajes';
    if (activeTab === 'sistema') return item.category === 'sistema';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1C1917] border border-[#C9A55B]/30 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="p-6 border-b border-[#C9A55B]/20 flex items-center justify-between bg-gradient-to-r from-[#1C1917] to-[#292524]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/10 flex items-center justify-center text-[#C9A55B] border border-[#C9A55B]/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-white">Centro de Notificaciones</h2>
              <p className="text-xs text-[#A8A29E]">
                {unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Estás al día con tus notificaciones'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#C9A55B] border border-[#C9A55B]/30 flex items-center gap-1.5 transition-all"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Marcar leídas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A8A29E] hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10 bg-white/5 overflow-x-auto">
          {(['todas', 'no_leidas', 'reservas', 'mensajes', 'sistema'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-[#C9A55B] text-[#1C1917] shadow-lg'
                  : 'bg-white/5 text-[#A8A29E] hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'todas' && 'Todas'}
              {tab === 'no_leidas' && `No leídas (${unreadCount})`}
              {tab === 'reservas' && 'Reservas'}
              {tab === 'mensajes' && 'Mensajes'}
              {tab === 'sistema' && 'Sistema'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[#78716C]">
                <Bell className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-white">No hay notificaciones en esta categoría</p>
              <p className="text-xs text-[#A8A29E]">Las alertas de reservas y eventos aparecerán aquí instantáneamente.</p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  item.read
                    ? 'bg-white/5 border-white/5 opacity-75'
                    : 'bg-gradient-to-r from-[#C9A55B]/10 to-transparent border-[#C9A55B]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.category === 'reservas' ? 'bg-amber-500/20 text-amber-400' :
                    item.category === 'mensajes' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.category === 'reservas' && <Calendar className="w-4 h-4" />}
                    {item.category === 'mensajes' && <MessageSquare className="w-4 h-4" />}
                    {item.category === 'sistema' && <Shield className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#C9A55B] animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-xs text-[#A8A29E] leading-relaxed">{item.description}</p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-[#78716C]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!item.read && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      className="p-2 rounded-xl hover:bg-white/10 text-[#C9A55B] transition-all"
                      title="Marcar como leída"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => clearNotification(item.id)}
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-[#78716C] hover:text-rose-400 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#1C1917] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#C9A55B] hover:bg-[#B89448] text-[#1C1917] text-xs font-bold transition-all shadow-lg"
          >
            Cerrar Centro
          </button>
        </div>

      </div>
    </div>
  );
};

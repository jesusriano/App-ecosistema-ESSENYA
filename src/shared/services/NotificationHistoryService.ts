/**
 * NotificationHistoryService
 * Manages persistent notification history for therapists so missed push notifications can always be reviewed.
 */

export interface TherapistNotification {
  id: string;
  therapistId: string;
  title: string;
  message: string;
  type: 'service_request' | 'chat' | 'system' | 'voice';
  timestamp: string;
  read: boolean;
  bookingId?: string;
}

export const NotificationHistoryService = {
  getNotifications(therapistId: string): TherapistNotification[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(`essenya_therapist_notifications_${therapistId}`);
      if (data) return JSON.parse(data);
    } catch {}
    
    // Default welcome notifications
    return [
      {
        id: 'notif-1',
        therapistId,
        title: 'Bienvenida al Portal de Terapeutas',
        message: 'Sistema de notificaciones push y alertas en tiempo real activado correctamente.',
        type: 'system',
        timestamp: 'Hace 10 min',
        read: false
      }
    ];
  },

  addNotification(therapistId: string, notif: Omit<TherapistNotification, 'id' | 'timestamp' | 'read'>): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getNotifications(therapistId);
      const newNotif: TherapistNotification = {
        ...notif,
        id: `notif-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      const updated = [newNotif, ...current].slice(0, 50);
      localStorage.setItem(`essenya_therapist_notifications_${therapistId}`, JSON.stringify(updated));
      
      // Dispatch custom event for instant UI update
      window.dispatchEvent(new CustomEvent('essenya_new_notification', { detail: newNotif }));
    } catch {}
  },

  markAllAsRead(therapistId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getNotifications(therapistId);
      const updated = current.map(n => ({ ...n, read: true }));
      localStorage.setItem(`essenya_therapist_notifications_${therapistId}`, JSON.stringify(updated));
    } catch {}
  },

  clearAll(therapistId: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`essenya_therapist_notifications_${therapistId}`);
    } catch {}
  }
};

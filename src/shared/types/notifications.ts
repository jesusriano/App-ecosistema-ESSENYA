export type NotificationEventType =
  | 'reservation.created'
  | 'reservation.accepted'
  | 'reservation.rejected'
  | 'reservation.cancelled'
  | 'therapist.travel_started'
  | 'therapist.arrived'
  | 'service.started'
  | 'service.completed'
  | 'reservation.reminder'
  | 'new.message';

export type SoundPreset = 'classic' | 'bell' | 'alert' | 'soft' | 'urgent';

export interface NotificationEventPayload {
  eventId: string;
  eventType: NotificationEventType;
  recipientId: string; // userId or therapistId or clientId
  recipientRole: 'client' | 'therapist' | 'admin';
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  soundPreset?: SoundPreset;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  data?: Record<string, any>;
}

export interface UserNotificationPreferences {
  userId: string;
  role: 'client' | 'therapist' | 'admin';
  soundEnabled: boolean;
  soundPreset: SoundPreset;
  volume: number; // 0 to 1
  events: {
    reservationCreated: boolean;
    reservationAccepted: boolean;
    reservationRejected: boolean;
    reservationCancelled: boolean;
    therapistTravelStarted: boolean;
    therapistArrived: boolean;
    serviceStarted: boolean;
    serviceCompleted: boolean;
    reminder: boolean;
    newMessage: boolean;
  };
  updatedAt: string;
}

export interface InAppNotificationItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  eventType: NotificationEventType;
  category: 'reservas' | 'mensajes' | 'sistema';
  read: boolean;
  timestamp: string;
  url?: string;
  data?: Record<string, any>;
}

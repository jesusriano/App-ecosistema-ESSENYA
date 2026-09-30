import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
  playNotificationSound,
  registerServiceWorker,
  SoundPreset
} from '../services/pushService';
import { InAppNotificationItem, NotificationEventType } from '../types/notifications';
import { getFirebaseRegistrationToken } from '../utils/getFirebaseRegistrationToken';
import { getMessagingService } from '../../lib/firebase';
import { onMessage } from 'firebase/messaging';

interface PushContextType {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  fcmToken: string | null;
  getRegistrationToken: (uid?: string) => Promise<string | undefined>;
  soundEnabled: boolean;
  soundPreset: SoundPreset;
  volume: number;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundPreset: (preset: SoundPreset) => void;
  setVolume: (vol: number) => void;
  enablePush: (userId?: string) => Promise<{ success: boolean; error?: string }>;
  disablePush: () => Promise<{ success: boolean; error?: string }>;
  testPush: (userId?: string, title?: string, body?: string, preset?: SoundPreset) => Promise<{ success: boolean; error?: string; sentCount?: number }>;
  previewSound: (preset?: SoundPreset) => void;
  inAppNotifications: InAppNotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  addInAppNotification: (item: Omit<InAppNotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  handleIncomingPush: (data: any) => void;
}

const PushContext = createContext<PushContextType | undefined>(undefined);

export const PushProvider: React.FC<{ children: React.ReactNode; userId?: string }> = ({ children, userId }) => {
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('essenya_push_sound') !== 'false';
  });
  const [soundPreset, setSoundPresetState] = useState<SoundPreset>(() => {
    return (localStorage.getItem('essenya_sound_preset') as SoundPreset) || 'classic';
  });
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('essenya_sound_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });

  // Storage key isolated per authenticated UID to prevent data leakage across users
  const getStorageKey = useCallback((uid?: string) => {
    return uid ? `essenya_in_app_notifications_${uid}` : 'essenya_in_app_notifications_guest';
  }, []);

  const [inAppNotifications, setInAppNotifications] = useState<InAppNotificationItem[]>([]);

  // Load notifications for the active user on mount or when user changes
  useEffect(() => {
    try {
      const key = getStorageKey(userId);
      const saved = localStorage.getItem(key);
      setInAppNotifications(saved ? JSON.parse(saved) : []);
    } catch {
      setInAppNotifications([]);
    }
  }, [userId, getStorageKey]);

  useEffect(() => {
    localStorage.setItem('essenya_push_sound', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('essenya_sound_preset', soundPreset);
  }, [soundPreset]);

  useEffect(() => {
    localStorage.setItem('essenya_sound_volume', String(volume));
  }, [volume]);

  // Persist notifications specifically under the active user's key
  useEffect(() => {
    try {
      const key = getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(inAppNotifications));
    } catch {}
  }, [inAppNotifications, userId, getStorageKey]);

  useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (isSupp) {
      setPermission(getNotificationPermission());
      registerServiceWorker().then(async (reg) => {
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        }
      });

      // Listen for push messages broadcasted by service worker (Background WebPush fallback)
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
          const { payload, sound } = event.data;
          if (soundEnabled) {
            playNotificationSound(sound || soundPreset, volume);
          }
          if (payload && payload.title) {
            addInAppNotification({
              userId: userId || 'anonymous',
              title: payload.title,
              description: payload.body,
              eventType: payload.data?.type || 'general',
              category: 'reservas',
              url: payload.url || '/'
            });
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);

      // Listen for Firebase Cloud Messaging Foreground Messages
      let unsubscribeFcm: (() => void) | null = null;
      getMessagingService().then((messaging) => {
        if (messaging) {
          unsubscribeFcm = onMessage(messaging, (payload) => {
            console.log('[FCM-Foreground] Mensaje recibido en primer plano:', payload);
            const title = payload.notification?.title || payload.data?.title || '🔔 Masaje solicitado';
            const body = payload.notification?.body || payload.data?.body || 'Tienes una nueva solicitud de masaje.';
            const eventType = (payload.data?.type as any) || 'NEW_BOOKING';

            // Reproducir sonido de alerta si está habilitado
            if (soundEnabled) {
              playNotificationSound('bell', volume);
            }

            // Registrar en el centro de notificaciones in-app
            addInAppNotification({
              userId: userId || 'therapist',
              title,
              description: body,
              eventType,
              category: 'reservas',
              url: payload.data?.bookingId ? '/terapeuta/servicios' : '/terapeuta'
            });

            // Disparar evento para actualizar inmediatamente la interfaz sin recargar
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('fcm-new-booking', { detail: payload.data }));
            }
          });
        }
      }).catch(err => console.warn('[FCM-Foreground] Listener init error:', err));

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        if (unsubscribeFcm) {
          unsubscribeFcm();
        }
      };
    }
  }, [soundEnabled, soundPreset, volume, userId]);

  const setSoundPreset = useCallback((preset: SoundPreset) => {
    setSoundPresetState(preset);
    if (soundEnabled) {
      playNotificationSound(preset, volume);
    }
  }, [soundEnabled, volume]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
  }, []);

  const previewSound = useCallback((preset?: SoundPreset) => {
    playNotificationSound(preset || soundPreset, volume);
  }, [soundPreset, volume]);

  const getRegistrationToken = useCallback(async (targetUserId?: string): Promise<string | undefined> => {
    try {
      const res = await getFirebaseRegistrationToken(targetUserId || userId);
      if (res.token) {
        setFcmToken(res.token);
        return res.token;
      }
    } catch (err) {
      console.warn('[PushContext] Error al obtener token de registro:', err);
    }
    return undefined;
  }, [userId]);

  const enablePush = useCallback(async (targetUserId?: string) => {
    const activeUid = targetUserId || userId || 'anonymous';
    const { isNativePlatform, registerNativePushToken } = await import('../services/nativePushService');
    
    if (isNativePlatform() && activeUid && activeUid !== 'anonymous') {
      const nativeRes = await registerNativePushToken(activeUid);
      setSubscribed(nativeRes.success);
      if (nativeRes.success) {
        setPermission('granted');
        if (soundEnabled) playNotificationSound(soundPreset, volume);
      }
      return nativeRes;
    }

    const res = await subscribeToPushNotifications(activeUid);
    setPermission(getNotificationPermission());
    if (res.success) {
      setSubscribed(true);
      if (soundEnabled) playNotificationSound(soundPreset, volume);
      getRegistrationToken(activeUid).catch(() => {});
    }
    return res;
  }, [userId, soundEnabled, soundPreset, volume, getRegistrationToken]);

  const disablePush = useCallback(async () => {
    const res = await unsubscribeFromPushNotifications();
    if (res.success) {
      setSubscribed(false);
      setPermission(getNotificationPermission());
    }
    return res;
  }, []);

  const testPush = useCallback(async (targetUserId?: string, title?: string, body?: string, preset?: SoundPreset) => {
    const presetToUse = preset || soundPreset;
    if (soundEnabled) playNotificationSound(presetToUse, volume);
    
    // Also add to in-app notification center for complete sync test
    addInAppNotification({
      userId: targetUserId || userId || 'anonymous',
      title: title || 'Prueba de Notificación ESSENYA',
      description: body || 'Notificación push nativa con sonido operativo en tiempo real.',
      eventType: 'reservation.created',
      category: 'reservas',
      url: '/'
    });

    return await sendTestPushNotification(targetUserId || userId, title, body, presetToUse);
  }, [userId, soundEnabled, soundPreset, volume]);

  const addInAppNotification = useCallback((item: Omit<InAppNotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newItem: InAppNotificationItem = {
      ...item,
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };
    setInAppNotifications(prev => [newItem, ...prev].slice(0, 100)); // keep last 100
  }, []);

  const markAsRead = useCallback((id: string) => {
    setInAppNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setInAppNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setInAppNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleIncomingPush = useCallback((payload: any) => {
    console.log('[PushContext] Handling incoming unified payload:', payload);
    
    // Extract data regardless of source (FCM, WebPush, Capacitor)
    const title = payload.title || payload.notification?.title || payload.data?.title || '🔔 Notificación ESSENYA';
    const body = payload.body || payload.notification?.body || payload.data?.body || 'Tienes una nueva actualización.';
    const eventType = payload.data?.type || payload.type || 'general';
    const sound = payload.sound || payload.data?.sound || soundPreset;
    const url = payload.url || payload.data?.url || '/';

    if (soundEnabled) {
      playNotificationSound(sound, volume);
    }

    addInAppNotification({
      userId: userId || 'anonymous',
      title,
      description: body,
      eventType,
      category: 'reservas',
      url
    });

    // Special event for live updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('essenya-push-received', { detail: payload }));
      if (eventType === 'NEW_BOOKING' || eventType === 'reservation.created') {
        window.dispatchEvent(new CustomEvent('fcm-new-booking', { detail: payload.data || payload }));
      }
    }
  }, [userId, soundEnabled, soundPreset, volume, addInAppNotification]);

  const unreadCount = inAppNotifications.filter(n => !n.read).length;

  return (
    <PushContext.Provider
      value={{
        supported,
        permission,
        subscribed,
        fcmToken,
        getRegistrationToken,
        soundEnabled,
        soundPreset,
        volume,
        setSoundEnabled,
        setSoundPreset,
        setVolume,
        enablePush,
        disablePush,
        testPush,
        previewSound,
        inAppNotifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
        addInAppNotification,
        handleIncomingPush
      }}
    >
      {children}
    </PushContext.Provider>
  );
};

export const usePush = () => {
  const context = useContext(PushContext);
  if (!context) {
    throw new Error('usePush must be used within a PushProvider');
  }
  return context;
};

/**
 * VoiceRecorderService
 * Handles microphone permissions, MediaRecorder lifecycle, MIME type detection,
 * multi-recording storage, offline queue, Firestore synchronization and Admin real-time streaming.
 */

import { db, auth } from '../../lib/firebase';
import { doc, setDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

export interface ServiceRecording {
  id: string;
  serviceId: string;
  therapistId: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  durationFormatted: string;
  mimeType: string;
  audioDataUrl?: string;
  syncStatus: 'pendiente_sincronizacion' | 'sincronizada';
  createdAt: string;
}

export const VoiceRecorderService = {
  getBestMimeType(): string {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      return 'audio/webm';
    }
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  },

  formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  },

  async saveRecordingLocal(recording: ServiceRecording): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getLocalRecordings(recording.serviceId);
      const updated = [recording, ...existing.filter(r => r.id !== recording.id)];
      localStorage.setItem(`essenya_recordings_${recording.serviceId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recording locally:', e);
    }
  },

  getLocalRecordings(serviceId: string): ServiceRecording[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`essenya_recordings_${serviceId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async syncRecordingToFirestore(recording: ServiceRecording): Promise<boolean> {
    let synced = false;

    // 1. Try server-side secure upload route (Admin SDK, bypassing client rules & size quirks)
    try {
      if (navigator.onLine) {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/recordings/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(recording)
        });

        if (res.ok) {
          synced = true;
        }
      }
    } catch (apiErr) {
      console.warn('[VoiceRecorderService] API upload error, falling back to direct Firestore:', apiErr);
    }

    // 2. Direct Firestore fallback (using updated firestore.rules)
    try {
      if (navigator.onLine) {
        const docRef = doc(db, 'grabaciones_servicio', recording.id);
        await setDoc(docRef, {
          ...recording,
          syncStatus: 'sincronizada',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        synced = true;
      }
    } catch (fsErr) {
      console.warn('[VoiceRecorderService] Direct Firestore sync warning:', fsErr);
    }

    if (synced) {
      recording.syncStatus = 'sincronizada';
      await this.saveRecordingLocal(recording);
      return true;
    }

    return false;
  },

  async fetchServiceRecordings(serviceId: string): Promise<ServiceRecording[]> {
    const local = this.getLocalRecordings(serviceId);
    let remote: ServiceRecording[] = [];

    // 1. Try server route
    try {
      if (navigator.onLine) {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/recordings/${encodeURIComponent(serviceId)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.recordings)) {
            remote = data.recordings;
          }
        }
      }
    } catch (e) {
      console.warn('[VoiceRecorderService] Error fetching from API, falling back to Firestore:', e);
    }

    // 2. Try direct Firestore
    if (remote.length === 0 && navigator.onLine) {
      try {
        const q = query(collection(db, 'grabaciones_servicio'), where('serviceId', '==', serviceId));
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
          remote.push(docSnap.data() as ServiceRecording);
        });
      } catch (fsErr) {
        console.warn('[VoiceRecorderService] Firestore fetch warning:', fsErr);
      }
    }

    // Merge remote and local (local has audioDataUrl if cached on same device)
    const map = new Map<string, ServiceRecording>();
    remote.forEach(r => map.set(r.id, r));
    local.forEach(l => {
      const existing = map.get(l.id);
      if (existing) {
        map.set(l.id, { ...existing, audioDataUrl: existing.audioDataUrl || l.audioDataUrl });
      } else {
        map.set(l.id, l);
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  },

  /**
   * Real-time subscription to service recordings for administration
   */
  subscribeToServiceRecordings(
    serviceId: string, 
    onUpdate: (recordings: ServiceRecording[]) => void
  ): () => void {
    if (!serviceId) return () => {};

    try {
      const q = query(collection(db, 'grabaciones_servicio'), where('serviceId', '==', serviceId));
      return onSnapshot(q, (snapshot) => {
        const remote: ServiceRecording[] = [];
        snapshot.forEach(docSnap => {
          remote.push(docSnap.data() as ServiceRecording);
        });

        const local = this.getLocalRecordings(serviceId);
        const map = new Map<string, ServiceRecording>();
        remote.forEach(r => map.set(r.id, r));
        local.forEach(l => {
          const existing = map.get(l.id);
          if (existing) {
            map.set(l.id, { ...existing, audioDataUrl: existing.audioDataUrl || l.audioDataUrl });
          } else {
            map.set(l.id, l);
          }
        });

        const list = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        onUpdate(list);
      }, (err) => {
        console.warn('[VoiceRecorderService] onSnapshot subscription error:', err);
        // Fallback to fetch
        this.fetchServiceRecordings(serviceId).then(onUpdate);
      });
    } catch {
      this.fetchServiceRecordings(serviceId).then(onUpdate);
      return () => {};
    }
  },

  async processPendingSyncQueue(): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('essenya_recordings_')) {
          const recs: ServiceRecording[] = JSON.parse(localStorage.getItem(key) || '[]');
          let changed = false;
          for (const rec of recs) {
            if (rec.syncStatus === 'pendiente_sincronizacion') {
              const success = await this.syncRecordingToFirestore(rec);
              if (success) {
                rec.syncStatus = 'sincronizada';
                changed = true;
              }
            }
          }
          if (changed) {
            localStorage.setItem(key, JSON.stringify(recs));
          }
        }
      }
    } catch (e) {
      console.warn('Error processing recording sync queue:', e);
    }
  }
};

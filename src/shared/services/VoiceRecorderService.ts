/**
 * VoiceRecorderService
 * Handles microphone permissions, MediaRecorder lifecycle, MIME type detection,
 * multi-recording storage, offline queue, and Firestore synchronization.
 */

import { db, auth } from '../../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

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
    try {
      if (!navigator.onLine) {
        return false;
      }
      const docRef = doc(db, 'grabaciones_servicio', recording.id);
      await setDoc(docRef, {
        ...recording,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update local status to sincronizada
      recording.syncStatus = 'sincronizada';
      await this.saveRecordingLocal(recording);
      return true;
    } catch (e) {
      console.warn('Error syncing recording to Firestore:', e);
      return false;
    }
  },

  async fetchServiceRecordings(serviceId: string): Promise<ServiceRecording[]> {
    const local = this.getLocalRecordings(serviceId);
    try {
      if (!navigator.onLine) return local;
      const q = query(collection(db, 'grabaciones_servicio'), where('serviceId', '==', serviceId));
      const snapshot = await getDocs(q);
      const remote: ServiceRecording[] = [];
      snapshot.forEach(docSnap => {
        remote.push(docSnap.data() as ServiceRecording);
      });

      // Merge remote and local
      const map = new Map<string, ServiceRecording>();
      local.forEach(r => map.set(r.id, r));
      remote.forEach(r => map.set(r.id, r));
      return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return local;
    }
  },

  async processPendingSyncQueue(): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      // Find all recording keys in localStorage
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

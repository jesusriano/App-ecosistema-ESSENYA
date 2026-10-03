import { useState, useEffect } from 'react';
import { Booking, Therapist } from '../types';
import { VoiceRecorderService, ServiceRecording } from '../shared/services/VoiceRecorderService';

interface UseTherapistVoiceRecorderOptions {
  currentBooking: Booking | null;
  activeTherapist: Therapist;
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info' | 'gold') => void;
}

export function useTherapistVoiceRecorder({
  currentBooking,
  activeTherapist,
  showToast
}: UseTherapistVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [activeMediaRecorder, setActiveMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startLiveRecording = async () => {
    if (!currentBooking) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = VoiceRecorderService.getBestMimeType() || 'audio/webm';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      const recId = `rec-${Date.now()}`;
      const now = new Date();
      const startTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const durationSecs = recordingSeconds;
          const newRec: ServiceRecording = {
            id: recId,
            serviceId: currentBooking.id,
            therapistId: activeTherapist.id,
            date: now.toLocaleDateString(),
            startTime: startTimeStr,
            endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            durationSeconds: durationSecs,
            durationFormatted: VoiceRecorderService.formatDuration(durationSecs),
            mimeType: mimeType,
            audioDataUrl: base64data,
            syncStatus: navigator.onLine ? 'sincronizada' : 'pendiente_sincronizacion',
            createdAt: now.toISOString()
          };

          await VoiceRecorderService.saveRecordingLocal(newRec);
          if (navigator.onLine) {
            await VoiceRecorderService.syncRecordingToFirestore(newRec);
            showToast('Grabación Guardada', 'Audio grabado y sincronizado correctamente.', 'success');
          } else {
            showToast('Sin Conexión', 'Grabación guardada localmente. Se sincronizará cuando vuelva la conexión.', 'info');
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000);
      setActiveMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);
      showToast('Grabación Iniciada', '🎙️ El micrófono se encuentra activo.', 'success');
    } catch (err: any) {
      showToast('Error de Micrófono', err?.message || 'No fue posible acceder al micrófono.', 'error');
    }
  };

  const stopLiveRecording = () => {
    if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
      activeMediaRecorder.stop();
    }
    setIsRecording(false);
    setActiveMediaRecorder(null);
  };

  return {
    isRecording,
    recordingSeconds,
    activeMediaRecorder,
    startLiveRecording,
    stopLiveRecording
  };
}

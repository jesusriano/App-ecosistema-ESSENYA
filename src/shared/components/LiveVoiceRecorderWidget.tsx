import React, { useState, useEffect } from 'react';
import { Mic, Square, AlertCircle, CheckCircle2, Shield, Radio } from 'lucide-react';
import { VoiceRecorderService, ServiceRecording } from '../services/VoiceRecorderService';
import { useToast } from '../context/ToastContext';

interface LiveVoiceRecorderWidgetProps {
  serviceId: string;
  therapistId: string;
  therapistName?: string;
  onRecordingComplete?: (recording: ServiceRecording) => void;
  className?: string;
}

export const LiveVoiceRecorderWidget: React.FC<LiveVoiceRecorderWidgetProps> = ({
  serviceId,
  therapistId,
  therapistName = 'Terapeuta ESSENYA',
  onRecordingComplete,
  className = ''
}) => {
  const { showToast } = useToast();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Timer while recording
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Micrófono no compatible', 'Tu navegador no permite captura de audio.', 'error');
        return;
      }

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
        setIsUploading(true);
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const durationSecs = recordingSeconds;
          const newRec: ServiceRecording = {
            id: recId,
            serviceId,
            therapistId,
            date: now.toLocaleDateString(),
            startTime: startTimeStr,
            endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            durationSeconds: durationSecs,
            durationFormatted: VoiceRecorderService.formatDuration(durationSecs),
            mimeType,
            audioDataUrl: base64data,
            syncStatus: navigator.onLine ? 'sincronizada' : 'pendiente_sincronizacion',
            createdAt: now.toISOString()
          };

          // 1. Save locally
          await VoiceRecorderService.saveRecordingLocal(newRec);

          // 2. Sync to backend & Firestore
          const synced = await VoiceRecorderService.syncRecordingToFirestore(newRec);
          setIsUploading(false);

          if (synced) {
            showToast('🎙️ Grabación Transmitida', 'El audio en vivo fue enviado a Dirección y Administración.', 'success');
          } else {
            showToast('Audio Guardado en Espera', 'Guardado localmente. Se transmitirá en cuanto se restablezca la red.', 'info');
          }

          if (onRecordingComplete) {
            onRecordingComplete(newRec);
          }
        };

        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      showToast('Grabación Iniciada', '🎙️ Grabando audio en vivo del servicio para supervisión.', 'success');
    } catch (err: any) {
      console.error('Error starting recording:', err);
      showToast('Permiso de Micrófono Requerido', err?.message || 'Habilita el micrófono para grabar audio en vivo.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setMediaRecorder(null);
  };

  return (
    <div className={`p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isRecording 
            ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/40' 
            : 'bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B]'
        }`}>
          {isRecording ? <Radio className="w-4 h-4 animate-ping" /> : <Mic className="w-4 h-4" />}
        </div>
        <div>
          <span className="font-bold text-xs text-[#1C1917] dark:text-white flex items-center gap-1.5">
            {isRecording ? (
              <span className="text-red-500 font-mono flex items-center gap-1">
                🔴 GRABANDO {VoiceRecorderService.formatDuration(recordingSeconds)}
              </span>
            ) : (
              <span>Grabación de Voz en Vivo (Supervisión)</span>
            )}
          </span>
          <p className="text-[10px] text-[#888888] mt-0.5">
            {isRecording 
              ? 'Micrófono activo transmitiendo audio a Administración' 
              : 'Registra incidencias o notas de voz durante el servicio'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Detener y Enviar</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={startRecording}
            className="px-3.5 py-1.5 rounded-xl bg-[#C9A55B] hover:bg-[#E6CA65] text-black font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Transmitiendo...' : 'Iniciar Grabación'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

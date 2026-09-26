/**
 * AdminRecordingsSection
 * Displays service voice recordings in the admin panel with real-time streaming,
 * metadata and working audio player.
 */

import React, { useState, useEffect } from 'react';
import { Mic, Play, Pause, Clock, CheckCircle2, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { VoiceRecorderService, ServiceRecording } from '../../../shared/services/VoiceRecorderService';

interface AdminRecordingsSectionProps {
  serviceId: string;
}

export const AdminRecordingsSection: React.FC<AdminRecordingsSectionProps> = ({ serviceId }) => {
  const [recordings, setRecordings] = useState<ServiceRecording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Initial fetch + real-time subscription
    const unsubscribe = VoiceRecorderService.subscribeToServiceRecordings(serviceId, (recs) => {
      if (isMounted) {
        setRecordings(recs);
        setLoading(false);
        setIsRefreshing(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [serviceId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const recs = await VoiceRecorderService.fetchServiceRecordings(serviceId);
    setRecordings(recs);
    setIsRefreshing(false);
  };

  const handlePlay = (rec: ServiceRecording) => {
    if (playingId === rec.id && audioElement) {
      audioElement.pause();
      setPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    if (!rec.audioDataUrl) {
      alert('El archivo de audio de esta grabación no se encuentra disponible.');
      return;
    }

    const audio = new Audio(rec.audioDataUrl);
    setAudioElement(audio);
    setPlayingId(rec.id);

    audio.play().catch(e => {
      console.warn('Playback error:', e);
      setPlayingId(null);
    });

    audio.onended = () => {
      setPlayingId(null);
    };
  };

  if (loading) {
    return (
      <div className="py-3 text-xs text-[var(--text-muted)] flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#C9A55B] border-t-transparent animate-spin" />
        <span>Cargando grabaciones de voz del servicio en tiempo real...</span>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="p-4 bg-[var(--bg-subcard)] rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <Mic className="w-4 h-4 text-[#C9A55B] opacity-60" />
          <span>No se registraron grabaciones de voz en vivo durante este servicio.</span>
        </div>
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg text-[#888888] hover:text-[#C9A55B] transition-colors cursor-pointer"
          title="Actualizar grabaciones"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-[#C9A55B]" />
          <span>🎙️ Grabaciones de Voz en Vivo ({recordings.length})</span>
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1 text-[10px] text-[#888888] hover:text-[#C9A55B] transition-colors flex items-center gap-1 cursor-pointer"
            title="Refrescar en tiempo real"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <Shield className="w-3 h-3" /> Acceso Protegido / Auditoría
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recordings.map((rec, index) => (
          <div
            key={rec.id}
            className="p-3.5 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl space-y-2.5 shadow-xs"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-serif font-bold text-xs text-[var(--text-primary)]">
                  Grabación {recordings.length - index}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                  {rec.date} — {rec.startTime}
                </span>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                rec.syncStatus === 'sincronizada' 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {rec.syncStatus === 'sincronizada' ? '✓ Transmitida' : 'Pendiente'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)] text-xs">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono text-[11px]">
                <Clock className="w-3 h-3 text-[#C9A55B]" />
                <span>{rec.durationFormatted}</span>
              </div>

              <button
                type="button"
                onClick={() => handlePlay(rec)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  playingId === rec.id
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-xs animate-pulse'
                    : 'bg-[#C9A55B] hover:bg-[#E6CA65] text-black shadow-xs'
                }`}
              >
                {playingId === rec.id ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Reproducir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRecordingsSection;

/**
 * VoiceNotificationService
 * Handles automated system voice announcements for service start and finish.
 * Guaranteed idempotent (plays strictly once per service event) with offline and speech synthesis fallbacks.
 */

export const VoiceNotificationService = {
  playServiceStarted(serviceId: string, clientName?: string): void {
    if (typeof window === 'undefined') return;
    const key = `essenya_voice_started_${serviceId}`;
    try {
      if (localStorage.getItem(key) === 'true') {
        return; // Already played for this service
      }
      localStorage.setItem(key, 'true');
    } catch {}

    const text = "Servicio iniciado correctamente. El tiempo de la sesión ha comenzado.";
    this.speak(text, '/audio/service-started.mp3');
  },

  playServiceFinished(serviceId: string): void {
    if (typeof window === 'undefined') return;
    const key = `essenya_voice_finished_${serviceId}`;
    try {
      if (localStorage.getItem(key) === 'true') {
        return; // Already played for this service
      }
      localStorage.setItem(key, 'true');
    } catch {}

    const text = "El servicio ha finalizado. Gracias por utilizar ESSENYA.";
    this.speak(text, '/audio/service-finished.mp3');
  },

  speak(text: string, audioUrl: string): void {
    try {
      // 1. Try playing audio file first
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      audio.play().catch(() => {
        // Fallback to Web Speech API if audio file fails or is missing
        this.fallbackSpeech(text);
      });
    } catch {
      this.fallbackSpeech(text);
    }
  },

  fallbackSpeech(text: string): void {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any pending speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-MX';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        
        // Try finding a Spanish voice
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.startsWith('es'));
        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('SpeechSynthesis failed:', e);
    }
  }
};

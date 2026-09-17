/**
 * Utility for subtle audio chimes and tactile vibration notifications
 * specifically crafted for therapist real-time chat interactions in ESSENYA.
 */

// Common keywords indicating priority or urgent customer requests
const URGENT_KEYWORDS = [
  'urgente', 'alergia', 'alérgico', 'dolor', 'molestia', 'presión', 
  'interfón', 'timbre', 'portón', 'puerta', 'código', 'esperando', 
  'toalla', 'aceite', 'temperatura', 'frio', 'frío', 'calor', 'cambio',
  'apúrate', 'favor de avisar', 'cuidado', 'sensibilidad', 'cancelar'
];

/**
 * Checks if a chat message contains urgent or time-sensitive client requests.
 */
export function isUrgentChatMessage(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some(keyword => lower.includes(keyword));
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch (e) {
    return null;
  }
}

/**
 * Plays a tranquil, spa-calibrated harmonic chime using the Web Audio API.
 * Uses pure sine oscillators with exponential fade-out for a non-startling, luxurious tone.
 */
export function playChatChime(isUrgent: boolean = false, volumeMultiplier: number = 1): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;

    const playHarmonic = (freq: number, offset: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + offset);

      // Smooth attack to avoid clicking, exponential decay for soft chime resonance
      const effectiveGain = Math.max(0.01, Math.min(peakGain * volumeMultiplier, 0.4));
      gain.gain.setValueAtTime(0.0001, startTime + offset);
      gain.gain.exponentialRampToValueAtTime(effectiveGain, startTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + offset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + offset);
      osc.stop(startTime + offset + duration + 0.05);
    };

    if (isUrgent) {
      // Distinctive, attentive 3-note ascending spa chime (E6 -> G6 -> C7)
      playHarmonic(1318.51, 0.00, 0.45, 0.14); // E6
      playHarmonic(1567.98, 0.10, 0.55, 0.14); // G6
      playHarmonic(2093.00, 0.22, 0.70, 0.16); // C7
    } else {
      // Gentle 2-note harmonic Tibetan chime (C6 -> E6)
      playHarmonic(1046.50, 0.00, 0.50, 0.10); // C6
      playHarmonic(1318.51, 0.08, 0.60, 0.09); // E6
    }
  } catch (err) {
    console.debug('[AudioNotification] Could not play synthesized chime:', err);
  }
}

/**
 * Triggers subtle tactile vibration via the device's Vibration API when available.
 */
export function triggerChatVibration(isUrgent: boolean = false): boolean {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      if (isUrgent) {
        // Urgent pattern: triple pulse with clear cadence [vibrate, pause, vibrate, pause, vibrate]
        return navigator.vibrate([100, 60, 120, 60, 180]);
      } else {
        // Subtle dual pulse for standard incoming messages
        return navigator.vibrate([60, 45, 75]);
      }
    }
  } catch (err) {
    console.debug('[VibrationNotification] Could not trigger tactile feedback:', err);
  }
  return false;
}

export interface ChatNotificationOptions {
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  isUrgent?: boolean;
  volumeMultiplier?: number;
}

/**
 * Combined handler to notify therapist of an incoming message from the client.
 */
export function notifyTherapistNewMessage(options: ChatNotificationOptions = {}): {
  playedSound: boolean;
  vibrated: boolean;
} {
  const {
    soundEnabled = true,
    vibrationEnabled = true,
    isUrgent = false,
    volumeMultiplier = 1
  } = options;

  let playedSound = false;
  let vibrated = false;

  if (soundEnabled) {
    playChatChime(isUrgent, volumeMultiplier);
    playedSound = true;
  }

  if (vibrationEnabled) {
    vibrated = triggerChatVibration(isUrgent);
  }

  return { playedSound, vibrated };
}

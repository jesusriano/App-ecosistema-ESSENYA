/**
 * Utility for subtle audio chimes and tactile vibration notifications
 * specifically crafted for real-time interactions in ESSENYA.
 */

export interface SoundOption {
  id: string;
  name: string;
  description: string;
}

export const NOTIFICATION_SOUND_OPTIONS: SoundOption[] = [
  { id: 'campanilla', name: 'Campanilla Spa', description: 'Campanilla sutil de relajación de dos tonos' },
  { id: 'arpa', name: 'Arpa Zen', description: 'Arpegio ascendente de tres tonos armoniosos' },
  { id: 'cristal', name: 'Cristal Tibetano', description: 'Pulso de cristal claro y penetrante' },
  { id: 'suave', name: 'Melodía Suave', description: 'Acorde ambiental cálido y delicado' },
  { id: 'ejecutiva', name: 'Alerta Ejecutiva', description: 'Señal corporativa de dos tonos claros' },
];

export function getStoredSoundPreference(role: string): string {
  if (typeof window === 'undefined') return 'campanilla';
  try {
    return localStorage.getItem(`essenya_sound_${role}`) || 'campanilla';
  } catch {
    return 'campanilla';
  }
}

export function setStoredSoundPreference(role: string, soundId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`essenya_sound_${role}`, soundId);
  } catch {}
}

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
 * Plays a tranquil, spa-calibrated harmonic chime using the Web Audio API based on selected sound ID.
 */
export function playNotificationSoundById(soundId: string = 'campanilla', isUrgent: boolean = false, volumeMultiplier: number = 1): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;

    const playTone = (freq: number, offset: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + offset);

      const effectiveGain = Math.max(0.01, Math.min(peakGain * volumeMultiplier, 0.4));
      gain.gain.setValueAtTime(0.0001, startTime + offset);
      gain.gain.exponentialRampToValueAtTime(effectiveGain, startTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + offset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + offset);
      osc.stop(startTime + offset + duration + 0.05);
    };

    if (soundId === 'arpa') {
      playTone(523.25, 0.0, 0.4, 0.12); // C5
      playTone(659.25, 0.1, 0.4, 0.12); // E5
      playTone(783.99, 0.2, 0.5, 0.14); // G5
    } else if (soundId === 'cristal') {
      playTone(1318.51, 0.0, 0.35, 0.12); // E6
      playTone(1567.98, 0.12, 0.4, 0.13); // G6
      playTone(2093.00, 0.24, 0.5, 0.14); // C7
    } else if (soundId === 'suave') {
      playTone(349.23, 0.0, 0.6, 0.10); // F4
      playTone(440.00, 0.05, 0.6, 0.10); // A4
      playTone(523.25, 0.1, 0.7, 0.12); // C5
    } else if (soundId === 'ejecutiva') {
      playTone(880.00, 0.0, 0.3, 0.15);  // A5
      playTone(1760.00, 0.15, 0.4, 0.15); // A6
    } else {
      // Campanilla default
      if (isUrgent) {
        playTone(1318.51, 0.00, 0.45, 0.14);
        playTone(1567.98, 0.10, 0.55, 0.14);
        playTone(2093.00, 0.22, 0.70, 0.16);
      } else {
        playTone(1046.50, 0.00, 0.50, 0.10);
        playTone(1318.51, 0.08, 0.60, 0.09);
      }
    }
  } catch (err) {
    console.debug('[AudioNotification] Could not play synthesized sound:', err);
  }
}

export function playChatChime(isUrgent: boolean = false, volumeMultiplier: number = 1): void {
  playNotificationSoundById('campanilla', isUrgent, volumeMultiplier);
}

/**
 * Triggers subtle tactile vibration via the device's Vibration API when available.
 */
export function triggerChatVibration(isUrgent: boolean = false): boolean {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      if (isUrgent) {
        return navigator.vibrate([100, 60, 120, 60, 180]);
      } else {
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
  role?: string;
  soundId?: string;
}

export function notifyRoleNewEvent(options: ChatNotificationOptions = {}): {
  playedSound: boolean;
  vibrated: boolean;
} {
  const {
    soundEnabled = true,
    vibrationEnabled = true,
    isUrgent = false,
    volumeMultiplier = 1,
    role = 'client',
    soundId
  } = options;

  let playedSound = false;
  let vibrated = false;

  const effectiveSoundId = soundId || getStoredSoundPreference(role);

  if (soundEnabled) {
    playNotificationSoundById(effectiveSoundId, isUrgent, volumeMultiplier);
    playedSound = true;
  }

  if (vibrationEnabled) {
    vibrated = triggerChatVibration(isUrgent);
  }

  return { playedSound, vibrated };
}

export function notifyTherapistNewMessage(options: ChatNotificationOptions = {}): {
  playedSound: boolean;
  vibrated: boolean;
} {
  return notifyRoleNewEvent({ role: 'therapist', ...options });
}

// Auto-unlock Web Audio API on first user interaction to bypass browser autoplay restrictions
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}



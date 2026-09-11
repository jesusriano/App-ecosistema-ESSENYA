/**
 * ESSENYA Scheduling and Reservation Window Rules:
 * - Solicitudes: Los clientes pueden solicitar citas a cualquier hora del día (24/7).
 * - Horario de atención para masajes: Exclusivamente entre 09:00 y 20:00 hrs (9 AM a 8 PM).
 * - Anticipación mínima:
 *   - Socios Platino (nivel base): Mínimo 5 horas de anticipación requeridas.
 *   - Socios de mayor nivel (Gold y Diamond): Acceso a reserva prioritaria express con menos de 5 horas de anticipación (mínimo 2 horas).
 */

export const SERVICE_START_HOUR = 9; // 09:00
export const SERVICE_END_HOUR = 20; // 20:00

export const OFFICIAL_BOOKING_HOURS: string[] = [
  '09:00', '09:30',
  '10:00', '10:30',
  '11:00', '11:30',
  '12:00', '12:30',
  '13:00', '13:30',
  '14:00', '14:30',
  '15:00', '15:30',
  '16:00', '16:30',
  '17:00', '17:30',
  '18:00', '18:30',
  '19:00', '19:30',
  '20:00'
];

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface SlotAvailability {
  time: string;
  available: boolean;
  reason?: string;
  isPast?: boolean;
  needsHigherTier?: boolean;
}

/**
 * Evaluates whether a specific time slot on a given date can be booked according to
 * the 09:00-20:00 window and the 5-hour notice rule (or 2-hour for Gold/Diamond).
 */
export function evaluateTimeSlot(
  dateStr: string,
  timeStr: string,
  isHighTier: boolean,
  now: Date = new Date()
): SlotAvailability {
  const parts = timeStr.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);

  // 1. Strict Window Validation: Between 09:00 and 20:00
  const minutesFromMidnight = h * 60 + m;
  const startWindowMin = SERVICE_START_HOUR * 60; // 540 (09:00)
  const endWindowMin = SERVICE_END_HOUR * 60; // 1200 (20:00)

  if (minutesFromMidnight < startWindowMin || minutesFromMidnight > endWindowMin) {
    return {
      time: timeStr,
      available: false,
      reason: 'El horario de atención para masajes es exclusivamente entre 9:00 AM y 8:00 PM (09:00 a 20:00 hrs).'
    };
  }

  // 2. Parse service date and time
  const [year, month, day] = dateStr.split('-').map(Number);
  const slotDate = new Date(year, month - 1, day, h, m, 0, 0);
  const diffMs = slotDate.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  // Past time check
  if (diffMinutes <= 0) {
    return {
      time: timeStr,
      available: false,
      isPast: true,
      reason: 'Este horario ya ha transcurrido.'
    };
  }

  // 3. Notice Check: 5 hours (300 min) for Platino, 2 hours (120 min) for Gold/Diamond
  const requiredNoticeMinutes = isHighTier ? 120 : 300;

  if (diffMinutes < requiredNoticeMinutes) {
    if (!isHighTier) {
      return {
        time: timeStr,
        available: false,
        needsHigherTier: true,
        reason: 'Los socios Platino requieren reservar con un mínimo de 5 horas de anticipación. Disponible con membresía Gold o Diamond.'
      };
    } else {
      return {
        time: timeStr,
        available: false,
        reason: 'Se requiere un mínimo de 2 horas de anticipación para la preparación del terapeuta.'
      };
    }
  }

  return {
    time: timeStr,
    available: true
  };
}

/**
 * Returns all available official slots with their availability status for a given date.
 */
export function getScheduleSlotsForDate(
  dateStr: string,
  isHighTier: boolean,
  now: Date = new Date()
): SlotAvailability[] {
  return OFFICIAL_BOOKING_HOURS.map(t => evaluateTimeSlot(dateStr, t, isHighTier, now));
}

/**
 * Finds the first valid slot for the given date, or null if all are unavailable.
 */
export function getFirstAvailableSlot(
  dateStr: string,
  isHighTier: boolean,
  now: Date = new Date()
): string | null {
  const slots = getScheduleSlotsForDate(dateStr, isHighTier, now);
  const first = slots.find(s => s.available);
  return first ? first.time : null;
}

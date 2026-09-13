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

/**
 * Parse booking date (YYYY-MM-DD) and time (HH:mm) into a local Date object.
 */
export function getBookingScheduledDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const partsDate = dateStr.split('-').map(Number);
  const partsTime = timeStr.split(':').map(Number);
  if (partsDate.length < 3 || partsTime.length < 2) return null;
  const [year, month, day] = partsDate;
  const [hours, minutes] = partsTime;
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) return null;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export interface CancellationEligibility {
  canCancel: boolean;
  hoursRemaining: number;
  message: string;
  isPast?: boolean;
}

/**
 * Evaluates whether a client can cancel an appointment up to 4 hours before the session.
 * Rule: El cliente puede cancelar la cita hasta 4 horas antes.
 */
export function checkCancellationEligibility(
  dateStr?: string,
  timeStr?: string,
  bookingState?: string,
  now: Date = new Date()
): CancellationEligibility {
  if (bookingState === 'cancelado') {
    return { canCancel: false, hoursRemaining: 0, message: 'La cita ya se encuentra cancelada.' };
  }
  if (bookingState === 'servicio_finalizado') {
    return { canCancel: false, hoursRemaining: 0, message: 'El servicio ya fue completado.' };
  }
  if (bookingState === 'servicio_iniciado') {
    return { canCancel: false, hoursRemaining: 0, message: 'El servicio ya se encuentra en curso y no puede cancelarse desde la app.' };
  }

  const scheduled = getBookingScheduledDateTime(dateStr, timeStr);
  if (!scheduled) {
    return { canCancel: true, hoursRemaining: 99, message: 'Cancelación habilitada.' };
  }

  const diffMs = scheduled.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return {
      canCancel: false,
      hoursRemaining,
      isPast: true,
      message: 'El horario programado de la cita ya ha transcurrido.'
    };
  }

  if (hoursRemaining < 4) {
    const totalMinutes = Math.round(hoursRemaining * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeRemainingStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutos`;

    return {
      canCancel: false,
      hoursRemaining,
      message: `Solo se permite cancelar con un mínimo de 4 horas de anticipación. Faltan ${timeRemainingStr} para la cita.`
    };
  }

  return {
    canCancel: true,
    hoursRemaining,
    message: `Cancelación disponible (faltan ${Math.floor(hoursRemaining)} horas para tu cita).`
  };
}

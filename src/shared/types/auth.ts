export type UserRole = 'cliente' | 'terapeuta' | 'administrador';

export type DocumentStatus = 'pendiente' | 'aprobado' | 'rechazado';

export type AccountStatus = 'activo' | 'inactivo' | 'bloqueado' | 'pendiente' | 'rechazado';

export interface TherapistDocument {
  id: string;
  nombreDocumento: string;
  tipo: 'certificado' | 'diploma' | 'constancia' | 'licencia' | 'ine' | 'curp' | 'comprobante_domicilio';
  institucion: string;
  fechaEmision: string;
  fileUrl: string; // PDF, JPG, PNG preview
  fileType: 'pdf' | 'jpg' | 'png';
  estado: DocumentStatus;
  motivoRechazo?: string;
  fechaSubida: string;
}

export interface EmergencyContact {
  nombre: string;
  parentesco: string;
  telefono: string;
}

export interface TherapistFullProfile {
  id: string; // Match Auth UID
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  fotografia: string;
  fechaNacimiento?: string;
  direccion?: string;
  
  // Requirement 3: Additional Official & Banking Registration Fields
  curp?: string;
  ineNumber?: string;
  certificacionesInfo?: string;
  horarioAtencion?: string;
  cuentaBancariaCLABE?: string;
  contactoEmergencia?: EmergencyContact;
  motivoRechazoAccount?: string;
  
  // Professional
  especialidades: string[];
  experienciaAnos: number;
  idiomas: string[];
  disponibilidad: string; // e.g. "Lunes a Sábado, 8:00 - 20:00"
  zonasCobertura: string[];
  vehiculo?: string;
  
  // Status & Security
  estado: AccountStatus;
  mustChangePassword?: boolean; // Force change on first login
  documentos: TherapistDocument[];
  puntuacion: number;
  resenasCount: number;
  serviciosCompletados: number;
  
  fechaAlta: string;
  ultimoAcceso: string;
  fechaActualizacion: string;
}

export interface UserAuthProfile {
  id: string; // Firebase Auth UID
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  estado: AccountStatus;
  fechaRegistro: string; // ISO date string
  ultimoAcceso: string; // ISO date string
  correoVerificado: boolean;
  rol: UserRole;
  fechaActualizacion: string; // ISO date string
  mustChangePassword?: boolean; // First login password reset flag
  therapistProfile?: TherapistFullProfile;
}

export interface PasswordRequirements {
  minLength: boolean; // >= 8 chars
  hasUppercase: boolean; // A-Z
  hasLowercase: boolean; // a-z
  hasNumber: boolean; // 0-9
  hasSpecialChar: boolean; // !@#$%^&*() etc.
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Muy Débil' | 'Débil' | 'Media' | 'Fuerte' | 'Excelente';
  color: string;
  requirements: PasswordRequirements;
  isValid: boolean;
}

export interface LockoutState {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsCount: number;
  lockoutEndTime: number | null;
}

export type AuthFormMode = 'login' | 'register' | 'forgot_password' | 'verify_code' | 'reset_password' | 'force_change_password';


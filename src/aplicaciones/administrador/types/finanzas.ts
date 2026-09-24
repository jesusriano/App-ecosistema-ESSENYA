export type ExpenseCategory = 
  | 'Uniformes'
  | 'Toallas'
  | 'Equipo'
  | 'Bordados'
  | 'Tecnología'
  | 'Aplicación'
  | 'Publicidad'
  | 'Redes sociales'
  | 'Operación'
  | 'Insumos'
  | 'Gastos recurrentes'
  | 'Otros'
  | 'Publicidad y marketing'
  | 'Personal y terapeutas'
  | 'Administración'
  | 'Transporte'
  | 'Instalaciones'
  | 'Impuestos y obligaciones';

export type PaymentMethod = 
  | 'Transferencia SPEI'
  | 'Tarjeta de Crédito/Débito'
  | 'PayPal'
  | 'Otro';

export type ExpenseStatus = 'pagado' | 'pendiente' | 'programado';

export interface Expense {
  id?: string;
  concepto: string;
  categoria: ExpenseCategory;
  monto: number;
  fecha: string; // YYYY-MM-DD
  metodoPago: PaymentMethod;
  descripcion?: string;
  comprobanteUrl?: string;
  registradoPor: string;
  createdAt: string; // ISO string
  recurrente: boolean;
  estado: ExpenseStatus;
  tipo?: 'Gasto' | 'Inversión inicial' | 'Recurrente mensual';
  frecuencia?: 'Único' | 'Mensual' | 'Anual' | 'Personalizado';
}

export type PeriodFilter = 'este_mes' | 'mes_anterior' | 'anio_actual' | 'personalizado';

export interface FinancialSummary {
  ingresos: number;
  gastos: number;
  utilidad: number;
  margenUtilidad: number; // porcentaje
  gastosPublicidad: number;
  gastosOperativos: number;
  gastosPersonal: number;
  gastosAdministrativos: number;
  otrosGastos: number;
}

export type ExpenseCategory = 
  | 'Publicidad y marketing'
  | 'Personal y terapeutas'
  | 'Insumos'
  | 'Tecnología'
  | 'Administración'
  | 'Transporte'
  | 'Instalaciones'
  | 'Impuestos y obligaciones'
  | 'Otros';

export type PaymentMethod = 
  | 'Transferencia SPEI'
  | 'Tarjeta de Crédito/Débito'
  | 'Efectivo'
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

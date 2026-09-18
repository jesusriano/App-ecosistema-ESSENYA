import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Filter, Plus, 
  Trash2, Edit, FileText, CheckCircle, Clock, ShieldCheck, Tag, CreditCard, 
  AlertCircle, Download, RefreshCw, Layers
} from 'lucide-react';
import { 
  Expense, ExpenseCategory, PaymentMethod, ExpenseStatus, PeriodFilter, FinancialSummary 
} from '../types/finanzas';
import { getExpenses, addExpense, updateExpense, deleteExpense, getBookingsRevenue } from '../services/finanzasService';
import { Booking } from '../../../shared/types';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

export const FinanzasPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  // Filters & Period State
  const [period, setPeriod] = useState<PeriodFilter>('este_mes');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gastos' | 'ingresos' | 'reportes'>('dashboard');

  // Modal State for New/Edit Expense
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  // Form State
  const [conceptoInput, setConceptoInput] = useState('');
  const [categoriaInput, setCategoriaInput] = useState<ExpenseCategory>('Insumos');
  const [montoInput, setMontoInput] = useState('');
  const [fechaInput, setFechaInput] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPagoInput, setMetodoPagoInput] = useState<PaymentMethod>('Transferencia SPEI');
  const [descripcionInput, setDescripcionInput] = useState('');
  const [comprobanteInput, setComprobanteInput] = useState('');
  const [recurrenteInput, setRecurrenteInput] = useState(false);
  const [estadoInput, setEstadoInput] = useState<ExpenseStatus>('pagado');

  const loadData = async () => {
    setLoading(true);
    try {
      const [expData, bookData] = await Promise.all([getExpenses(), getBookingsRevenue()]);
      setExpenses(expData);
      setBookings(bookData);
    } catch (e) {
      console.error('Error loading financial data:', e);
      showToast('Error al cargar datos financieros', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter expenses by period, category, method
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter(exp => {
      // Category filter
      if (selectedCategory !== 'todos' && exp.categoria !== selectedCategory) return false;
      // Payment method filter
      if (selectedPaymentMethod !== 'todos' && exp.metodoPago !== selectedPaymentMethod) return false;

      // Period filter
      if (exp.fecha) {
        const expDate = new Date(exp.fecha);
        if (period === 'este_mes') {
          if (expDate.getMonth() !== currentMonth || expDate.getFullYear() !== currentYear) return false;
        } else if (period === 'mes_anterior') {
          const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          if (expDate.getMonth() !== targetMonth || expDate.getFullYear() !== targetYear) return false;
        } else if (period === 'anio_actual') {
          if (expDate.getFullYear() !== currentYear) return false;
        }
      }
      return true;
    });
  }, [expenses, period, selectedCategory, selectedPaymentMethod]);

  // Calculate Income from Bookings (paid bookings)
  const totalIngresos = useMemo(() => {
    return bookings
      .filter(b => b.paymentStatus === 'pagado' || b.state === 'servicio_finalizado' || b.state === 'servicio_iniciado')
      .reduce((acc, b) => acc + (b.total || b.price || 0), 0);
  }, [bookings]);

  // Calculate Expenses total
  const totalGastos = useMemo(() => {
    return filteredExpenses
      .filter(e => e.estado === 'pagado')
      .reduce((acc, e) => acc + (e.monto || 0), 0);
  }, [filteredExpenses]);

  // Summary breakdown by category
  const summaryByCategory = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      breakdown[e.categoria] = (breakdown[e.categoria] || 0) + (e.monto || 0);
    });
    return breakdown;
  }, [filteredExpenses]);

  const gastosPublicidad = summaryByCategory['Publicidad y marketing'] || 0;
  const gastosPersonal = summaryByCategory['Personal y terapeutas'] || 0;
  const gastosAdministrativos = summaryByCategory['Administración'] || 0;
  const gastosOperativos = (summaryByCategory['Insumos'] || 0) + (summaryByCategory['Transporte'] || 0) + (summaryByCategory['Instalaciones'] || 0);
  const otrosGastos = (summaryByCategory['Tecnología'] || 0) + (summaryByCategory['Impuestos y obligaciones'] || 0) + (summaryByCategory['Otros'] || 0);

  const utilidad = totalIngresos - totalGastos;
  const margenUtilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

  // Handle Form Submission
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptoInput || !montoInput) {
      showToast('Por favor completa el concepto y el monto', 'error');
      return;
    }

    try {
      const expenseData = {
        concepto: conceptoInput,
        categoria: categoriaInput,
        monto: parseFloat(montoInput) || 0,
        fecha: fechaInput,
        metodoPago: metodoPagoInput,
        descripcion: descripcionInput,
        comprobanteUrl: comprobanteInput,
        registradoPor: 'Administrador ESSENYA',
        recurrente: recurrenteInput,
        estado: estadoInput,
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expenseData);
        showToast('Gasto actualizado exitosamente', 'success');
      } else {
        await addExpense(expenseData);
        showToast('Gasto registrado exitosamente', 'success');
      }

      setShowExpenseModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error saving expense:', err);
      showToast('Error al guardar el gasto', 'error');
    }
  };

  const handleEdit = (exp: Expense) => {
    if (!exp.id) return;
    setEditingExpenseId(exp.id);
    setConceptoInput(exp.concepto);
    setCategoriaInput(exp.categoria);
    setMontoInput(String(exp.monto));
    setFechaInput(exp.fecha || new Date().toISOString().split('T')[0]);
    setMetodoPagoInput(exp.metodoPago || 'Transferencia SPEI');
    setDescripcionInput(exp.descripcion || '');
    setComprobanteInput(exp.comprobanteUrl || '');
    setRecurrenteInput(exp.recurrente || false);
    setEstadoInput(exp.estado || 'pagado');
    setShowExpenseModal(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (window.confirm('¿Estás seguro de eliminar este registro de gasto?')) {
      try {
        await deleteExpense(id);
        showToast('Gasto eliminado', 'success');
        loadData();
      } catch (e) {
        showToast('Error al eliminar gasto', 'error');
      }
    }
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setConceptoInput('');
    setCategoriaInput('Insumos');
    setMontoInput('');
    setFechaInput(new Date().toISOString().split('T')[0]);
    setMetodoPagoInput('Transferencia SPEI');
    setDescripcionInput('');
    setComprobanteInput('');
    setRecurrenteInput(false);
    setEstadoInput('pagado');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#C9A55B]" />
            <span>Módulo de Finanzas & Control de Gastos</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Análisis financiero en tiempo real, control de egresos, ingresos por reservas y rentabilidad del ecosistema ESSENYA.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            title="Actualizar datos"
            className="p-2 rounded-xl bg-[var(--bg-subcard)] hover:bg-[var(--border-color)] text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <LuxuryButton
            onClick={() => { resetForm(); setShowExpenseModal(true); }}
            className="text-xs py-2 px-4 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nuevo Gasto</span>
          </LuxuryButton>
        </div>
      </div>

      {/* Navigation Tabs for Finance */}
      <div className="flex items-center space-x-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Dashboard Financiero
        </button>
        <button
          onClick={() => setActiveTab('gastos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'gastos' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Control de Gastos ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('ingresos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ingresos' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Ingresos por Reservas ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('reportes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'reportes' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Reportes & Métricas
        </button>
      </div>

      {/* Period & Filter Selector Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Calendar className="w-4 h-4 text-[#C9A55B]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">Periodo de Análisis:</span>
          <div className="flex items-center space-x-1.5 bg-[var(--bg-subcard)] p-1 rounded-xl border border-[var(--border-color)]">
            {(['este_mes', 'mes_anterior', 'anio_actual'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer capitalize ${
                  period === p ? 'bg-[#C9A55B] text-black font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-[#C9A55B]" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="todos">Todas las Categorías</option>
            <option value="Publicidad y marketing">Publicidad y marketing</option>
            <option value="Personal y terapeutas">Personal y terapeutas</option>
            <option value="Insumos">Insumos</option>
            <option value="Tecnología">Tecnología</option>
            <option value="Administración">Administración</option>
            <option value="Transporte">Transporte</option>
            <option value="Instalaciones">Instalaciones</option>
            <option value="Impuestos y obligaciones">Impuestos y obligaciones</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
      </div>

      {/* TAB 1: DASHBOARD FINANCIERO */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-xs font-semibold">Ingresos Totales</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><TrendingUp className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-500">${totalIngresos.toLocaleString()} MXN</p>
              <span className="text-[10px] text-[var(--text-muted)]">Basado en reservas y pagos registrados</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-xs font-semibold">Gastos Totales</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500"><TrendingDown className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-rose-500">${totalGastos.toLocaleString()} MXN</p>
              <span className="text-[10px] text-[var(--text-muted)]">Egresos del periodo seleccionado</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-xs font-semibold">Utilidad Neta</span>
                <div className="p-2 rounded-xl bg-[#C9A55B]/10 text-[#C9A55B]"><DollarSign className="w-4 h-4" /></div>
              </div>
              <p className={`text-2xl sm:text-3xl font-serif font-bold ${utilidad >= 0 ? 'text-[#C9A55B]' : 'text-rose-500'}`}>
                ${utilidad.toLocaleString()} MXN
              </p>
              <span className="text-[10px] text-[var(--text-muted)]">Ingresos menos egresos</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-xs font-semibold">Margen de Utilidad</span>
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500"><PieChart className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)]">
                {margenUtilidad.toFixed(1)}%
              </p>
              <span className="text-[10px] text-[var(--text-muted)]">Rentabilidad operativa</span>
            </div>
          </div>

          {/* Secondary Financial Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Expense Breakdown by Category */}
            <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#C9A55B]" />
                <span>Desglose de Gastos por Categoría</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <span className="text-xs text-[var(--text-muted)] block">Publicidad y Marketing</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">${gastosPublicidad.toLocaleString()} MXN</span>
                  </div>
                  <span className="text-[10px] bg-[#C9A55B]/15 text-[#C9A55B] font-bold px-2 py-1 rounded-lg">Ads</span>
                </div>

                <div className="bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <span className="text-xs text-[var(--text-muted)] block">Personal y Terapeutas</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">${gastosPersonal.toLocaleString()} MXN</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-500 font-bold px-2 py-1 rounded-lg">Nómina</span>
                </div>

                <div className="bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <span className="text-xs text-[var(--text-muted)] block">Gastos Operativos (Insumos/Instalaciones)</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">${gastosOperativos.toLocaleString()} MXN</span>
                  </div>
                  <span className="text-[10px] bg-sky-500/15 text-sky-500 font-bold px-2 py-1 rounded-lg">Op</span>
                </div>

                <div className="bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <span className="text-xs text-[var(--text-muted)] block">Administrativos y Otros</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">${(gastosAdministrativos + otrosGastos).toLocaleString()} MXN</span>
                  </div>
                  <span className="text-[10px] bg-purple-500/15 text-purple-500 font-bold px-2 py-1 rounded-lg">Admin</span>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C9A55B]" />
                <span>Salud Financiera</span>
              </h3>
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)]">Registros de Gastos:</span>
                  <span className="font-bold text-[var(--text-primary)]">{filteredExpenses.length} movimientos</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)]">Reservas Facturadas:</span>
                  <span className="font-bold text-[var(--text-primary)]">{bookings.length} citas</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)]">Gastos Recurrentes:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {expenses.filter(e => e.recurrente).length} activos
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[var(--text-muted)]">Estado del Sistema:</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Óptimo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GASTOS */}
      {activeTab === 'gastos' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">
              Lista de Egresos y Gastos Registrados
            </h3>
            <LuxuryButton
              onClick={() => { resetForm(); setShowExpenseModal(true); }}
              className="text-xs py-2 px-3 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Gasto</span>
            </LuxuryButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subcard)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-color)]">
                <tr>
                  <th className="p-3">Concepto & Categoría</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Método de Pago</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                      No hay gastos registrados para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[var(--bg-subcard)] transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-[var(--text-primary)]">{exp.concepto}</p>
                        <span className="text-[10px] bg-[#C9A55B]/15 text-[#C9A55B] font-semibold px-2 py-0.5 rounded-md">
                          {exp.categoria}
                        </span>
                      </td>
                      <td className="p-3 font-serif font-bold text-rose-500">
                        ${(exp.monto || 0).toLocaleString()} MXN
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">{exp.fecha}</td>
                      <td className="p-3 text-[var(--text-primary)]">{exp.metodoPago}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          exp.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {exp.estado}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="p-1.5 rounded-lg bg-[var(--bg-subcard)] text-[var(--text-primary)] hover:text-[#C9A55B] transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INGRESOS */}
      {activeTab === 'ingresos' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">
                Ingresos Registrados por Reservas
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Sincronización automática con la colección de citas y pagos de clientes.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl">
              Total Ingresos: ${totalIngresos.toLocaleString()} MXN
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subcard)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-color)]">
                <tr>
                  <th className="p-3">ID Reserva & Servicio</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Fecha de Cita</th>
                  <th className="p-3">Estado de Pago</th>
                  <th className="p-3 text-right">Monto (Ingreso)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[var(--text-muted)]">
                      No hay reservas registradas en el ecosistema.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--bg-subcard)] transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-[var(--text-primary)]">#{b.id?.slice(0, 8)}</span>
                        <p className="text-[10px] text-[var(--text-muted)]">{b.serviceName || 'Masaje Profesional'}</p>
                      </td>
                      <td className="p-3 font-semibold text-[var(--text-primary)]">{b.clientName || 'Socio VIP'}</td>
                      <td className="p-3 text-[var(--text-muted)]">{b.date} • {b.time}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.paymentStatus === 'pagado' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {b.paymentStatus || 'pendiente'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-emerald-500">
                        ${(b.total || b.price || 0).toLocaleString()} MXN
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTES */}
      {activeTab === 'reportes' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">
                Reportes Financieros & Descargas
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Resumen ejecutivo listo para contabilidad, auditoría y análisis gerencial.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--bg-subcard)] p-5 rounded-2xl border border-[var(--border-color)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--text-primary)]">Resumen Ejecutivo del Periodo</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Ingresos Brutos:</span>
                  <span className="font-bold text-emerald-500">${totalIngresos.toLocaleString()} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Egresos Totales:</span>
                  <span className="font-bold text-rose-500">${totalGastos.toLocaleString()} MXN</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border-color)] pt-2">
                  <span className="font-bold text-[var(--text-primary)]">Utilidad Neta:</span>
                  <span className="font-bold text-[#C9A55B]">${utilidad.toLocaleString()} MXN</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-subcard)] p-5 rounded-2xl border border-[var(--border-color)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--text-primary)]">Exportación de Datos</h4>
              <p className="text-xs text-[var(--text-muted)]">
                Estructura preparada para exportar reportes en formatos oficiales de contabilidad.
              </p>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => alert('Función de exportación a PDF preparada para producción.')}
                  className="px-4 py-2 bg-[#C9A55B]/20 hover:bg-[#C9A55B]/30 text-[#C9A55B] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Exportar PDF
                </button>
                <button
                  onClick={() => alert('Función de exportación a Excel preparada para producción.')}
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Exportar Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA NUEVO / EDITAR GASTO */}
      {showExpenseModal && (
        <div 
          onClick={() => setShowExpenseModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-[var(--text-primary)] max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">
              {editingExpenseId ? 'Editar Registro de Gasto' : 'Registrar Nuevo Gasto'}
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Concepto del Gasto *</label>
                <input
                  type="text"
                  placeholder="Ej. Campaña Meta Ads CDMX"
                  value={conceptoInput}
                  onChange={(e) => setConceptoInput(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Categoría *</label>
                  <select
                    value={categoriaInput}
                    onChange={(e) => setCategoriaInput(e.target.value as ExpenseCategory)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Publicidad y marketing">Publicidad y marketing</option>
                    <option value="Personal y terapeutas">Personal y terapeutas</option>
                    <option value="Insumos">Insumos</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Administración">Administración</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Instalaciones">Instalaciones</option>
                    <option value="Impuestos y obligaciones">Impuestos y obligaciones</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Monto (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 6000"
                    value={montoInput}
                    onChange={(e) => setMontoInput(e.target.value)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Fecha *</label>
                  <input
                    type="date"
                    value={fechaInput}
                    onChange={(e) => setFechaInput(e.target.value)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Método de Pago *</label>
                  <select
                    value={metodoPagoInput}
                    onChange={(e) => setMetodoPagoInput(e.target.value as PaymentMethod)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Transferencia SPEI">Transferencia SPEI</option>
                    <option value="Tarjeta de Crédito/Débito">Tarjeta de Crédito/Débito</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Descripción (Opcional)</label>
                <textarea
                  placeholder="Detalles adicionales del gasto..."
                  value={descripcionInput}
                  onChange={(e) => setDescripcionInput(e.target.value)}
                  rows={2}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="recurrente"
                  checked={recurrenteInput}
                  onChange={(e) => setRecurrenteInput(e.target.checked)}
                  className="rounded border-[var(--border-color)] text-[#C9A55B] focus:ring-0"
                />
                <label htmlFor="recurrente" className="font-semibold text-[var(--text-primary)] cursor-pointer">
                  Marcar como gasto recurrente (mensual)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <LuxuryButton type="submit" className="px-4 py-2">
                  {editingExpenseId ? 'Actualizar Gasto' : 'Guardar Gasto'}
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

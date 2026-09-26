import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Filter, Plus, 
  Trash2, Edit, FileText, CheckCircle, Clock, ShieldCheck, Tag, CreditCard, 
  AlertCircle, Download, RefreshCw, Layers, Smartphone, Megaphone, Package,
  Gift, Copy, Share2, Lock
} from 'lucide-react';
import { 
  Expense, ExpenseCategory, PaymentMethod, ExpenseStatus, PeriodFilter, FinancialSummary 
} from '../types/finanzas';
import { getExpenses, addExpense, updateExpense, deleteExpense, getBookingsRevenue } from '../services/finanzasService';
import { Booking } from '../../../shared/types';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { auth } from '../../../lib/firebase';

const INITIAL_SEED_EXPENSES: Omit<Expense, 'id'>[] = [
  {
    concepto: '🛏️ Cobija',
    categoria: 'Equipo',
    monto: 163.49,
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia SPEI',
    descripcion: 'Gasto operativo inicial',
    registradoPor: 'Administración ESSENYA',
    createdAt: new Date().toISOString(),
    recurrente: false,
    estado: 'pagado',
    tipo: 'Gasto',
    frecuencia: 'Único'
  },
  {
    concepto: '👕 Uniforme',
    categoria: 'Uniformes',
    monto: 210.00,
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia SPEI',
    descripcion: 'Gasto operativo inicial',
    registradoPor: 'Administración ESSENYA',
    createdAt: new Date().toISOString(),
    recurrente: false,
    estado: 'pagado',
    tipo: 'Gasto',
    frecuencia: 'Único'
  },
  {
    concepto: '🧺 Toallas blancas',
    categoria: 'Toallas',
    monto: 30.00,
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia SPEI',
    descripcion: 'Gasto operativo inicial',
    registradoPor: 'Administración ESSENYA',
    createdAt: new Date().toISOString(),
    recurrente: false,
    estado: 'pagado',
    tipo: 'Gasto',
    frecuencia: 'Único'
  },
  {
    concepto: '👕 16 juegos de uniformes',
    categoria: 'Uniformes',
    monto: 9579.48,
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia SPEI',
    descripcion: 'Gasto operativo inicial (16 juegos)',
    registradoPor: 'Administración ESSENYA',
    createdAt: new Date().toISOString(),
    recurrente: false,
    estado: 'pagado',
    tipo: 'Gasto',
    frecuencia: 'Único'
  },
  {
    concepto: '🧵 Bordados',
    categoria: 'Bordados',
    monto: 3525.00,
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia SPEI',
    descripcion: 'Gasto operativo inicial de bordados',
    registradoPor: 'Administración ESSENYA',
    createdAt: new Date().toISOString(),
    recurrente: false,
    estado: 'pagado',
    tipo: 'Gasto',
    frecuencia: 'Único'
  },
  {
    concepto: '📱 Creación y desarrollo de la aplicación ESSENYA',
    categoria: 'Aplicación',
    monto: 17500.00,
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia SPEI',
    descripcion: 'Inversión inicial / Desarrollo tecnológico',
    registradoPor: 'Administración ESSENYA',
    createdAt: new Date().toISOString(),
    recurrente: false,
    estado: 'pagado',
    tipo: 'Inversión inicial',
    frecuencia: 'Único'
  },
  {
    concepto: '📣 Marketing, publicidad y gestión del ecosistema ESSENYA',
    categoria: 'Publicidad',
    monto: 7000.00,
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia SPEI',
    descripcion: '• Manejo de redes sociales.\n• Publicidad en Meta Ads.\n• Gestión y optimización de campañas.\n• Manejo y mantenimiento del ecosistema digital.\n• Gestión general de las herramientas y plataformas digitales relacionadas con ESSENYA.',
    registradoPor: 'Administración ESSENYA',
    createdAt: new Date().toISOString(),
    recurrente: true,
    estado: 'pagado',
    tipo: 'Recurrente mensual',
    frecuencia: 'Mensual'
  }
];

export const FinanzasPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  // Filters & Period State
  const [period, setPeriod] = useState<PeriodFilter>('este_mes');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gastos' | 'ingresos' | 'reportes' | 'giftcards'>('dashboard');

  // Gift Cards Management State
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [loadingGiftCards, setLoadingGiftCards] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [gcCodeInput, setGcCodeInput] = useState('');
  const [gcRecipientInput, setGcRecipientInput] = useState('');
  const [gcAmountInput, setGcAmountInput] = useState('1400');
  const [gcSenderInput, setGcSenderInput] = useState('Administración ESSENYA');
  const [gcMessageInput, setGcMessageInput] = useState('¡Disfruta de tu sesión de masaje relajante!');
  const [generatingGc, setGeneratingGc] = useState(false);

  const loadAdminGiftCards = async () => {
    setLoadingGiftCards(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/gift-cards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setGiftCards(data.cards || []);
      }
    } catch (e) {
      console.error('Error cargando gift cards:', e);
    } finally {
      setLoadingGiftCards(false);
    }
  };

  const handleGenerateGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingGc(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/gift-cards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customCode: gcCodeInput || undefined,
          recipientName: gcRecipientInput,
          amount: parseFloat(gcAmountInput) || 1400,
          senderName: gcSenderInput,
          customMessage: gcMessageInput
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Tarjeta Generada', `Código: ${data.card.code} con saldo de $${data.card.currentBalance} MXN`, 'success');
        setShowGiftCardModal(false);
        setGcCodeInput('');
        setGcRecipientInput('');
        loadAdminGiftCards();
      } else {
        showToast('Error', data.error || 'No se pudo generar la tarjeta', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Error de red', 'error');
    } finally {
      setGeneratingGc(false);
    }
  };

  const handleActivateGiftCard = async (code: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/gift-cards/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Tarjeta Activada', `La tarjeta ${code} ha sido activada con saldo completo.`, 'success');
        loadAdminGiftCards();
      } else {
        showToast('Error', data.error, 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

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
  const [tipoInput, setTipoInput] = useState<'Gasto' | 'Inversión inicial' | 'Recurrente mensual'>('Gasto');
  const [frecuenciaInput, setFrecuenciaInput] = useState<'Único' | 'Mensual' | 'Anual' | 'Personalizado'>('Único');

  const loadData = async () => {
    setLoading(true);
    try {
      let expData = await getExpenses();
      
      // Auto-seed initial expenses if empty
      if (expData.length === 0) {
        for (const seed of INITIAL_SEED_EXPENSES) {
          await addExpense(seed);
        }
        expData = await getExpenses();
      }

      const bookData = await getBookingsRevenue();
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
      if (selectedCategory !== 'todos' && exp.categoria !== selectedCategory) return false;
      if (selectedPaymentMethod !== 'todos' && exp.metodoPago !== selectedPaymentMethod) return false;

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

  // Specific Financial Totals required by user brief
  const gastosRegistradosTotal = useMemo(() => {
    return expenses
      .filter(e => e.tipo === 'Gasto' || (!e.tipo && !e.recurrente && e.monto < 15000))
      .reduce((acc, e) => acc + (e.monto || 0), 0);
  }, [expenses]);

  const inversionAppTotal = useMemo(() => {
    return expenses
      .filter(e => e.tipo === 'Inversión inicial' || e.categoria === 'Aplicación' || e.concepto.toLowerCase().includes('aplicación'))
      .reduce((acc, e) => acc + (e.monto || 0), 0);
  }, [expenses]);

  const gastoMensualRecurrenteTotal = useMemo(() => {
    return expenses
      .filter(e => e.tipo === 'Recurrente mensual' || e.recurrente)
      .reduce((acc, e) => acc + (e.monto || 0), 0);
  }, [expenses]);

  const totalIngresos = useMemo(() => {
    return bookings
      .filter(b => b.paymentStatus === 'pagado' || b.state === 'servicio_finalizado' || b.state === 'servicio_iniciado')
      .reduce((acc, b) => acc + (b.total || b.price || 0), 0);
  }, [bookings]);

  const totalGastosGenerales = useMemo(() => {
    return expenses.reduce((acc, e) => acc + (e.monto || 0), 0);
  }, [expenses]);

  const utilidad = totalIngresos - totalGastosGenerales;
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
        recurrente: recurrenteInput || tipoInput === 'Recurrente mensual',
        estado: estadoInput,
        tipo: tipoInput,
        frecuencia: frecuenciaInput,
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expenseData);
        showToast('Registro financiero actualizado exitosamente', 'success');
      } else {
        await addExpense(expenseData);
        showToast('Registro financiero creado exitosamente', 'success');
      }

      setShowExpenseModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error saving expense:', err);
      showToast('Error al guardar el registro', 'error');
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
    setTipoInput(exp.tipo || (exp.recurrente ? 'Recurrente mensual' : 'Gasto'));
    setFrecuenciaInput(exp.frecuencia || (exp.recurrente ? 'Mensual' : 'Único'));
    setShowExpenseModal(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (window.confirm('¿Estás seguro de eliminar este registro financiero?')) {
      try {
        await deleteExpense(id);
        showToast('Registro eliminado con éxito', 'success');
        loadData();
      } catch (e) {
        showToast('Error al eliminar registro', 'error');
      }
    }
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setConceptoInput('');
    setCategoriaInput('Uniformes');
    setMontoInput('');
    setFechaInput(new Date().toISOString().split('T')[0]);
    setMetodoPagoInput('Transferencia SPEI');
    setDescripcionInput('');
    setComprobanteInput('');
    setRecurrenteInput(false);
    setEstadoInput('pagado');
    setTipoInput('Gasto');
    setFrecuenciaInput('Único');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#C9A55B] shrink-0" />
            <span>Módulo de Finanzas</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Control claro, editable y organizado de inversiones, gastos operativos y costos recurrentes de ESSENYA.
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={loadData}
            title="Actualizar datos"
            className="p-2 rounded-xl bg-[var(--bg-subcard)] hover:bg-[var(--border-color)] text-[var(--text-primary)] transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <LuxuryButton
            onClick={() => { resetForm(); setShowExpenseModal(true); }}
            className="text-xs py-2 px-3 sm:px-4 flex items-center space-x-1.5 sm:space-x-2 flex-1 sm:flex-initial justify-center"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">+ Agregar Gasto / Inversión</span>
          </LuxuryButton>
        </div>
      </div>

      {/* Navigation Tabs for Finance */}
      <div className="w-full overflow-x-auto no-scrollbar flex items-center space-x-1.5 sm:space-x-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Dashboard Financiero
        </button>
        <button
          onClick={() => setActiveTab('gastos')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'gastos' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Control de Egresos ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('ingresos')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'ingresos' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Ingresos por Reservas ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('reportes')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'reportes' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Reportes & Auditoría
        </button>
        <button
          onClick={() => { setActiveTab('giftcards'); loadAdminGiftCards(); }}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'giftcards' ? 'bg-[#C9A55B] text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Gift className="w-3.5 h-3.5 shrink-0" />
          <span>Tarjetas de Regalo ({giftCards.length})</span>
        </button>
      </div>

      {/* Period Selector Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#C9A55B] shrink-0" />
            <span className="text-xs font-bold text-[var(--text-primary)]">Periodo:</span>
          </div>
          <div className="flex items-center space-x-1 bg-[var(--bg-subcard)] p-1 rounded-xl border border-[var(--border-color)] overflow-x-auto no-scrollbar">
            {(['este_mes', 'mes_anterior', 'anio_actual'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer capitalize whitespace-nowrap shrink-0 ${
                  period === p ? 'bg-[#C9A55B] text-black font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#C9A55B] shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-1.5 focus:outline-none flex-1 sm:flex-initial cursor-pointer"
          >
            <option value="todos">Todas las Categorías</option>
            <option value="Uniformes">Uniformes</option>
            <option value="Toallas">Toallas</option>
            <option value="Equipo">Equipo</option>
            <option value="Bordados">Bordados</option>
            <option value="Tecnología">Tecnología</option>
            <option value="Aplicación">Aplicación</option>
            <option value="Publicidad">Publicidad</option>
            <option value="Redes sociales">Redes sociales</option>
            <option value="Operación">Operación</option>
            <option value="Insumos">Insumos</option>
            <option value="Gastos recurrentes">Gastos recurrentes</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
      </div>

      {/* TAB 1: DASHBOARD FINANCIERO */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main User Requested Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-[var(--bg-card)] border border-[#C9A55B]/40 rounded-3xl p-6 space-y-3 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A55B]/5 rounded-bl-full pointer-events-none" />
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">Gastos Registrados</span>
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500"><Package className="w-5 h-5" /></div>
              </div>
              <p className="text-3xl font-serif font-bold text-rose-500">
                ${gastosRegistradosTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">Costos operativos iniciales y de suministros</p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[#C9A55B]/40 rounded-3xl p-6 space-y-3 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A55B]/5 rounded-bl-full pointer-events-none" />
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">Inversión en Aplicación</span>
                <div className="p-2.5 rounded-2xl bg-[#C9A55B]/15 text-[#C9A55B]"><Smartphone className="w-5 h-5" /></div>
              </div>
              <p className="text-3xl font-serif font-bold text-[#C9A55B]">
                ${inversionAppTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">Desarrollo tecnológico inicial ESSENYA</p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[#C9A55B]/40 rounded-3xl p-6 space-y-3 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A55B]/5 rounded-bl-full pointer-events-none" />
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">Gasto Mensual Recurrente</span>
                <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500"><Megaphone className="w-5 h-5" /></div>
              </div>
              <p className="text-3xl font-serif font-bold text-sky-500">
                ${gastoMensualRecurrenteTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN / mes
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">Marketing, Meta Ads y gestión del ecosistema</p>
            </div>
          </div>

          {/* Additional Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Total Gastado</span>
              <span className="text-base font-serif font-bold text-rose-500">${totalGastosGenerales.toLocaleString()}</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Total Inversiones</span>
              <span className="text-base font-serif font-bold text-[#C9A55B]">${inversionAppTotal.toLocaleString()}</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Gastos Recurrentes</span>
              <span className="text-base font-serif font-bold text-sky-500">${gastoMensualRecurrenteTotal.toLocaleString()}</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Gasto Mes Actual</span>
              <span className="text-base font-serif font-bold text-[var(--text-primary)]">${totalGastosGenerales.toLocaleString()}</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Gasto Acumulado</span>
              <span className="text-base font-serif font-bold text-[var(--text-primary)]">${(totalGastosGenerales + inversionAppTotal).toLocaleString()}</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Recurrentes Próximos</span>
              <span className="text-base font-serif font-bold text-emerald-500">Activo (Mensual)</span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Nº Registros</span>
              <span className="text-base font-serif font-bold text-[var(--text-primary)]">{expenses.length} ítems</span>
            </div>
          </div>

          {/* Detailed Initial Expenses list preview table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#C9A55B]" />
              <span>Resumen de Registros Iniciales & Recurrentes</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-subcard)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-color)]">
                  <tr>
                    <th className="p-3">Concepto</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Importe</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[var(--bg-subcard)] transition-colors">
                      <td className="p-3 font-bold text-[var(--text-primary)]">{exp.concepto}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C9A55B]/15 text-[#C9A55B]">
                          {exp.categoria}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          exp.tipo === 'Inversión inicial' ? 'bg-amber-500/15 text-amber-500' :
                          exp.tipo === 'Recurrente mensual' ? 'bg-sky-500/15 text-sky-500' : 'bg-rose-500/15 text-rose-500'
                        }`}>
                          {exp.tipo || 'Gasto'}
                        </span>
                      </td>
                      <td className="p-3 font-serif font-bold text-[var(--text-primary)]">
                        ${exp.monto.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GASTOS */}
      {activeTab === 'gastos' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">
              Control de Egresos, Inversiones y Gastos Operativos
            </h3>
            <LuxuryButton
              onClick={() => { resetForm(); setShowExpenseModal(true); }}
              className="text-xs py-2 px-3 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Gasto</span>
            </LuxuryButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subcard)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-color)]">
                <tr>
                  <th className="p-3">Concepto & Categoría</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Tipo / Frecuencia</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                      No hay registros financieros que coincidan con los filtros.
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
                        ${(exp.monto || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-[var(--text-primary)]">{exp.tipo || 'Gasto'}</span>
                        <p className="text-[10px] text-[var(--text-muted)]">{exp.frecuencia || 'Único'}</p>
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">{exp.fecha}</td>
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
                Reportes Financieros & Auditoría
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
                  <span className="font-bold text-rose-500">${totalGastosGenerales.toLocaleString()} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Inversión Tecnológica App:</span>
                  <span className="font-bold text-[#C9A55B]">${inversionAppTotal.toLocaleString()} MXN</span>
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

      {/* SECCIÓN DE TARJETAS DE REGALO */}
      {activeTab === 'giftcards' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-5">
            <div>
              <div className="inline-flex items-center space-x-2 bg-[#C9A55B]/15 border border-[#C9A55B]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#806020] dark:text-[#C9A55B] mb-2">
                <Gift className="w-3.5 h-3.5" />
                <span>Gestión de Tarjetas de Regalo</span>
              </div>
              <h3 className="text-xl font-serif font-bold text-[var(--text-primary)]">
                Emisión & Control de Tarjetas de Regalo
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Genera códigos de cortesía prepagados ($1,400 MXN o personalizado), consulta tarjetas activas y valida pagos pendientes.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <LuxuryButton 
                variant="outline" 
                size="sm"
                onClick={loadAdminGiftCards}
                disabled={loadingGiftCards}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingGiftCards ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </LuxuryButton>

              <LuxuryButton
                size="sm"
                onClick={() => setShowGiftCardModal(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Generar Tarjeta de Regalo</span>
              </LuxuryButton>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)]">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Total Emitidas</span>
              <span className="text-2xl font-black font-serif text-[var(--text-primary)]">{giftCards.length}</span>
            </div>
            <div className="bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)]">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Activas / Circulantes</span>
              <span className="text-2xl font-black font-serif text-emerald-500">
                {giftCards.filter(c => c.status === 'activa' || c.active === true).length}
              </span>
            </div>
            <div className="bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)]">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Saldo en Circulación</span>
              <span className="text-2xl font-black font-serif text-[#C9A55B]">
                ${giftCards.reduce((acc, c) => acc + (c.currentBalance || 0), 0).toLocaleString()} MXN
              </span>
            </div>
          </div>

          {/* Cards List */}
          {loadingGiftCards ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">Cargando tarjetas de regalo...</div>
          ) : giftCards.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-[var(--bg-subcard)] rounded-2xl border border-dashed border-[var(--border-color)]">
              <Gift className="w-10 h-10 text-[#C9A55B]/40 mx-auto" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No hay tarjetas de regalo emitidas aún</p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Haz clic en "Generar Tarjeta de Regalo" para emitir el primer código activo (ej. REGALO-ESS-1400) para un cliente especial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {giftCards.map((gc) => (
                <div 
                  key={gc.id} 
                  className="bg-[var(--bg-subcard)] border border-[var(--border-color)] hover:border-[#C9A55B]/40 rounded-2xl p-5 space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      gc.status === 'activa' || gc.active === true
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : gc.status === 'canjeada'
                        ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                        : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {gc.status === 'activa' || gc.active === true ? '● Activa' : gc.status === 'canjeada' ? '✓ Canjeada' : '⏳ Pendiente Pago'}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Vence: {gc.expirationDate || '1 año'}
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Código de Canje</div>
                    <div className="flex items-center justify-between bg-black/5 dark:bg-black/30 p-2 rounded-xl mt-1 border border-[var(--border-color)]">
                      <span className="font-mono font-bold text-sm text-[#806020] dark:text-[#E6CA65] select-all">
                        {gc.code}
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(gc.code);
                          showToast('Código Copiado', `Código ${gc.code} copiado al portapapeles.`, 'info');
                        }}
                        className="text-[var(--text-muted)] hover:text-[#C9A55B] p-1 rounded transition-colors"
                        title="Copiar código"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Lock className="w-3 h-3 flex-shrink-0" />
                    <span>Uso Único Garantizado (Se quema al canjear)</span>
                  </div>

                  <div className="text-xs space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Beneficiario:</span>
                      <span className="font-semibold text-[var(--text-primary)]">{gc.recipientName || 'Alguien especial'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Remitente:</span>
                      <span className="text-[var(--text-primary)]">{gc.senderName || 'ESSENYA'}</span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--border-color)] pt-1 mt-1">
                      <span className="font-bold text-[var(--text-primary)]">Saldo Disponible:</span>
                      <span className="font-bold text-[#C9A55B] font-mono">${(gc.currentBalance || 0).toLocaleString()} MXN</span>
                    </div>
                  </div>

                  {/* WhatsApp Message Copier */}
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `🎁 *¡Hola ${gc.recipientName || 'Especial'}!*\n` +
                        `Te compartimos tu Tarjeta de Regalo ESSENYA por *$${(gc.initialAmount || 1400).toLocaleString()} MXN*.\n\n` +
                        `🎟️ *Código de Uso Único:* ${gc.code}\n` +
                        `💆 *Servicio:* Válido para cualquier masaje a domicilio de nuestra carta oficial.\n` +
                        `📅 *Vigencia:* ${gc.expirationDate || '1 año'}\n\n` +
                        `👉 Para utilizarlo, sólo ingresa este código al momento de agendar tu cita en la plataforma ESSENYA. ¡Que disfrutes tu experiencia de bienestar! ✨`;
                      navigator.clipboard.writeText(msg);
                      showToast('Mensaje Copiado', 'Texto para WhatsApp copiado al portapapeles listo para enviar al cliente.', 'success');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#C9A55B]/15 hover:bg-[#C9A55B]/25 text-[#806020] dark:text-[#E6CA65] border border-[#C9A55B]/30 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copiar Voucher para WhatsApp</span>
                  </button>

                  {gc.status === 'pendiente_pago' && (
                    <button
                      type="button"
                      onClick={() => handleActivateGiftCard(gc.code)}
                      className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                    >
                      ✓ Confirmar Pago y Activar ($1,400)
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL PARA GENERAR TARJETA DE REGALO */}
      {showGiftCardModal && (
        <div 
          onClick={() => setShowGiftCardModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-[var(--text-primary)]"
          >
            <div className="flex items-center space-x-2 text-[#C9A55B]">
              <Gift className="w-5 h-5" />
              <h3 className="text-lg font-serif font-bold text-[var(--text-primary)]">
                Vender / Emitir Tarjeta de Regalo
              </h3>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Garantía de Uso Único:</span>
              </div>
              <p>
                Al generar este código, quedará activo de inmediato. Cuando el cliente lo ingrese en su reserva o en su billetera, el sistema lo marcará como <strong>Canjeado</strong> y no podrá volver a usarse.
              </p>
            </div>

            <form onSubmit={handleGenerateGiftCard} className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Código Personalizado (Opcional)
                </label>
                <input 
                  type="text" 
                  value={gcCodeInput}
                  onChange={(e) => setGcCodeInput(e.target.value.toUpperCase())}
                  placeholder="ej. REGALO-ESS-1400 (o déjalo vacío para automático)"
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-mono uppercase focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Monto / Saldo en Tarjeta (MXN)
                </label>
                <input 
                  type="number" 
                  value={gcAmountInput}
                  onChange={(e) => setGcAmountInput(e.target.value)}
                  placeholder="1400"
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-[#C9A55B]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Nombre del Destinatario (Beneficiario)
                </label>
                <input 
                  type="text" 
                  value={gcRecipientInput}
                  onChange={(e) => setGcRecipientInput(e.target.value)}
                  placeholder="ej. María Morales"
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#C9A55B]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Nombre de Quien Envía (Remitente)
                </label>
                <input 
                  type="text" 
                  value={gcSenderInput}
                  onChange={(e) => setGcSenderInput(e.target.value)}
                  placeholder="ej. Administración ESSENYA"
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Mensaje Especial
                </label>
                <textarea 
                  value={gcMessageInput}
                  onChange={(e) => setGcMessageInput(e.target.value)}
                  rows={2}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                <LuxuryButton
                  variant="outline"
                  className="w-1/2"
                  type="button"
                  onClick={() => setShowGiftCardModal(false)}
                >
                  Cancelar
                </LuxuryButton>
                <LuxuryButton
                  className="w-1/2"
                  type="submit"
                  disabled={generatingGc}
                >
                  {generatingGc ? 'Emitiendo...' : 'Crear y Activar'}
                </LuxuryButton>
              </div>
            </form>
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
              {editingExpenseId ? '✏️ Editar Registro Financiero' : '➕ Registrar Nuevo Gasto o Inversión'}
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Concepto *</label>
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
                    <option value="Uniformes">Uniformes</option>
                    <option value="Toallas">Toallas</option>
                    <option value="Equipo">Equipo</option>
                    <option value="Bordados">Bordados</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Aplicación">Aplicación</option>
                    <option value="Publicidad">Publicidad</option>
                    <option value="Redes sociales">Redes sociales</option>
                    <option value="Operación">Operación</option>
                    <option value="Insumos">Insumos</option>
                    <option value="Gastos recurrentes">Gastos recurrentes</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Monto (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 7000"
                    value={montoInput}
                    onChange={(e) => setMontoInput(e.target.value)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <label className="font-semibold text-[var(--text-muted)]">Tipo *</label>
                  <select
                    value={tipoInput}
                    onChange={(e) => setTipoInput(e.target.value as any)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Gasto">Gasto</option>
                    <option value="Inversión inicial">Inversión inicial</option>
                    <option value="Recurrente mensual">Recurrente mensual</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-muted)]">Frecuencia *</label>
                  <select
                    value={frecuenciaInput}
                    onChange={(e) => setFrecuenciaInput(e.target.value as any)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Único">Único</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-muted)]">Descripción (Opcional)</label>
                <textarea
                  placeholder="Detalles adicionales, campañas, desglose..."
                  value={descripcionInput}
                  onChange={(e) => setDescripcionInput(e.target.value)}
                  rows={3}
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
                  Marcar como gasto recurrente (generación automática por periodo)
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
                  {editingExpenseId ? 'Actualizar Registro' : 'Guardar Registro'}
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Plus, Edit, Trash2, CheckCircle2, 
  DollarSign, Clock, ShieldCheck, Tag, Star, Eye, EyeOff,
  Search, Filter, LayoutGrid, List, CheckSquare, Square,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { ServiceItem } from '../../../shared/types';

export const ServiciosPage: React.FC = () => {
  const { 
    services, 
    handleAddService, 
    handleEditService, 
    handleDeleteService,
    handleToggleServiceActive,
    handleBulkToggleServices
  } = useAdmin();
  const { showToast } = useToast();

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Activos' | 'Inactivos' | 'VIP'>('Todos');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formState, setFormState] = useState<{
    name: string;
    tagline: string;
    description: string;
    category: 'Holístico' | 'Terapéutico' | 'Exclusivo' | 'Parejas';
    basePrice: number;
    price90: number;
    price120: number;
    image: string;
    benefits: string;
    recommendedFor: string;
    isActive: boolean;
    discountPercent: number;
    isVipFeatured: boolean;
  }>({
    name: '',
    tagline: '',
    description: '',
    category: 'Holístico',
    basePrice: 1200,
    price90: 1600,
    price120: 2000,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
    benefits: 'Alivio del estrés, Relajación muscular',
    recommendedFor: 'Estrés mental y fatiga corporal',
    isActive: true,
    discountPercent: 0,
    isVipFeatured: false
  });

  // Filtered services
  const filteredServices = useMemo(() => {
    return (services || []).filter(srv => {
      if (!srv) return false;
      const anySrv = srv as any;
      const name = String(anySrv.name || anySrv.nombre || '');
      const tagline = String(anySrv.tagline || '');
      const description = String(anySrv.description || anySrv.descripcion || '');
      const id = String(anySrv.id || '');

      // 1. Text search
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term || 
        name.toLowerCase().includes(term) ||
        tagline.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // 2. Category filter
      if (categoryFilter !== 'Todos' && srv.category !== categoryFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter === 'Activos' && srv.isActive === false) return false;
      if (statusFilter === 'Inactivos' && srv.isActive !== false) return false;
      if (statusFilter === 'VIP' && !srv.isVipFeatured) return false;

      return true;
    });
  }, [services, searchQuery, categoryFilter, statusFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter(s => s.isActive !== false).length;
    const inactive = total - active;
    const vip = services.filter(s => s.isVipFeatured).length;
    return { total, active, inactive, vip };
  }, [services]);

  // Selection handlers
  const handleToggleSelect = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredServices.length && filteredServices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredServices.map(s => s.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk active/inactive
  const handleBulkToggle = async (active: boolean) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setIsProcessing(true);
    try {
      await handleBulkToggleServices(ids, active);
      showToast(`${ids.length} servicios marcados como ${active ? 'ACTIVOS' : 'INACTIVOS'}.`);
    } catch {
      showToast('Error al modificar los servicios seleccionados.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click single service status toggle
  const handleToggleActive = async (s: ServiceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetState = s.isActive === false;
    try {
      await handleToggleServiceActive(s.id, targetState);
      showToast(`Servicio "${s.name}" ${targetState ? 'activado' : 'desactivado'}.`);
    } catch {
      showToast(`No se pudo cambiar el estado de ${s.name}`, 'error');
    }
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormState({
      name: '',
      tagline: '',
      description: '',
      category: 'Holístico',
      basePrice: 1200,
      price90: 1600,
      price120: 2000,
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
      benefits: 'Relajación profunda, Renovación muscular',
      recommendedFor: 'Tensión acumulada e insomnio',
      isActive: true,
      discountPercent: 0,
      isVipFeatured: false
    });
    setShowModal(true);
  };

  const handleOpenEdit = (s: ServiceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingService(s);
    setFormState({
      name: s.name,
      tagline: s.tagline || '',
      description: s.description || '',
      category: s.category || 'Holístico',
      basePrice: s.basePrice || 1200,
      price90: s.price90 || 1600,
      price120: s.price120 || 2000,
      image: s.image || '',
      benefits: s.benefits ? s.benefits.join(', ') : '',
      recommendedFor: s.recommendedFor || '',
      isActive: s.isActive !== false,
      discountPercent: s.discountPercent || 0,
      isVipFeatured: Boolean(s.isVipFeatured)
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;

    setIsProcessing(true);
    const benefitsArray = formState.benefits.split(',').map(b => b.trim()).filter(Boolean);

    try {
      if (editingService) {
        const updated: ServiceItem = {
          ...editingService,
          name: formState.name.trim(),
          tagline: formState.tagline.trim(),
          description: formState.description.trim(),
          category: formState.category,
          basePrice: Number(formState.basePrice),
          price90: Number(formState.price90),
          price120: Number(formState.price120),
          image: formState.image.trim(),
          benefits: benefitsArray,
          recommendedFor: formState.recommendedFor.trim(),
          isActive: formState.isActive,
          discountPercent: Number(formState.discountPercent),
          isVipFeatured: formState.isVipFeatured
        };
        await handleEditService(updated);
        showToast(`Servicio "${updated.name}" actualizado exitosamente.`);
      } else {
        const newSrv: ServiceItem = {
          id: `srv-${Date.now()}`,
          name: formState.name.trim(),
          tagline: formState.tagline.trim(),
          description: formState.description.trim(),
          category: formState.category,
          basePrice: Number(formState.basePrice),
          price90: Number(formState.price90),
          price120: Number(formState.price120),
          iconName: 'Sparkles',
          image: formState.image.trim(),
          benefits: benefitsArray,
          recommendedFor: formState.recommendedFor.trim(),
          allowedDurations: [60, 90, 120],
          isActive: formState.isActive,
          discountPercent: Number(formState.discountPercent),
          isVipFeatured: formState.isVipFeatured
        };
        await handleAddService(newSrv);
        showToast(`Servicio "${newSrv.name}" creado en el catálogo.`);
      }
      setShowModal(false);
    } catch {
      showToast('Error al persistir el servicio en base de datos.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    setIsProcessing(true);
    try {
      await handleDeleteService(serviceToDelete.id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(serviceToDelete.id);
        return next;
      });
      showToast(`Servicio "${serviceToDelete.name}" eliminado.`);
    } catch {
      showToast('Error al eliminar el servicio.', 'error');
    } finally {
      setIsProcessing(false);
      setServiceToDelete(null);
    }
  };

  const isAllSelected = filteredServices.length > 0 && selectedIds.size === filteredServices.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < filteredServices.length;

  return (
    <div id="admin-servicios-page" className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C9A55B]" />
            <span>Catálogo de Servicios & Precios ESSENYA</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Administra los rituales de bienestar, selecciona y activa servicios, ajusta tarifas por duración y programa beneficios VIP.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <LuxuryButton id="btn-nuevo-servicio" variant="gold" size="sm" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Nuevo Servicio</span>
          </LuxuryButton>
        </div>
      </div>

      {/* KPI Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div id="stat-total-servicios" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Total Catálogo</span>
            <span className="text-xl font-serif font-bold text-[var(--text-primary)]">{stats.total}</span>
          </div>
          <Tag className="w-5 h-5 text-[#C9A55B]/60" />
        </div>

        <div id="stat-servicios-activos" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-500 uppercase tracking-wider block">Activos en Reserva</span>
            <span className="text-xl font-serif font-bold text-emerald-500 dark:text-emerald-400">{stats.active}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500/60" />
        </div>

        <div id="stat-servicios-inactivos" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Pausados / Inactivos</span>
            <span className="text-xl font-serif font-bold text-zinc-500">{stats.inactive}</span>
          </div>
          <EyeOff className="w-5 h-5 text-zinc-400/60" />
        </div>

        <div id="stat-servicios-vip" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#C9A55B] uppercase tracking-wider block">Destacados VIP</span>
            <span className="text-xl font-serif font-bold text-[#C9A55B]">{stats.vip}</span>
          </div>
          <Star className="w-5 h-5 text-[#C9A55B]/60" />
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="input-buscar-servicio"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar servicio por nombre, código o categoría..."
              className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              id="select-filtro-categoria"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
            >
              <option value="Todos">Todas las Categorías</option>
              <option value="Holístico">Holístico</option>
              <option value="Terapéutico">Terapéutico</option>
              <option value="Exclusivo">Exclusivo</option>
              <option value="Parejas">Parejas</option>
            </select>

            {/* Status Select */}
            <select
              id="select-filtro-estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Activos">Solo Activos</option>
              <option value="Inactivos">Solo Inactivos</option>
              <option value="VIP">Destacados VIP</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-[var(--border-color)] bg-[var(--bg-subcard)] rounded-xl p-0.5">
              <button
                id="btn-vista-cuadricula"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cards' 
                    ? 'bg-[#C9A55B] text-black shadow-xs font-semibold' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                id="btn-vista-tabla"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-[#C9A55B] text-black shadow-xs font-semibold' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Vista Tabla"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Multi-Selection Control Bar (Shown when items are selected or available) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)] text-xs">
          <div className="flex items-center gap-2">
            <button
              id="btn-seleccionar-todos"
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subcard)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] cursor-pointer transition-all"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#C9A55B]" />
              ) : isPartiallySelected ? (
                <div className="w-4 h-4 bg-[#C9A55B] rounded-xs flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-black" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-[var(--text-muted)]" />
              )}
              <span className="font-semibold">
                {selectedIds.size > 0 ? `Seleccionados (${selectedIds.size}/${filteredServices.length})` : 'Seleccionar Todos'}
              </span>
            </button>

            {selectedIds.size > 0 && (
              <button
                id="btn-deseleccionar-todos"
                onClick={handleClearSelection}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer text-xs ml-2"
              >
                Deseleccionar
              </button>
            )}
          </div>

          {/* Bulk Action Buttons */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <button
                id="btn-activar-seleccionados"
                onClick={() => handleBulkToggle(true)}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Activar ({selectedIds.size})</span>
              </button>

              <button
                id="btn-desactivar-seleccionados"
                onClick={() => handleBulkToggle(false)}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-600 dark:text-zinc-300 border border-zinc-500/30 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Desactivar ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div id="servicios-vacio" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-[#C9A55B]/40 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">No se encontraron servicios</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            No hay servicios que coincidan con los filtros aplicados ({categoryFilter !== 'Todos' ? `Categoría: ${categoryFilter}` : ''} {statusFilter !== 'Todos' ? `Estado: ${statusFilter}` : ''}).
          </p>
          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter('Todos'); setStatusFilter('Todos'); }}
            className="text-xs text-[#C9A55B] underline font-semibold cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* VISTA 1: CARDS (Grid View) */}
      {viewMode === 'cards' && filteredServices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((s) => {
            const isSelected = selectedIds.has(s.id);
            const isActive = s.isActive !== false;

            return (
              <div 
                key={s.id} 
                id={`card-service-${s.id}`}
                onClick={() => handleToggleSelect(s.id)}
                className={`bg-[var(--bg-card)] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all cursor-pointer relative group ${
                  isSelected 
                    ? 'border-[#C9A55B] shadow-md ring-2 ring-[#C9A55B]/30' 
                    : 'border-[var(--border-color)] hover:border-[#C9A55B]/40 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative h-44 overflow-hidden bg-zinc-900">
                    <img 
                      src={s.image || undefined} 
                      alt={s.name} 
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        !isActive ? 'grayscale opacity-60' : ''
                      }`} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-black/40" />
                    
                    {/* Selection Checkbox Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div 
                        onClick={(e) => handleToggleSelect(s.id, e)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all backdrop-blur-md cursor-pointer ${
                          isSelected 
                            ? 'bg-[#C9A55B] border-[#C9A55B] text-black' 
                            : 'bg-black/60 border-white/40 text-transparent hover:border-[#C9A55B]'
                        }`}
                        title={isSelected ? 'Deseleccionar servicio' : 'Seleccionar servicio'}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'block' : 'opacity-0'}`} />
                      </div>

                      <span className="bg-black/80 backdrop-blur-md text-[#C9A55B] border border-[#C9A55B]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                        {s.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {s.isVipFeatured && (
                        <span className="bg-[#C9A55B] text-black text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <Star className="w-2.5 h-2.5 fill-black" /> VIP
                        </span>
                      )}
                      {Boolean(s.discountPercent && s.discountPercent > 0) && (
                        <span className="bg-emerald-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                          -{s.discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-[var(--text-primary)] group-hover:text-[#C9A55B] transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{s.tagline}</p>
                      </div>
                    </div>

                    {/* Price Matrix */}
                    <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl p-3 grid grid-cols-3 text-center divide-x divide-[var(--border-color)]">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">60 Min</span>
                        <span className="text-xs font-serif font-bold text-[#C9A55B]">${s.basePrice}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">90 Min</span>
                        <span className="text-xs font-serif font-bold text-[var(--text-primary)]">${s.price90}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">120 Min</span>
                        <span className="text-xs font-serif font-bold text-[var(--text-primary)]">${s.price120}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls & Quick Switch */}
                <div 
                  className="p-5 pt-0 flex justify-between items-center border-t border-[var(--border-color)] mt-4 pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Direct 1-Click Status Switch */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`switch-active-${s.id}`}
                      role="switch"
                      aria-checked={isActive}
                      onClick={(e) => handleToggleActive(s, e)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? 'bg-emerald-500' : 'bg-zinc-600'
                      }`}
                      title={isActive ? 'Desactivar servicio' : 'Activar servicio'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-semibold ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-zinc-500'}`}>
                      {isActive ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      id={`btn-edit-${s.id}`}
                      onClick={(e) => handleOpenEdit(s, e)}
                      className="p-2 bg-[var(--bg-subcard)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-[#C9A55B] rounded-xl transition-all cursor-pointer"
                      title="Editar Servicio"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-delete-${s.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setServiceToDelete(s);
                      }}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-xl transition-all cursor-pointer"
                      title="Eliminar Servicio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 2: TABLA DETALLADA (Table View) */}
      {viewMode === 'table' && filteredServices.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subcard)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="accent-[#C9A55B] cursor-pointer rounded-xs"
                      title="Seleccionar todos"
                    />
                  </th>
                  <th className="p-3.5">Servicio</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5 text-center">60 Min</th>
                  <th className="p-3.5 text-center">90 Min</th>
                  <th className="p-3.5 text-center">120 Min</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-primary)]">
                {filteredServices.map((s) => {
                  const isSelected = selectedIds.has(s.id);
                  const isActive = s.isActive !== false;

                  return (
                    <tr 
                      key={s.id} 
                      id={`row-service-${s.id}`}
                      onClick={() => handleToggleSelect(s.id)}
                      className={`hover:bg-[var(--bg-subcard)]/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#C9A55B]/10' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(s.id, e)}
                          className="accent-[#C9A55B] cursor-pointer rounded-xs"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={s.image || undefined} 
                            alt={s.name} 
                            className={`w-10 h-10 rounded-lg object-cover bg-zinc-800 ${!isActive ? 'grayscale opacity-60' : ''}`} 
                          />
                          <div>
                            <div className="font-semibold flex items-center gap-1.5">
                              <span>{s.name}</span>
                              {s.isVipFeatured && (
                                <span className="bg-[#C9A55B]/20 text-[#C9A55B] text-[9px] font-bold px-1.5 py-0.2 rounded-sm">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] line-clamp-1">{s.tagline}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-serif font-bold text-[#C9A55B]">
                        ${s.basePrice}
                      </td>

                      <td className="p-3.5 text-center font-serif font-bold">
                        ${s.price90}
                      </td>

                      <td className="p-3.5 text-center font-serif font-bold">
                        ${s.price120}
                      </td>

                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            role="switch"
                            aria-checked={isActive}
                            onClick={(e) => handleToggleActive(s, e)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isActive ? 'bg-emerald-500' : 'bg-zinc-600'
                            }`}
                            title={isActive ? 'Desactivar servicio' : 'Activar servicio'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                isActive ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-zinc-500'}`}>
                            {isActive ? 'Activo' : 'Pausado'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={(e) => handleOpenEdit(s, e)}
                            className="p-1.5 bg-[var(--bg-subcard)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-[#C9A55B] rounded-lg transition-all cursor-pointer"
                            title="Editar Servicio"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setServiceToDelete(s);
                            }}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-lg transition-all cursor-pointer"
                            title="Eliminar Servicio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div id="modal-servicio" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-xl w-full space-y-4 my-8 relative shadow-2xl">
            <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
              {editingService ? 'Editar Servicio de Bienestar' : 'Nuevo Servicio en Catálogo'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[var(--text-muted)]">
              <div>
                <label className="block mb-1 text-[var(--text-primary)] font-semibold">Nombre Oficial del Servicio</label>
                <input
                  id="input-nombre-servicio"
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="ej. Masaje Relajante Aromaterapia"
                  required
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[var(--text-primary)] font-semibold">Categoría</label>
                  <select
                    id="select-categoria-servicio"
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value as any })}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                  >
                    <option value="Holístico">Holístico</option>
                    <option value="Terapéutico">Terapéutico</option>
                    <option value="Exclusivo">Exclusivo</option>
                    <option value="Parejas">Parejas</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[var(--text-primary)] font-semibold">Descuento Promocional (%)</label>
                  <input
                    id="input-descuento-servicio"
                    type="number"
                    min="0"
                    max="90"
                    value={formState.discountPercent}
                    onChange={(e) => setFormState({ ...formState, discountPercent: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              {/* Pricing Matrix */}
              <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                <span className="font-bold text-[var(--text-primary)] block">Precios por Duración (MXN)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 text-[var(--text-muted)] font-semibold">60 Minutos</label>
                    <input
                      id="input-precio-60"
                      type="number"
                      min="100"
                      value={formState.basePrice}
                      onChange={(e) => setFormState({ ...formState, basePrice: Number(e.target.value) })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[var(--text-muted)] font-semibold">90 Minutos</label>
                    <input
                      id="input-precio-90"
                      type="number"
                      min="100"
                      value={formState.price90}
                      onChange={(e) => setFormState({ ...formState, price90: Number(e.target.value) })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[var(--text-muted)] font-semibold">120 Minutos</label>
                    <input
                      id="input-precio-120"
                      type="number"
                      min="100"
                      value={formState.price120}
                      onChange={(e) => setFormState({ ...formState, price120: Number(e.target.value) })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[var(--text-primary)] font-semibold">Slogan Corto (Tagline)</label>
                <input
                  id="input-tagline-servicio"
                  type="text"
                  value={formState.tagline}
                  onChange={(e) => setFormState({ ...formState, tagline: e.target.value })}
                  placeholder="ej. Maniobras fluidas para inducir relajación profunda..."
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="block mb-1 text-[var(--text-primary)] font-semibold">Descripción Detallada</label>
                <textarea
                  id="input-descripcion-servicio"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] p-3 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="block mb-1 text-[var(--text-primary)] font-semibold">URL de Fotografía / Imagen</label>
                <input
                  id="input-imagen-servicio"
                  type="text"
                  value={formState.image}
                  onChange={(e) => setFormState({ ...formState, image: e.target.value })}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div>
                <label className="block mb-1 text-[var(--text-primary)] font-semibold">Beneficios (separados por coma)</label>
                <input
                  id="input-beneficios-servicio"
                  type="text"
                  value={formState.benefits}
                  onChange={(e) => setFormState({ ...formState, benefits: e.target.value })}
                  placeholder="Alivio de tensión, Mejora de circulación, Reducción de cortisol"
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    id="checkbox-is-active"
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                    className="accent-[#C9A55B]"
                  />
                  <span className="text-[var(--text-primary)] font-semibold">Servicio Activo para Reservas</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    id="checkbox-is-vip"
                    type="checkbox"
                    checked={formState.isVipFeatured}
                    onChange={(e) => setFormState({ ...formState, isVipFeatured: e.target.checked })}
                    className="accent-[#C9A55B]"
                  />
                  <span className="text-[#C9A55B] font-semibold">Destacado VIP Imperial</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancelar
                </button>
                <LuxuryButton type="submit" variant="gold" size="sm" disabled={isProcessing}>
                  {isProcessing ? 'Guardando...' : 'Guardar Servicio'}
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div id="modal-confirmar-eliminar" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">¿Eliminar Servicio?</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              ¿Estás seguro de que deseas eliminar <strong className="text-[var(--text-primary)]">{serviceToDelete.name}</strong> del catálogo de ESSENYA? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setServiceToDelete(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

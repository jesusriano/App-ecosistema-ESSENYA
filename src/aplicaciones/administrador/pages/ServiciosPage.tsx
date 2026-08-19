import React, { useState } from 'react';
import { 
  Sparkles, Plus, Edit, Trash2, CheckCircle2, 
  DollarSign, Clock, ShieldCheck, Tag, Star, Eye, EyeOff
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { ServiceItem } from '../../../shared/types';

export const ServiciosPage: React.FC = () => {
  const { services, handleAddService, handleEditService, handleDeleteService } = useAdmin();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

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

  const handleOpenEdit = (s: ServiceItem) => {
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
      isVipFeatured: s.isVipFeatured || false
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) return;

    const benefitsArray = formState.benefits.split(',').map(b => b.trim()).filter(Boolean);

    if (editingService) {
      const updated: ServiceItem = {
        ...editingService,
        name: formState.name,
        tagline: formState.tagline,
        description: formState.description,
        category: formState.category,
        basePrice: Number(formState.basePrice),
        price90: Number(formState.price90),
        price120: Number(formState.price120),
        image: formState.image,
        benefits: benefitsArray,
        recommendedFor: formState.recommendedFor,
        isActive: formState.isActive,
        discountPercent: Number(formState.discountPercent),
        isVipFeatured: formState.isVipFeatured
      };
      handleEditService(updated);
      showToast(`Servicio "${updated.name}" actualizado exitosamente.`);
    } else {
      const newSrv: ServiceItem = {
        id: `srv-${Date.now()}`,
        name: formState.name,
        tagline: formState.tagline,
        description: formState.description,
        category: formState.category,
        basePrice: Number(formState.basePrice),
        price90: Number(formState.price90),
        price120: Number(formState.price120),
        iconName: 'Sparkles',
        image: formState.image,
        benefits: benefitsArray,
        recommendedFor: formState.recommendedFor,
        allowedDurations: [60, 90, 120],
        isActive: formState.isActive,
        discountPercent: Number(formState.discountPercent),
        isVipFeatured: formState.isVipFeatured
      };
      handleAddService(newSrv);
      showToast(`Servicio "${newSrv.name}" creado en el catálogo.`);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#262626] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C9A55B]" />
            <span>Catálogo de Servicios & Precios ESSENYA</span>
          </h1>
          <p className="text-xs text-[#888888] mt-1">
            Administra los rituales de bienestar, ajusta precios por duración (60, 90, 120 min) y aplica promociones.
          </p>
        </div>

        <LuxuryButton variant="gold" size="sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Nuevo Servicio</span>
        </LuxuryButton>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <div key={s.id} className="bg-[#141414] border border-[#262626] hover:border-[#C9A55B]/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all">
            <div>
              <div className="relative h-44 overflow-hidden">
                <img src={s.image || undefined} alt={s.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30" />
                
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="bg-black/80 backdrop-blur-md text-[#C9A55B] border border-[#C9A55B]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {s.category}
                  </span>
                  {s.isVipFeatured && (
                    <span className="bg-[#C9A55B] text-black text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-black" /> DESTACADO VIP
                    </span>
                  )}
                  {s.discountPercent ? s.discountPercent > 0 ? (
                    <span className="bg-emerald-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full">
                      -{s.discountPercent}% PROMO
                    </span>
                  ) : null : null}
                </div>

                <div className="absolute top-3 right-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    s.isActive !== false ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {s.isActive !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="font-serif font-bold text-lg text-white">{s.name}</h3>
                <p className="text-xs text-[#AAAAAA] line-clamp-2">{s.tagline}</p>

                {/* Price Matrix */}
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 grid grid-cols-3 text-center divide-x divide-[#262626]">
                  <div>
                    <span className="text-[10px] text-[#888888] block">60 Min</span>
                    <span className="text-xs font-serif font-bold text-[#C9A55B]">${s.basePrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#888888] block">90 Min</span>
                    <span className="text-xs font-serif font-bold text-white">${s.price90}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#888888] block">120 Min</span>
                    <span className="text-xs font-serif font-bold text-white">${s.price120}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex justify-between items-center border-t border-[#262626] mt-4">
              <span className="text-[11px] text-[#888888]">ID: {s.id}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-2 bg-[#1A1A1A] hover:bg-[#262626] text-stone-300 hover:text-[#C9A55B] rounded-xl transition-all cursor-pointer"
                  title="Editar Servicio"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    handleDeleteService(s.id);
                    showToast(`Servicio ${s.name} eliminado.`);
                  }}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer"
                  title="Eliminar Servicio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 max-w-xl w-full space-y-4 my-8 relative">
            <h2 className="text-xl font-serif font-bold text-white">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio de Bienestar'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[#888888]">
              <div>
                <label className="block mb-1 text-stone-300 font-semibold">Nombre del Servicio</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="ej. Masaje Holístico Essenya Gold"
                  required
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-stone-300 font-semibold">Categoría</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value as any })}
                    className="w-full bg-[#1A1A1A] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs"
                  >
                    <option value="Holístico">Holístico</option>
                    <option value="Terapéutico">Terapéutico</option>
                    <option value="Exclusivo">Exclusivo</option>
                    <option value="Parejas">Parejas</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-stone-300 font-semibold">Descuento Promocional %</label>
                  <input
                    type="number"
                    value={formState.discountPercent}
                    onChange={(e) => setFormState({ ...formState, discountPercent: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-[#1A1A1A] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Pricing Matrix */}
              <div className="bg-[#1A1A1A] border border-[#262626] rounded-2xl p-4 space-y-3">
                <span className="font-bold text-white block">Precios por Duración (MXN)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1">60 Minutos</label>
                    <input
                      type="number"
                      value={formState.basePrice}
                      onChange={(e) => setFormState({ ...formState, basePrice: Number(e.target.value) })}
                      className="w-full bg-[#141414] border border-[#333333] text-white px-3 py-1.5 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">90 Minutos</label>
                    <input
                      type="number"
                      value={formState.price90}
                      onChange={(e) => setFormState({ ...formState, price90: Number(e.target.value) })}
                      className="w-full bg-[#141414] border border-[#333333] text-white px-3 py-1.5 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">120 Minutos</label>
                    <input
                      type="number"
                      value={formState.price120}
                      onChange={(e) => setFormState({ ...formState, price120: Number(e.target.value) })}
                      className="w-full bg-[#141414] border border-[#333333] text-white px-3 py-1.5 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-stone-300 font-semibold">Slogan Corto (Tagline)</label>
                <input
                  type="text"
                  value={formState.tagline}
                  onChange={(e) => setFormState({ ...formState, tagline: e.target.value })}
                  placeholder="ej. Maniobras fluidas para inducir relajación profunda..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 text-stone-300 font-semibold">Descripción Completa</label>
                <textarea
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white p-3 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 text-stone-300 font-semibold">URL Imagen</label>
                <input
                  type="text"
                  value={formState.image}
                  onChange={(e) => setFormState({ ...formState, image: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-[#333333] text-white px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                    className="accent-[#C9A55B]"
                  />
                  <span className="text-white font-semibold">Servicio Activo</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isVipFeatured}
                    onChange={(e) => setFormState({ ...formState, isVipFeatured: e.target.checked })}
                    className="accent-[#C9A55B]"
                  />
                  <span className="text-[#C9A55B] font-semibold">Destacado VIP</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[#888888] hover:text-white"
                >
                  Cancelar
                </button>
                <LuxuryButton type="submit" variant="gold" size="sm">
                  Guardar Servicio
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

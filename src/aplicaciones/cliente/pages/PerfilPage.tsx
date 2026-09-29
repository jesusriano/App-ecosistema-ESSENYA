import React, { useState, useMemo } from 'react';
import { 
  User, ShieldCheck, MapPin, Phone, Mail, Award, CreditCard, Heart, 
  Camera, Upload, CheckCircle2, Crown, Gem, Sparkles, Shield, Lock, ArrowUpRight,
  FileText, Scale
} from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { calculateMembershipTier, getCompletedAndPaidBookings } from '../services/membershipService';
import { NotificationSoundSettings } from '../../../shared/components/NotificationSoundSettings';
import { PushSettingsCard } from '../../../shared/components/PushSettingsCard';
import { COMPREHENSIVE_ZONES } from '../../../shared/constants/zones';
import { ClientPoliciesModal } from '../../../shared/components/ClientPoliciesModal';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

export const PerfilPage: React.FC = () => {
  const { client, bookings } = useCliente();
  const { getUser, firebaseUser } = useAuth();
  const authUser = getUser('cliente');
  const { showToast } = useToast();
  const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);

  // Cálculo estricto del nivel según masajes pagados y concluidos
  const completedAndPaidBookings = useMemo(() => {
    return getCompletedAndPaidBookings(bookings, client?.id);
  }, [bookings, client?.id]);

  const completedCount = completedAndPaidBookings.length;
  const tierInfo = useMemo(() => {
    return calculateMembershipTier(completedCount);
  }, [completedCount]);

  const displayName = authUser?.nombre 
    ? `${authUser.nombre} ${authUser.apellidos || ''}`.trim() 
    : (client?.name || 'Socio VIP');

  const displayEmail = authUser?.correo || client?.email || 'socio@essenya.com';
  const displayPhone = authUser?.telefono || client?.phone || '+52 55 1234 5678';

  const [clientPhoto, setClientPhoto] = useState<string>(() => {
    return client?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
  });

  const [streetInput, setStreetInput] = useState<string>(client?.street || '');
  const [interiorInput, setInteriorInput] = useState<string>(client?.interior || '');
  const [coloniaInput, setColoniaInput] = useState<string>(client?.colonia || '');
  const [postalCodeInput, setPostalCodeInput] = useState<string>(client?.postalCode || '');
  const [cityZoneInput, setCityZoneInput] = useState<string>(client?.cityZone || 'Polanco / Lomas CDMX');
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [savingAddress, setSavingAddress] = useState<boolean>(false);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = firebaseUser?.uid || authUser?.uid || client?.id;
    if (!targetId) {
      showToast('Sesión no encontrada', 'Por favor inicia sesión de nuevo para guardar tu dirección.', 'error');
      return;
    }
    if (!streetInput.trim() || !coloniaInput.trim() || !postalCodeInput.trim()) {
      showToast('Campos requeridos', 'Por favor completa la calle, colonia y código postal.', 'error');
      return;
    }

    const fullAddress = `${streetInput.trim()}${interiorInput ? `, Int. ${interiorInput.trim()}` : ''}, Col. ${coloniaInput.trim()}, C.P. ${postalCodeInput.trim()}, ${cityZoneInput}`;

    setSavingAddress(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../../lib/firebase');
      const clientRef = doc(db, 'clientes', targetId);
      await setDoc(clientRef, {
        id: targetId,
        name: client?.name || authUser?.nombre || 'Socio VIP',
        email: client?.email || authUser?.correo || '',
        membershipTier: client?.membershipTier || 'Platino',
        address: fullAddress,
        street: streetInput.trim(),
        interior: interiorInput.trim(),
        colonia: coloniaInput.trim(),
        postalCode: postalCodeInput.trim(),
        cityZone: cityZoneInput.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setIsEditingAddress(false);
      showToast('Dirección Actualizada', 'Tu dirección principal de cobertura se ha guardado exitosamente.', 'success');
    } catch (err: any) {
      console.error('Error saving client address:', err);
      showToast('Error al guardar', err?.message || 'No se pudo actualizar la dirección.', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Error de tamaño', 'La imagen supera el límite de 8MB.', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Formato inválido', 'Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && client?.id) {
        try {
          setClientPhoto(dataUrl);
          // Persist to Firestore directly (100% Secure)
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../../../lib/firebase');
          const clientRef = doc(db, 'clientes', client.id);
          await setDoc(clientRef, {
            id: client.id,
            name: client.name || 'Socio VIP',
            email: client.email || authUser?.correo || '',
            membershipTier: client.membershipTier || 'Platino',
            photo: dataUrl,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          showToast('Foto de Perfil Actualizada', 'Tu fotografía de socio VIP se ha guardado exitosamente en el servidor.', 'success');
        } catch (error) {
          console.error('Error updating photo in Firestore:', error);
          showToast('Error al guardar foto', 'No se pudo guardar la foto en el servidor.', 'error');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const getTierIcon = () => {
    switch (tierInfo.iconType) {
      case 'crown':
        return <Crown className="w-4 h-4 text-[#E6CA65]" />;
      case 'gem':
        return <Gem className="w-4 h-4 text-sky-400" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Shield className="w-4 h-4 text-slate-300" />;
    }
  };

  // Escalafón completo de categorías desde el nivel inicial
  const ALL_TIERS = [
    {
      level: 1,
      name: 'Socio Platino',
      range: '1 a 4 masajes concluidos',
      tag: 'Nivel Inicial',
      icon: Shield,
      color: 'slate',
      perkSummary: 'Acceso a reservas 24/7 y atención estándar de lujo.',
      promoNote: 'Inicia tu camino al bienestar.',
    },
    {
      level: 2,
      name: 'Socio Gold',
      range: '5 a 8 masajes concluidos',
      tag: 'Primer Ascenso',
      icon: Sparkles,
      color: 'amber',
      perkSummary: '10% de descuento automático en tus primeros dos servicios de este nivel (masajes 5 y 6).',
      promoNote: 'Aromaterapia botánica de cortesía.',
    },
    {
      level: 3,
      name: 'Socio Diamante',
      range: '9 a 10 masajes concluidos',
      tag: 'Categoría Élite',
      icon: Gem,
      color: 'sky',
      perkSummary: '15% de descuento automático en los dos servicios del nivel (9 y 10).',
      promoNote: 'Terapeuta preferido reservado.',
    },
    {
      level: 4,
      name: 'Socio Black Diamond',
      range: '11 a 15 masajes concluidos',
      tag: 'Alta Distinción',
      icon: Sparkles,
      color: 'zinc',
      perkSummary: '15% de descuento automático fijo para siempre en todas tus citas.',
      promoNote: 'Concierge ejecutivo 24/7.',
    },
    {
      level: 5,
      name: 'Socio Imperial VIP',
      range: '16 o más masajes concluidos',
      tag: 'Rango Supremo',
      icon: Crown,
      color: 'yellow',
      perkSummary: '20% de descuento automático fijo para siempre en todas tus citas.',
      promoNote: 'Asignación garantizada de terapeuta Master.',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#C9A55B]" />
          <span>Perfil de Usuario VIP</span>
        </h1>
        <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
          Gestión de datos personales, nivel de membresía verificado y preferencias de terapia.
        </p>
      </div>

      {/* Tarjeta Principal de Perfil */}
      <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-6">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <img
                src={clientPhoto}
                alt={displayName}
                className="w-16 h-16 rounded-2xl border-2 border-[#C9A55B] object-cover shadow-lg"
                referrerPolicy="no-referrer"
              />
              <label 
                htmlFor="perfil-photo-input"
                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                title="Cambiar fotografía"
              >
                <Camera className="w-4 h-4 text-[#E6CA65] mb-0.5" />
                <span>Cambiar</span>
              </label>
              <input
                id="perfil-photo-input"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('perfil-photo-input')?.click()}
                className="absolute -bottom-1 -right-1 bg-[#C9A55B] text-black p-1 rounded-full shadow border-2 border-white dark:border-[#141414] hover:bg-[#E6CA65] transition-colors cursor-pointer"
                title="Subir foto"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">{displayName}</h2>
                <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5 ${tierInfo.badgeStyle}`}>
                  {getTierIcon()}
                  <span>{tierInfo.fullLabel}</span>
                </span>
              </div>
              <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
                {displayEmail} • {displayPhone}
              </p>
            </div>
          </div>

          <label
            htmlFor="perfil-photo-input"
            className="px-3.5 py-2 bg-[#FAF8F5] dark:bg-[#1C1C1C] border border-[#C9A55B]/40 hover:border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#C9A55B]/10 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Nueva Foto</span>
          </label>
        </div>

        {/* Estatus Dinámico de Membresía y Masajes */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1C1917] via-[#262016] to-[#171512] text-white border border-[#C9A55B]/40 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E6CA65] flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>Nivel de Membresía Calculado</span>
              </span>
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <span>{tierInfo.fullLabel}</span>
                <span className="text-xs font-sans font-normal text-[#AAAAAA]">(Nivel {tierInfo.level} de 5)</span>
              </h3>
            </div>

            <div className="px-3.5 py-1.5 bg-white/10 rounded-xl border border-white/15 text-xs text-right">
              <span className="text-[11px] text-[#AAAAAA] block">Masajes Pagados y Concluidos:</span>
              <strong className="text-sm font-bold text-[#E6CA65]">{completedCount}</strong>
            </div>
          </div>

          {completedCount === 0 ? (
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-[#E5DFD3] leading-relaxed">
              <p>
                👋 <strong>¡Bienvenido como Socio Nuevo!</strong> Tu categoría inicial es <strong className="text-[#E6CA65]">Socio Platino</strong>. Al solicitar, pagar y concluir tu primer servicio de masaje a domicilio ascenderás inmediatamente a <strong className="text-amber-300">Socio Gold</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#CCCCCC]">
                <span>Progreso hacia {tierInfo.nextTier || 'Nivel Máximo'}</span>
                {tierInfo.nextTier && (
                  <span className="text-[#E6CA65] font-semibold">
                    {tierInfo.neededForNext} {tierInfo.neededForNext === 1 ? 'masaje restante' : 'masajes restantes'}
                  </span>
                )}
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#C9A55B] to-[#E6CA65] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(8, tierInfo.progressPercent))}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#CCCCCC]">
              {tierInfo.perk}
            </span>
            <span className="text-[11px] font-semibold text-[#E6CA65]">
              {completedCount >= 5 ? '✅ Beneficio de Socio Activo: Descuento Automático' : '🔒 Requiere Socio Gold (5+ masajes) para descuentos'}
            </span>
          </div>
        </div>

        {/* Escalafón de Categorías VIP Completo desde el Nivel Inicial */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#C9A55B]" />
                <span>Escalafón de Categorías VIP</span>
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#888888]">
                Progreso acumulado basado estrictamente en masajes concluidos y pagados.
              </p>
            </div>
            <div className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] text-[#806020] dark:text-[#C9A55B] self-start sm:self-auto">
              Total acumulado: {completedCount} {completedCount === 1 ? 'masaje' : 'masajes'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ALL_TIERS.map((tier) => {
              const isCurrent = tier.level === tierInfo.level;
              const isPassed = tier.level < tierInfo.level;
              const isLocked = tier.level > tierInfo.level;
              const TierIcon = tier.icon;

              return (
                <div
                  key={tier.level}
                  className={`relative p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-b from-[#FAF6ED] to-white dark:from-[#201D17] dark:to-[#171512] border-[#C9A55B] shadow-md shadow-[#C9A55B]/15 ring-2 ring-[#C9A55B]/40'
                      : isPassed
                      ? 'bg-[#FAF8F5]/60 dark:bg-[#161616] border-emerald-500/30 dark:border-emerald-500/20 opacity-85'
                      : 'bg-[#FAF8F5]/40 dark:bg-[#141414] border-[#E5DFD3] dark:border-[#262626] opacity-65'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        tier.level === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' :
                        tier.level === 2 ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400' :
                        tier.level === 3 ? 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300' :
                        tier.level === 4 ? 'bg-zinc-900 text-amber-400' :
                        'bg-rose-950 text-amber-300'
                      }`}>
                        <TierIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-xs text-[#1C1917] dark:text-white">
                          {tier.name}
                        </h4>
                        <span className="text-[10px] text-[#6B655F] dark:text-[#AAAAAA] block">
                          Nivel {tier.level} • {tier.tag}
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#C9A55B] text-black shrink-0">
                        Nivel Actual
                      </span>
                    )}
                    {isPassed && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 shrink-0">
                        Superado
                      </span>
                    )}
                    {isLocked && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold text-[#888888] bg-black/5 dark:bg-white/5 shrink-0 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Bloqueado</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#E5DFD3]/60 dark:border-[#262626] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-[#6B655F] dark:text-[#AAAAAA]">
                      <span>Requisito:</span>
                      <strong className="text-[#1C1917] dark:text-white">{tier.range}</strong>
                    </div>

                    <p className="text-[#6B655F] dark:text-[#888888] leading-tight text-[11px]">
                      {tier.perkSummary}
                    </p>

                    <div className="pt-1 text-[10px] font-medium text-[#806020] dark:text-[#D4AF37]">
                      {tier.promoNote}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#1C1917] dark:text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#C9A55B]" />
                <span>Dirección Principal de Cobertura</span>
              </h3>
              {!isEditingAddress ? (
                <button
                  type="button"
                  onClick={() => {
                    setStreetInput(client?.street || '');
                    setInteriorInput(client?.interior || '');
                    setColoniaInput(client?.colonia || '');
                    setPostalCodeInput(client?.postalCode || '');
                    setCityZoneInput(client?.cityZone || 'Polanco / Lomas CDMX');
                    setIsEditingAddress(true);
                  }}
                  className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] hover:underline cursor-pointer"
                >
                  Editar Dirección
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="text-xs text-[#6B655F] dark:text-[#AAAAAA] hover:underline cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

            {!isEditingAddress ? (
              <div className="p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-xl border border-[#E5DFD3] dark:border-[#262626]">
                <p className="font-semibold text-[#1C1917] dark:text-white">{client?.address || 'Av. Paseo de las Palmas 735, Polanco'}</p>
                <p className="text-[#6B655F] dark:text-[#888888] mt-0.5">Zona: {client?.cityZone || 'Polanco / Lomas CDMX'}</p>
              </div>
            ) : (
              <form onSubmit={handleSaveAddress} className="p-4 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-2xl border border-[#C9A55B]/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1">
                      Calle y Número *
                    </label>
                    <input
                      type="text"
                      value={streetInput}
                      onChange={(e) => setStreetInput(e.target.value)}
                      placeholder="Ej. Av. Campos Elíseos 204"
                      className="w-full bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1">
                      Núm. Interior / Depto / Torre
                    </label>
                    <input
                      type="text"
                      value={interiorInput}
                      onChange={(e) => setInteriorInput(e.target.value)}
                      placeholder="Ej. Torre A, Int. 502"
                      className="w-full bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1">
                      Colonia / Fraccionamiento *
                    </label>
                    <input
                      type="text"
                      value={coloniaInput}
                      onChange={(e) => setColoniaInput(e.target.value)}
                      placeholder="Ej. Polanco V Sección"
                      className="w-full bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1">
                      Código Postal (C.P.) *
                    </label>
                    <input
                      type="text"
                      value={postalCodeInput}
                      onChange={(e) => setPostalCodeInput(e.target.value)}
                      placeholder="Ej. 11560"
                      maxLength={5}
                      className="w-full bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1">
                    Zona o Alcaldía / Municipio *
                  </label>
                  <select
                    value={cityZoneInput}
                    onChange={(e) => setCityZoneInput(e.target.value)}
                    className="w-full bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B]"
                  >
                    {COMPREHENSIVE_ZONES.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="px-5 py-2 bg-[#C9A55B] hover:bg-[#E6CA65] text-black font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingAddress ? 'Guardando Dirección...' : 'Guardar Dirección Principal'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-[#1C1917] dark:text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#C9A55B]" />
              <span>Método de Pago Predeterminado</span>
            </h3>
            <div className="p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-xl border border-[#E5DFD3] dark:border-[#262626]">
              <p className="text-[#6B655F] dark:text-[#888888] mt-0.5">Emisión automática de comprobantes de servicio habilitada</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5DFD3] dark:border-[#262626] pt-4 space-y-2">
          <h3 className="font-bold text-xs text-[#1C1917] dark:text-white flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-[#C9A55B]" />
            <span>Notas de Salud y Fisioterapia</span>
          </h3>
          <p className="text-xs text-[#6B655F] dark:text-[#888888] leading-relaxed">
            Preferencia habitual: Presión Firme / Descontracturante con aroma a Ylang Ylang Dorado. Atención especial requerida en zona lumbar y cervicales por actividad ejecutiva intensa.
          </p>
        </div>

        {/* Políticas de Privacidad y Cancelación */}
        <div className="border-t border-[#E5DFD3] dark:border-[#262626] pt-4">
          <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-[#1C1917] dark:text-white">
                  Políticas de Privacidad y Cancelación
                </h4>
                <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA]">
                  Abono en Billetera Virtual o reagendación sin devoluciones en efectivo.
                </p>
              </div>
            </div>
            <LuxuryButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPoliciesModalOpen(true)}
              className="shrink-0"
            >
              Consultar Políticas
            </LuxuryButton>
          </div>
        </div>

        <PushSettingsCard role="client" userId={firebaseUser?.uid || authUser?.uid || client?.id} />
        <NotificationSoundSettings role="client" />
      </div>

      {/* Modal de Políticas para consulta */}
      <ClientPoliciesModal
        isOpen={isPoliciesModalOpen}
        onClose={() => setIsPoliciesModalOpen(false)}
      />
    </div>
  );
};

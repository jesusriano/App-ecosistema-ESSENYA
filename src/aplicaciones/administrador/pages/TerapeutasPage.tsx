import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  UserCheck, Star, MapPin, Award, ShieldCheck, Plus, Search, Filter, 
  KeyRound, ShieldAlert, FileText, CheckCircle2, XCircle, Clock, Eye, 
  Trash2, RefreshCw, AlertTriangle, LogOut, Lock, Edit3, ChevronRight, History
} from 'lucide-react';
import { useTherapistContext } from '../../../shared/context/TherapistContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { TherapistFullProfile, TherapistDocument, DocumentStatus } from '../../../shared/types/auth';

const AVAILABLE_SPECIALTIES = [
  'Masaje Tejido Profundo',
  'Descontracturante VIP',
  'Aromaterapia Real',
  'Masaje Drenaje Linfático',
  'Lomi Lomi Hawaiano',
  'Piedras Volcánicas Calientes',
  'Masaje Tailandés Traditional',
  'Reflexología Holística',
  'Masaje Prenatal VIP'
];

const AVAILABLE_ZONES = [
  'Polanco',
  'Lomas de Chapultepec',
  'Bosques de las Lomas',
  'Santa Fe',
  'Interlomas',
  'Condesa',
  'Roma Norte',
  'San Ángel',
  'Pedregal',
  'Coyoacán'
];

export const TerapeutasPage: React.FC = () => {
  const { 
    therapists, 
    auditLogs, 
    createTherapist, 
    updateTherapist, 
    changeTherapistStatus, 
    resetTherapistPassword, 
    deleteTherapist, 
    reviewDocument 
  } = useTherapistContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendiente' | 'activo' | 'inactivo' | 'bloqueado' | 'rechazado'>('todos');
  const [rejectingTherapistId, setRejectingTherapistId] = useState<string | null>(null);
  const [accountRejectReason, setAccountRejectReason] = useState('');

  // Count pending therapists
  const pendingTherapistsCount = therapists.filter(t => t.estado === 'pendiente').length;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState<TherapistFullProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState<TherapistFullProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<TherapistFullProfile | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showTempPassResult, setShowTempPassResult] = useState<{ name: string; email: string; pass: string } | null>(null);

  // Document Rejection Reason State
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Create Form State
  const [newNombre, setNewNombre] = useState('');
  const [newApellidos, setNewApellidos] = useState('');
  const [newCorreo, setNewCorreo] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEspecialidades, setNewEspecialidades] = useState<string[]>(['Masaje Tejido Profundo']);
  const [newZonas, setNewZonas] = useState<string[]>(['Polanco', 'Lomas de Chapultepec']);
  const [newTempPass, setNewTempPass] = useState(`Essenya${Math.floor(1000 + Math.random() * 9000)}!`);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filter therapists
  const filteredTherapists = therapists.filter(t => {
    const matchesSearch = 
      `${t.nombre} ${t.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.especialidades.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'todos' || t.estado === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Toggle helpers for creation form
  const toggleSpecialty = (spec: string) => {
    if (newEspecialidades.includes(spec)) {
      setNewEspecialidades(newEspecialidades.filter(s => s !== spec));
    } else {
      setNewEspecialidades([...newEspecialidades, spec]);
    }
  };

  const toggleZone = (zone: string) => {
    if (newZonas.includes(zone)) {
      setNewZonas(newZonas.filter(z => z !== zone));
    } else {
      setNewZonas([...newZonas, zone]);
    }
  };

  // Handle Create Submit
  const handleCreateTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await createTherapist({
      nombre: newNombre,
      apellidos: newApellidos,
      correo: newCorreo,
      telefono: newTelefono,
      especialidades: newEspecialidades,
      zonasCobertura: newZonas,
      tempPassword: newTempPass
    });

    setIsSubmitting(false);

    if (res.success && res.tempPassword) {
      setShowCreateModal(false);
      setShowTempPassResult({
        name: `${newNombre} ${newApellidos}`,
        email: newCorreo,
        pass: res.tempPassword
      });
      // Reset form
      setNewNombre('');
      setNewApellidos('');
      setNewCorreo('');
      setNewTelefono('');
      setNewTempPass(`Essenya${Math.floor(1000 + Math.random() * 9000)}!`);
    } else {
      showToast('error', res.error || 'No se pudo crear la cuenta.');
    }
  };

  // Handle Status Toggle
  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'activo' ? 'bloqueado' : 'activo';
    const actionLabel = newStatus === 'activo' ? 'activada' : 'suspendida';

    const res = await changeTherapistStatus(id, newStatus as any, `Acción ejecutada desde el Panel de Control.`);
    if (res.success) {
      showToast('success', `Cuenta de terapeuta ${actionLabel} correctamente.`);
    } else {
      showToast('error', res.error || 'Error al cambiar el estado.');
    }
  };

  // Handle Password Reset
  const handleResetPass = async (t: TherapistFullProfile) => {
    const res = await resetTherapistPassword(t.id);
    if (res.success && res.tempPassword) {
      setShowTempPassResult({
        name: `${t.nombre} ${t.apellidos}`,
        email: t.correo,
        pass: res.tempPassword
      });
    } else {
      showToast('error', res.error || 'Error al restablecer contraseña.');
    }
  };

  // Handle Delete
  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) return;
    const res = await deleteTherapist(showDeleteConfirm.id);
    setShowDeleteConfirm(null);
    if (res.success) {
      showToast('success', 'Cuenta de terapeuta eliminada del sistema.');
    } else {
      showToast('error', res.error || 'Error al eliminar la cuenta.');
    }
  };

  // Handle Document Review
  const handleApproveDoc = async (therapistId: string, docId: string) => {
    const res = await reviewDocument(therapistId, docId, 'aprobado');
    if (res.success) {
      showToast('success', 'Documento aprobado y certificado.');
      if (showDocModal) {
        // Refresh local modal data
        const updated = therapists.find(t => t.id === therapistId);
        if (updated) setShowDocModal({ ...updated });
      }
    }
  };

  const handleRejectDoc = async (therapistId: string, docId: string) => {
    if (!rejectReason.trim()) {
      showToast('error', 'Debes especificar el motivo de rechazo.');
      return;
    }
    const res = await reviewDocument(therapistId, docId, 'rechazado', rejectReason.trim());
    setRejectingDocId(null);
    setRejectReason('');
    if (res.success) {
      showToast('success', 'Documento rechazado con observación enviada.');
      if (showDocModal) {
        const updated = therapists.find(t => t.id === therapistId);
        if (updated) setShowDocModal({ ...updated });
      }
    }
  };

  // Metrics
  const totalCount = therapists.length;
  const activeCount = therapists.filter(t => t.estado === 'activo').length;
  const pendingDocsCount = therapists.reduce((acc, t) => acc + t.documentos.filter(d => d.estado === 'pendiente').length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#262626] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#C9A55B]" />
            <span>Administración Profesional de Terapeutas</span>
          </h1>
          <p className="text-xs text-[#888888] mt-1">
            Gestión de alta centralizada, credenciales temporales, revisión de diplomas y control de accesos.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAuditLogs(true)}
            className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-stone-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-[#C9A55B]" />
            <span className="hidden md:inline">Historial de Auditoría</span>
          </button>

          <LuxuryButton
            variant="gold"
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-4 text-xs font-bold flex items-center space-x-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Cuenta de Terapeuta</span>
          </LuxuryButton>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Total Terapeutas</p>
          <p className="text-2xl font-mono font-bold text-white">{totalCount}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Activas en Radar</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Documentos Pendientes</p>
          <p className="text-2xl font-mono font-bold text-[#C9A55B]">{pendingDocsCount}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Acceso Restringido</p>
          <p className="text-2xl font-mono font-bold text-red-400">
            {therapists.filter(t => t.estado === 'bloqueado').length}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === 'todos' 
                  ? 'bg-[#C9A55B] text-black font-bold' 
                  : 'bg-[#1A1A1A] text-stone-300 hover:text-white border border-[#333333]'
              }`}
            >
              Todas ({therapists.length})
            </button>

            <button
              onClick={() => setFilterStatus('pendiente')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'pendiente' 
                  ? 'bg-[#C9A55B] text-black font-bold' 
                  : 'bg-[#1A1A1A] text-stone-300 hover:text-white border border-[#333333]'
              }`}
            >
              <span>Solicitudes Pendientes</span>
              {pendingTherapistsCount > 0 && (
                <span className="bg-[#806020] text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {pendingTherapistsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterStatus('activo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === 'activo' 
                  ? 'bg-emerald-600 text-white font-bold' 
                  : 'bg-[#1A1A1A] text-stone-300 hover:text-white border border-[#333333]'
              }`}
            >
              Aprobadas / Activas
            </button>

            <button
              onClick={() => setFilterStatus('rechazado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === 'rechazado' 
                  ? 'bg-red-600 text-white font-bold' 
                  : 'bg-[#1A1A1A] text-stone-300 hover:text-white border border-[#333333]'
              }`}
            >
              Rechazadas ({therapists.filter(t => t.estado === 'rechazado').length})
            </button>

            <button
              onClick={() => setFilterStatus('bloqueado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === 'bloqueado' 
                  ? 'bg-amber-600 text-white font-bold' 
                  : 'bg-[#1A1A1A] text-stone-300 hover:text-white border border-[#333333]'
              }`}
            >
              Suspendidas
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#666666]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, CURP..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#1A1A1A] border border-[#333333] text-white placeholder-[#666666] focus:outline-none focus:border-[#C9A55B]"
            />
          </div>
        </div>
      </div>

      {/* Therapists Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTherapists.map((t, index) => {
          const pendingDocs = t.documentos.filter(d => d.estado === 'pendiente').length;
          const isBlocked = t.estado === 'bloqueado';

          return (
            <motion.div 
              key={t.id} 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className={`bg-[#141414] border rounded-2xl p-5 space-y-4 relative transition-all ${
                t.estado === 'pendiente'
                  ? 'border-[#C9A55B] shadow-lg shadow-[#C9A55B]/10 ring-1 ring-[#C9A55B]/30'
                  : isBlocked 
                  ? 'border-red-500/40 opacity-85' 
                  : 'border-[#262626] hover:border-[#C9A55B]/50'
              }`}
            >
              {/* Top Card Bar */}
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <img 
                    src={t.fotografia || undefined} 
                    alt={t.nombre} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#C9A55B]" 
                    referrerPolicy="no-referrer" 
                  />
                  <div>
                    <h3 className="font-serif font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{t.nombre} {t.apellidos}</span>
                    </h3>
                    <span className="text-[10px] text-[#888888] font-mono block">
                      {t.correo}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  t.estado === 'activo'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : t.estado === 'pendiente'
                    ? 'bg-[#C9A55B]/20 text-[#C9A55B] border-[#C9A55B]/50 font-bold'
                    : t.estado === 'inactivo'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {t.estado === 'pendiente' ? 'Pendiente Aprobación' : t.estado}
                </span>
              </div>

              {/* Special Box for Pending Therapists */}
              {t.estado === 'pendiente' && (
                <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#C9A55B]/30 space-y-2 text-xs">
                  <p className="font-bold text-[#C9A55B] flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Expediente de Acreditación Requerido</span>
                  </p>
                  <div className="text-[11px] text-stone-300 space-y-1 font-mono">
                    <p><strong>CURP:</strong> {t.curp || 'No especificado'}</p>
                    <p><strong>INE / Folio:</strong> {t.ineNumber || 'No especificado'}</p>
                    <p><strong>CLABE:</strong> {t.cuentaBancariaCLABE || 'No especificada'}</p>
                  </div>
                </div>
              )}

              {/* Stats & Info */}
              <div className="grid grid-cols-2 gap-2 bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A] text-xs">
                <div>
                  <p className="text-[10px] text-[#888888]">Calificación</p>
                  <p className="text-white font-bold flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 text-[#C9A55B] fill-[#C9A55B]" />
                    <span>{t.puntuacion || 5.0} ({t.resenasCount || 0})</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#888888]">Servicios Completes</p>
                  <p className="text-white font-bold mt-0.5">{t.serviciosCompletados || 0}</p>
                </div>
              </div>

              {/* Specialties */}
              <div className="space-y-1">
                <p className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">Especialidades:</p>
                <div className="flex flex-wrap gap-1">
                  {(t.especialidades || []).slice(0, 3).map((spec, i) => (
                    <span key={i} className="bg-[#1A1A1A] border border-[#333333] text-stone-300 px-2 py-0.5 rounded-md text-[10px]">
                      {spec}
                    </span>
                  ))}
                  {(t.especialidades || []).length > 3 && (
                    <span className="text-[10px] text-[#C9A55B] font-bold px-1">
                      +{(t.especialidades || []).length - 3} más
                    </span>
                  )}
                </div>
              </div>

              {/* Documents Badge Indicator */}
              <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-stone-300">
                  <FileText className="w-3.5 h-3.5 text-[#C9A55B]" />
                  <span>Documentos: <strong className="text-white">{t.documentos?.length || 0}</strong></span>
                </div>

                {pendingDocs > 0 ? (
                  <span className="bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{pendingDocs} por revisar</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verificados
                  </span>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#262626] text-xs">
                {t.estado === 'pendiente' ? (
                  <div>
                    {rejectingTherapistId === t.id ? (
                      <div className="space-y-2 bg-[#1A1A1A] p-3 rounded-2xl border border-red-500/30">
                        <p className="text-[11px] font-bold text-red-400">Especifica el motivo de rechazo:</p>
                        <textarea
                          value={accountRejectReason}
                          onChange={(e) => setAccountRejectReason(e.target.value)}
                          placeholder="Ej. CURP no coincide con INE, documentos ilegibles..."
                          className="w-full bg-[#0D0D0D] border border-red-500/40 rounded-xl p-2 text-xs text-white"
                          rows={2}
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => { setRejectingTherapistId(null); setAccountRejectReason(''); }}
                            className="px-3 py-1 bg-[#262626] text-stone-300 text-xs rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={async () => {
                              const res = await changeTherapistStatus(t.id, 'rechazado', accountRejectReason || 'No cumple criterios de acreditación.');
                              setRejectingTherapistId(null);
                              setAccountRejectReason('');
                              if (res.success) showToast('success', 'Solicitud rechazada.');
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                          >
                            Confirmar Rechazo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={async () => {
                              const res = await changeTherapistStatus(t.id, 'activo', 'Aprobada por Administradora.');
                              if (res.success) showToast('success', '¡Acreditación Aprobada! Terapeuta activada.');
                            }}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-md shadow-emerald-900/30"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Aprobar Solicitud</span>
                          </button>

                          <button
                            onClick={() => setRejectingTherapistId(t.id)}
                            className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Rechazar</span>
                          </button>
                        </div>

                        <button
                          onClick={() => setShowDocModal(t)}
                          className="w-full py-1.5 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-stone-200 font-semibold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>Revisar Documentos & Certificados</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowDocModal(t)}
                      className="w-full py-2 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-stone-200 font-semibold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C9A55B]" />
                      <span>Documentos</span>
                    </button>

                    <button
                      onClick={() => handleStatusChange(t.id, t.estado)}
                      className={`w-full py-2 border font-semibold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                        isBlocked 
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                          : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{isBlocked ? 'Reactivar' : 'Suspender'}</span>
                    </button>

                    <button
                      onClick={() => handleResetPass(t)}
                      title="Restablecer clave temporal"
                      className="w-full py-1.5 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-stone-300 hover:text-[#C9A55B] text-[11px] font-semibold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3 text-[#C9A55B]" />
                      <span>Reset Clave</span>
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(t)}
                      className="w-full py-1.5 bg-[#1A1A1A] hover:bg-red-500/20 border border-[#333333] hover:border-red-500/40 text-stone-300 hover:text-red-400 text-[11px] font-semibold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CREATE THERAPIST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 md:p-8 max-w-xl w-full space-y-6 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-[#262626] pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#C9A55B]" />
                  <span>Alta de Terapeuta Certificada</span>
                </h2>
                <p className="text-xs text-[#888888] mt-1">
                  Generación de credenciales temporales y asignación de perfil profesional.
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-[#888888] hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTherapist} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#888888] uppercase font-bold">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej. Camila"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#888888] uppercase font-bold">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={newApellidos}
                    onChange={(e) => setNewApellidos(e.target.value)}
                    placeholder="Ej. Torres"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#888888] uppercase font-bold">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={newCorreo}
                    onChange={(e) => setNewCorreo(e.target.value)}
                    placeholder="terapeuta@essenya.com"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#888888] uppercase font-bold">Teléfono Móvil *</label>
                  <input
                    type="tel"
                    required
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              {/* Temp Password Generator */}
              <div className="space-y-1 bg-[#1A1A1A] p-3 rounded-2xl border border-[#333333]">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-[#C9A55B] font-bold uppercase tracking-wider">
                    Contraseña Temporal Asignada
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewTempPass(`Essenya${Math.floor(1000 + Math.random() * 9000)}!`)}
                    className="text-[10px] text-[#C9A55B] underline hover:text-white font-mono"
                  >
                    Generar Otra
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={newTempPass}
                  className="w-full bg-[#0D0D0D] border border-[#333333] rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400"
                />
                <p className="text-[10px] text-[#888888]">
                  * Obligatorio cambiar en su primer inicio de sesión.
                </p>
              </div>

              {/* Specialties Select */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#888888] uppercase font-bold">Especialidades</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[#1A1A1A] rounded-xl border border-[#333333]">
                  {AVAILABLE_SPECIALTIES.map(spec => {
                    const isSelected = newEspecialidades.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                          isSelected
                            ? 'bg-[#C9A55B]/20 border-[#C9A55B] text-[#C9A55B]'
                            : 'bg-[#0D0D0D] border-[#333333] text-stone-400 hover:text-white'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Zones Select */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#888888] uppercase font-bold">Zonas de Cobertura</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#1A1A1A] rounded-xl border border-[#333333]">
                  {AVAILABLE_ZONES.map(zone => {
                    const isSelected = newZonas.includes(zone);
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => toggleZone(zone)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-[#0D0D0D] border-[#333333] text-stone-400 hover:text-white'
                        }`}
                      >
                        {zone}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#1A1A1A] border border-[#333333] text-stone-300 text-xs rounded-xl hover:bg-[#262626]"
                >
                  Cancelar
                </button>

                <LuxuryButton
                  type="submit"
                  disabled={isSubmitting}
                  variant="gold"
                  className="py-2 px-5 text-xs font-bold"
                >
                  {isSubmitting ? 'Creando Cuenta...' : 'Registrar y Generar Acceso'}
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESULT MODAL: NEW CREDENTIALS GENERATED */}
      {showTempPassResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#C9A55B] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-white">Credenciales Generadas Exitosamente</h3>
              <p className="text-xs text-[#888888]">
                Proporciona estas credenciales temporales a la terapeuta para su primer ingreso.
              </p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl p-4 text-left space-y-2 font-mono text-xs">
              <p><span className="text-[#888888]">Terapeuta:</span> <strong className="text-white">{showTempPassResult.name}</strong></p>
              <p><span className="text-[#888888]">Correo:</span> <strong className="text-[#C9A55B]">{showTempPassResult.email}</strong></p>
              <p><span className="text-[#888888]">Clave Temp:</span> <strong className="text-emerald-400 bg-black px-2 py-0.5 rounded border border-[#333333]">{showTempPassResult.pass}</strong></p>
            </div>

            <LuxuryButton
              variant="gold"
              onClick={() => setShowTempPassResult(null)}
              className="w-full py-2.5 text-xs font-bold"
            >
              Completado
            </LuxuryButton>
          </div>
        </div>
      )}

      {/* DOCUMENT & APPLICATION EVALUATION MODAL */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#262626] pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C9A55B]" />
                  <span>Evaluación de Solicitud & Expediente</span>
                </h2>
                <p className="text-xs text-[#888888] mt-1">
                  Revisión exhaustiva de credenciales para acreditación ESSENYA.
                </p>
              </div>
              <button 
                onClick={() => setShowDocModal(null)}
                className="text-[#888888] hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Profile Card Header */}
              <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-4">
                  <img 
                    src={showDocModal.fotografia || undefined} 
                    alt={showDocModal.nombre} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A55B]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-serif font-bold text-white">
                          {showDocModal.nombre} {showDocModal.apellidos}
                        </h3>
                        <p className="text-xs text-[#C9A55B] font-mono">{showDocModal.correo}</p>
                        <p className="text-xs text-stone-300 font-mono">{showDocModal.telefono}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        showDocModal.estado === 'activo'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : showDocModal.estado === 'pendiente'
                          ? 'bg-[#C9A55B]/20 text-[#C9A55B] border-[#C9A55B]/50'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {showDocModal.estado === 'pendiente' ? 'Pendiente Aprobación' : showDocModal.estado}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0D0D0D] p-3 rounded-xl border border-[#2A2A2A]">
                  <p><strong className="text-[#888888]">Fecha Registro:</strong> <span className="text-white">{new Date(showDocModal.fechaAlta || Date.now()).toLocaleDateString()}</span></p>
                  <p><strong className="text-[#888888]">Experiencia:</strong> <span className="text-white">{showDocModal.experienciaAnos || 3} años</span></p>
                  <p><strong className="text-[#888888]">CURP:</strong> <span className="text-stone-300">{showDocModal.curp || 'No proporcionado'}</span></p>
                  <p><strong className="text-[#888888]">Folio INE:</strong> <span className="text-stone-300">{showDocModal.ineNumber || 'No proporcionado'}</span></p>
                  <p><strong className="text-[#888888]">CLABE Banco:</strong> <span className="text-stone-300">{showDocModal.cuentaBancariaCLABE || 'No proporcionada'}</span></p>
                  <p><strong className="text-[#888888]">Contacto Emergencia:</strong> <span className="text-stone-300">{showDocModal.contactoEmergencia ? `${showDocModal.contactoEmergencia.nombre} (${showDocModal.contactoEmergencia.telefono})` : 'No registrado'}</span></p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Especialidades Declaradas:</p>
                  <div className="flex flex-wrap gap-1">
                    {(showDocModal.especialidades || []).map((s, idx) => (
                      <span key={idx} className="bg-[#0D0D0D] border border-[#333333] text-stone-200 px-2 py-0.5 rounded text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="text-[10px] text-[#888888] font-bold uppercase tracking-wider pt-1">Zonas de Cobertura:</p>
                  <div className="flex flex-wrap gap-1">
                    {(showDocModal.zonasCobertura || []).map((z, idx) => (
                      <span key={idx} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded text-[10px]">
                        {z}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Documents Title & List */}
              <div className="space-y-3">
                <h4 className="text-xs font-serif font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#C9A55B]" />
                  <span>Documentos de Certificación Adjuntos ({showDocModal.documentos?.length || 0})</span>
                </h4>

                {(!showDocModal.documentos || showDocModal.documentos.length === 0) ? (
                  <div className="text-center py-6 space-y-2 border border-dashed border-[#333333] rounded-2xl p-4">
                    <FileText className="w-6 h-6 text-[#666666] mx-auto" />
                    <p className="text-xs text-[#888888]">La terapeuta aún no ha adjuntado documentos digitales.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {showDocModal.documentos.map(doc => (
                      <div key={doc.id} className="bg-[#1A1A1A] border border-[#333333] rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-serif font-bold text-sm text-white">{doc.nombreDocumento}</h4>
                            <p className="text-[11px] text-[#888888]">
                              Institución: <span className="text-stone-300">{doc.institucion}</span> • Emisión: {doc.fechaEmision}
                            </p>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            doc.estado === 'aprobado'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : doc.estado === 'rechazado'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                          }`}>
                            {doc.estado}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 bg-[#0D0D0D] p-3 rounded-xl border border-[#2A2A2A]">
                          <FileText className="w-5 h-5 text-[#C9A55B] shrink-0" />
                          <div className="flex-1 truncate">
                            <p className="text-xs text-white font-mono truncate">{doc.nombreDocumento}.{doc.fileType}</p>
                            <p className="text-[10px] text-[#888888]">Subido el {new Date(doc.fechaSubida).toLocaleDateString()}</p>
                          </div>
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-stone-200 text-xs font-semibold rounded-lg shrink-0"
                          >
                            Ver Documento
                          </a>
                        </div>

                        {doc.estado === 'rechazado' && doc.motivoRechazo && (
                          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                            <strong>Motivo de rechazo:</strong> {doc.motivoRechazo}
                          </p>
                        )}

                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#2A2A2A]">
                          {rejectingDocId === doc.id ? (
                            <div className="w-full space-y-2">
                              <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Motivo de rechazo de este documento..."
                                className="w-full bg-[#0D0D0D] border border-red-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                rows={2}
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => { setRejectingDocId(null); setRejectReason(''); }}
                                  className="px-3 py-1 bg-[#262626] text-stone-300 text-xs rounded-lg"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleRejectDoc(showDocModal.id, doc.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                                >
                                  Confirmar Rechazo Doc
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {doc.estado !== 'aprobado' && (
                                <button
                                  onClick={() => handleApproveDoc(showDocModal.id, doc.id)}
                                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aprobar Documento</span>
                                </button>
                              )}

                              {doc.estado !== 'rechazado' && (
                                <button
                                  onClick={() => setRejectingDocId(doc.id)}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rechazar Documento</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Global Decision Footer with 3 Actions */}
            <div className="pt-4 border-t border-[#262626] shrink-0 space-y-3">
              <p className="text-[11px] text-[#888888] font-bold uppercase tracking-wider text-center">
                Resolución Final de la Solicitud:
              </p>

              {rejectingTherapistId === showDocModal.id ? (
                <div className="bg-[#1A1A1A] p-3 rounded-2xl border border-red-500/40 space-y-2">
                  <p className="text-xs text-red-400 font-bold">Ingresa el motivo de rechazo de la cuenta:</p>
                  <textarea
                    value={accountRejectReason}
                    onChange={(e) => setAccountRejectReason(e.target.value)}
                    placeholder="Ej. Fotografía de INE no legible, CURP invalida o no cumple con certificaciones requeridas..."
                    className="w-full bg-[#0D0D0D] border border-red-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    rows={2}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => { setRejectingTherapistId(null); setAccountRejectReason(''); }}
                      className="px-3 py-1.5 bg-[#262626] text-stone-300 text-xs rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        const res = await changeTherapistStatus(showDocModal.id, 'rechazado', accountRejectReason || 'No cumple con los estándares de acreditación.');
                        setRejectingTherapistId(null);
                        setAccountRejectReason('');
                        setShowDocModal(null);
                        if (res.success) showToast('success', 'Solicitud rechazada con motivo registrado.');
                      }}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                    >
                      Confirmar Rechazo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={async () => {
                      const res = await changeTherapistStatus(showDocModal.id, 'activo', 'Acreditada y aprobada por la administración.');
                      setShowDocModal(null);
                      if (res.success) showToast('success', '¡Acreditación Aprobada! Terapeuta activada.');
                    }}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-lg shadow-emerald-900/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprobar Solicitud</span>
                  </button>

                  <button
                    onClick={() => setRejectingTherapistId(showDocModal.id)}
                    className="py-2.5 px-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rechazar Solicitud</span>
                  </button>

                  <button
                    onClick={async () => {
                      const res = await changeTherapistStatus(showDocModal.id, 'pendiente', 'Mantenida en revisión pendiente.');
                      setShowDocModal(null);
                      if (res.success) showToast('success', 'Solicitud mantenida en estado PENDIENTE.');
                    }}
                    className="py-2.5 px-3 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-stone-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-[#C9A55B]" />
                    <span>Dejar Pendiente</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-white">¿Eliminar Terapeuta?</h3>
              <p className="text-xs text-[#888888]">
                Estás a punto de borrar la cuenta de <strong className="text-white">{showDeleteConfirm.nombre} {showDeleteConfirm.apellidos}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#333333] text-stone-300 text-xs rounded-xl hover:bg-[#262626]"
              >
                Cancelar
              </button>

              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Sí, Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOGS MODAL */}
      {showAuditLogs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#262626] pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#C9A55B]" />
                  <span>Historial de Auditoría de Terapeutas</span>
                </h2>
                <p className="text-xs text-[#888888] mt-1">
                  Registro inmutable de creación, cambios de estado y revisiones de expediente.
                </p>
              </div>
              <button 
                onClick={() => setShowAuditLogs(false)}
                className="text-[#888888] hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-[#888888] text-center py-8">No hay registros de auditoría aún.</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="bg-[#1A1A1A] border border-[#333333] p-3.5 rounded-2xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#C9A55B]">{log.action}</span>
                      <span className="text-[10px] text-[#888888] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-stone-300">
                      Terapeuta: <strong className="text-white">{log.therapistName}</strong> • Ejecutado por: {log.performedBy}
                    </p>
                    {log.details && (
                      <p className="text-[11px] text-[#888888] font-mono bg-[#0D0D0D] p-2 rounded-xl mt-1 border border-[#2A2A2A]">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

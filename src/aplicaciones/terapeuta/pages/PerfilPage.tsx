import React, { useState } from 'react';
import { 
  User, ShieldCheck, Phone, MapPin, Award, Upload, FileText, 
  CheckCircle2, XCircle, Clock, AlertTriangle, Calendar, Mail, 
  BookOpen, Plus, Save, Edit3, Image as ImageIcon, Eye, Camera
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useTherapistContext } from '../../../shared/context/TherapistContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { TherapistDocument, TherapistFullProfile } from '../../../shared/types/auth';

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

export const PerfilPage: React.FC = () => {
  const { getUser } = useAuth();
  const authUser = getUser('terapeuta');
  const { therapists, updateSelfProfile, uploadDocument } = useTherapistContext();

  // Find active profile or fallback
  const activeTherapist: TherapistFullProfile = therapists.find(t => t.id === authUser?.id || t.correo === authUser?.correo) || {
    id: authUser?.id || 'demo-therapist-123',
    nombre: authUser?.nombre || 'Valeria',
    apellidos: authUser?.apellidos || 'Mendoza',
    correo: authUser?.correo || 'terapeuta@essenya.com',
    telefono: authUser?.telefono || '+52 55 4839 2019',
    fotografia: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    fechaNacimiento: '1990-04-12',
    direccion: 'Campos Elíseos 204, Polanco, CDMX',
    especialidades: ['Masaje Tejido Profundo', 'Descontracturante VIP', 'Aromaterapia Real'],
    experienciaAnos: 8,
    idiomas: ['Español', 'Inglés'],
    disponibilidad: 'Lunes a Sábado, 08:00 - 20:00',
    zonasCobertura: ['Polanco', 'Lomas de Chapultepec', 'Santa Fe'],
    vehiculo: 'Auto Ejecutivo Volvo XC60',
    estado: 'activo',
    mustChangePassword: false,
    puntuacion: 4.95,
    resenasCount: 142,
    serviciosCompletados: 388,
    fechaAlta: new Date().toISOString(),
    ultimoAcceso: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    documentos: [
      {
        id: 'doc-1',
        nombreDocumento: 'Cédula Profesional Terapia Física',
        tipo: 'licencia',
        institucion: 'SEP / Instituto Nacional de Rehabilitación',
        fechaEmision: '2018-06-15',
        fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600',
        fileType: 'jpg',
        estado: 'aprobado',
        fechaSubida: '2025-11-02T10:00:00.000Z'
      }
    ]
  };

  const [activeTab, setActiveTab] = useState<'personal' | 'profesional' | 'documentos'>('personal');
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [nombre, setNombre] = useState(activeTherapist.nombre);
  const [apellidos, setApellidos] = useState(activeTherapist.apellidos);
  const [telefono, setTelefono] = useState(activeTherapist.telefono);
  const [fechaNacimiento, setFechaNacimiento] = useState(activeTherapist.fechaNacimiento || '1990-04-12');
  const [direccion, setDireccion] = useState(activeTherapist.direccion || '');
  const [fotografia, setFotografia] = useState(activeTherapist.fotografia);

  const [experienciaAnos, setExperienciaAnos] = useState(activeTherapist.experienciaAnos || 1);
  const [disponibilidad, setDisponibilidad] = useState(activeTherapist.disponibilidad || 'Lunes a Sábado, 08:00 - 20:00');
  const [idiomasInput, setIdiomasInput] = useState((activeTherapist.idiomas || []).join(', '));
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(activeTherapist.especialidades || []);
  const [selectedZones, setSelectedZones] = useState<string[]>(activeTherapist.zonasCobertura || []);

  // Document Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docNombre, setDocNombre] = useState('');
  const [docTipo, setDocTipo] = useState<'certificado' | 'diploma' | 'constancia' | 'licencia'>('certificado');
  const [docInstitucion, setDocInstitucion] = useState('');
  const [docFechaEmision, setDocFechaEmision] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileType, setDocFileType] = useState<'pdf' | 'jpg' | 'png'>('pdf');

  // Preview Document Modal
  const [previewDoc, setPreviewDoc] = useState<TherapistDocument | null>(null);

  // Feedback Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Toggle helpers
  const toggleSpecialty = (spec: string) => {
    if (selectedSpecialties.includes(spec)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== spec));
    } else {
      setSelectedSpecialties([...selectedSpecialties, spec]);
    }
  };

  const toggleZone = (zone: string) => {
    if (selectedZones.includes(zone)) {
      setSelectedZones(selectedZones.filter(z => z !== zone));
    } else {
      setSelectedZones([...selectedZones, zone]);
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const idiomas = idiomasInput.split(',').map(s => s.trim()).filter(Boolean);

    const res = await updateSelfProfile(activeTherapist.id, {
      nombre,
      apellidos,
      telefono,
      fechaNacimiento,
      direccion,
      fotografia,
      experienciaAnos: Number(experienciaAnos),
      disponibilidad,
      idiomas,
      especialidades: selectedSpecialties,
      zonasCobertura: selectedZones
    });

    if (res.success) {
      setIsEditing(false);
      showToast('success', 'Expediente actualizado correctamente.');
    } else {
      showToast('error', res.error || 'Error al guardar cambios.');
    }
  };

  // Handle Therapist Photo File Upload (From device or camera)
  const handleTherapistPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('error', 'La imagen supera el límite de 8MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Formato no permitido. Solo se aceptan archivos JPG, PNG y WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFotografia(dataUrl);
        // Persist immediately in context & local storage
        localStorage.setItem('essenya_therapist_photo', dataUrl);
        const res = await updateSelfProfile(activeTherapist.id, {
          fotografia: dataUrl
        });
        if (res.success) {
          showToast('success', 'Fotografía de perfil profesional actualizada exitosamente.');
        } else {
          showToast('error', res.error || 'Error al guardar la fotografía.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle File Upload simulation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'El archivo supera el tamaño máximo permitido de 10MB.');
      return;
    }

    const nameLower = file.name.toLowerCase();
    let ext: 'pdf' | 'jpg' | 'png' = 'pdf';
    if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) ext = 'jpg';
    else if (nameLower.endsWith('.png')) ext = 'png';
    else if (!nameLower.endsWith('.pdf')) {
      showToast('error', 'Formato no permitido. Solo se aceptan archivos PDF, JPG y PNG.');
      return;
    }

    setDocFileType(ext);

    // Read file object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setDocFileUrl(objectUrl);
  };

  // Handle Submit Document
  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNombre.trim() || !docInstitucion.trim() || !docFechaEmision) {
      showToast('error', 'Completa el nombre, institución y fecha de emisión.');
      return;
    }

    const finalUrl = docFileUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600';

    const res = await uploadDocument(activeTherapist.id, {
      nombreDocumento: docNombre,
      tipo: docTipo,
      institucion: docInstitucion,
      fechaEmision: docFechaEmision,
      fileUrl: finalUrl,
      fileType: docFileType
    });

    if (res.success) {
      setShowUploadModal(false);
      setDocNombre('');
      setDocInstitucion('');
      setDocFechaEmision('');
      setDocFileUrl('');
      showToast('success', 'Documento subido. Queda en estado PENDIENTE para revisión de la Administradora.');
    } else {
      showToast('error', res.error || 'Error al subir el documento.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-[#C9A55B]" />
            <span>Expediente Profesional de Terapeuta</span>
          </h1>
          <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
            Información personal, especialidades, radio de atención y diplomas validados por ESSENYA.
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-white text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-[#C9A55B]" />
          <span>{isEditing ? 'Cancelar Edición' : 'Editar Expediente'}</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Main Profile Card Header */}
      <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-6">
          <div className="flex items-center space-x-4">
            <div className="relative group cursor-pointer">
              <img
                src={fotografia || activeTherapist.fotografia || undefined}
                alt={activeTherapist.nombre}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A55B] shadow-md"
                referrerPolicy="no-referrer"
              />
              <label
                htmlFor="therapist-header-photo-input"
                className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                title="Cambiar fotografía de perfil"
              >
                <Camera className="w-4 h-4 text-[#E6CA65] mb-0.5" />
                <span>Cambiar</span>
              </label>
              <input
                id="therapist-header-photo-input"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleTherapistPhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('therapist-header-photo-input')?.click()}
                className="absolute -bottom-1 -right-1 bg-[#C9A55B] text-black p-1 rounded-full shadow border-2 border-white dark:border-[#141414] hover:bg-[#E6CA65] transition-colors cursor-pointer"
                title="Subir foto"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">
                  {activeTherapist.nombre} {activeTherapist.apellidos}
                </h2>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verificada ESSENYA</span>
                </span>
              </div>
              <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1 font-mono">
                {activeTherapist.correo} • Tel: {activeTherapist.telefono}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A]">
            <div>
              <p className="text-[10px] text-[#888888]">Calificación</p>
              <p className="font-bold text-[#1C1917] dark:text-white flex items-center gap-1">
                ★ {activeTherapist.puntuacion || 5.0} ({activeTherapist.resenasCount || 0})
              </p>
            </div>
            <div className="border-l border-[#E5DFD3] dark:border-[#333333] pl-3">
              <p className="text-[10px] text-[#888888]">Servicios</p>
              <p className="font-bold text-[#1C1917] dark:text-white">{activeTherapist.serviciosCompletados || 0}</p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex p-1 bg-[#FAF8F5] dark:bg-[#1C1C1C] rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
              activeTab === 'personal'
                ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            Información Personal
          </button>
          <button
            onClick={() => setActiveTab('profesional')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
              activeTab === 'profesional'
                ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            Información Profesional
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center flex items-center justify-center space-x-1.5 ${
              activeTab === 'documentos'
                ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <span>Formación & Certificados</span>
            <span className="bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] text-[10px] px-2 py-0.5 rounded-full font-mono">
              {activeTherapist.documentos?.length || 0}
            </span>
          </button>
        </div>

        {/* TAB 1: INFORMACIÓN PERSONAL */}
        {activeTab === 'personal' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Nombre(s) *</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Apellidos *</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Correo Electrónico (Acceso)</label>
                <input
                  type="email"
                  disabled
                  value={activeTherapist.correo}
                  className="w-full bg-[#E5DFD3]/30 dark:bg-[#0D0D0D] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#888888] font-mono cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Teléfono Móvil *</label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Fecha de Nacimiento</label>
                <input
                  type="date"
                  disabled={!isEditing}
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>

              <div className="space-y-2 md:col-span-2 p-3.5 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#C9A55B]" />
                    <span>Fotografía de Perfil Profesional</span>
                  </label>
                  <span className="text-[10px] text-[#888888]">JPG, PNG, WebP (Máx. 8MB)</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={fotografia || activeTherapist.fotografia || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400'}
                      alt="Vista previa"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C9A55B] shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="form-photo-upload-input"
                        className="px-3.5 py-2 bg-white dark:bg-[#262626] border border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] hover:bg-[#C9A55B]/10 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Seleccionar Foto de tu Dispositivo</span>
                      </label>
                      <input
                        id="form-photo-upload-input"
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        onChange={handleTherapistPhotoUpload}
                        className="hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#888888] shrink-0 font-medium">O ingresa URL:</span>
                      <input
                        type="url"
                        disabled={!isEditing}
                        value={fotografia}
                        onChange={(e) => setFotografia(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-2.5 py-1.5 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Dirección Particular</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, Número, Colonia, Alcaldía, C.P."
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end pt-2">
                <LuxuryButton type="submit" variant="gold" className="py-2.5 px-6 text-xs font-bold">
                  Guardar Cambios Personales
                </LuxuryButton>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: INFORMACIÓN PROFESIONAL */}
        {activeTab === 'profesional' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Años de Experiencia Comprobables</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  disabled={!isEditing}
                  value={experienciaAnos}
                  onChange={(e) => setExperienciaAnos(Number(e.target.value))}
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Idiomas de Atención (separados por coma)</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={idiomasInput}
                  onChange={(e) => setIdiomasInput(e.target.value)}
                  placeholder="Español, Inglés, Francés..."
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Horario de Disponibilidad</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={disponibilidad}
                  onChange={(e) => setDisponibilidad(e.target.value)}
                  placeholder="Ej. Lunes a Sábado, 08:00 - 20:00"
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] disabled:opacity-80"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Especialidades Certificadas</label>
                <div className="flex flex-wrap gap-2 p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-2xl border border-[#E5DFD3] dark:border-[#333333]">
                  {AVAILABLE_SPECIALTIES.map(spec => {
                    const isSelected = selectedSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-[#C9A55B]/20 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B]'
                            : 'bg-white dark:bg-[#0D0D0D] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-[#6B655F] dark:text-[#888888] uppercase">Zonas Habilitadas para Servicio</label>
                <div className="flex flex-wrap gap-2 p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-2xl border border-[#E5DFD3] dark:border-[#333333]">
                  {AVAILABLE_ZONES.map(zone => {
                    const isSelected = selectedZones.includes(zone);
                    return (
                      <button
                        key={zone}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => toggleZone(zone)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                            : 'bg-white dark:bg-[#0D0D0D] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        {zone}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end pt-2">
                <LuxuryButton type="submit" variant="gold" className="py-2.5 px-6 text-xs font-bold">
                  Guardar Perfil Profesional
                </LuxuryButton>
              </div>
            )}
          </form>
        )}

        {/* TAB 3: FORMACIÓN Y CERTIFICADOS */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">
                  Mis Certificados, Diplomas y Licencias
                </h3>
                <p className="text-xs text-[#6B655F] dark:text-[#888888]">
                  Carga tus documentos oficiales para verificación por parte de la Administradora.
                </p>
              </div>

              <LuxuryButton
                variant="gold"
                onClick={() => setShowUploadModal(true)}
                className="py-2 px-4 text-xs font-bold flex items-center space-x-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Cargar Documento</span>
              </LuxuryButton>
            </div>

            {/* Documents Grid / List */}
            {(!activeTherapist.documentos || activeTherapist.documentos.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed border-[#E5DFD3] dark:border-[#333333] rounded-3xl p-6 space-y-2">
                <FileText className="w-10 h-10 text-[#A8A29E] mx-auto" />
                <h4 className="font-bold text-sm text-[#1C1917] dark:text-white">Sin Documentos Registrados</h4>
                <p className="text-xs text-[#6B655F] dark:text-[#888888]">
                  Aún no has cargado certificados o diplomas. Haz clic en "Cargar Documento" para agregar tu formación.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTherapist.documentos.map((doc) => (
                  <div key={doc.id} className="bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#1C1917] dark:text-white">{doc.nombreDocumento}</h4>
                        <p className="text-[11px] text-[#6B655F] dark:text-[#888888]">
                          {doc.institucion} • Emisión: {doc.fechaEmision}
                        </p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        doc.estado === 'aprobado'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : doc.estado === 'rechazado'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                      }`}>
                        {doc.estado}
                      </span>
                    </div>

                    {/* Rejection observation banner */}
                    {doc.estado === 'rechazado' && doc.motivoRechazo && (
                      <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-xs text-red-600 dark:text-red-400">
                        <p className="font-bold">Observación de Administradora:</p>
                        <p>{doc.motivoRechazo}</p>
                      </div>
                    )}

                    {/* View Document Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E5DFD3] dark:border-[#262626] text-xs">
                      <span className="text-[10px] text-[#888888] font-mono uppercase">
                        Formato: {doc.fileType.toUpperCase()}
                      </span>

                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="px-3 py-1 rounded-xl bg-white dark:bg-[#0D0D0D] border border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-white font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C9A55B]" />
                        <span>Vista Previa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#C9A55B]" />
                <span>Cargar Certificado o Diploma</span>
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-[#888888] hover:text-black dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadDocumentSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Nombre del Documento *</label>
                <input
                  type="text"
                  required
                  value={docNombre}
                  onChange={(e) => setDocNombre(e.target.value)}
                  placeholder="Ej. Cédula Profesional en Fisioterapia"
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Tipo *</label>
                  <select
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value as any)}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  >
                    <option value="certificado">Certificado</option>
                    <option value="diploma">Diploma</option>
                    <option value="constancia">Constancia</option>
                    <option value="licencia">Licencia / Cédula</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Fecha Emisión *</label>
                  <input
                    type="date"
                    required
                    value={docFechaEmision}
                    onChange={(e) => setDocFechaEmision(e.target.value)}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Institución Emisora *</label>
                <input
                  type="text"
                  required
                  value={docInstitucion}
                  onChange={(e) => setDocInstitucion(e.target.value)}
                  placeholder="Ej. SEP / Universidad Nacional"
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              {/* File Selector */}
              <div className="space-y-1">
                <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Seleccionar Archivo (PDF, JPG, PNG) *</label>
                <div className="border-2 border-dashed border-[#E5DFD3] dark:border-[#333333] rounded-2xl p-4 text-center hover:border-[#C9A55B] transition-all bg-[#FAF8F5] dark:bg-[#1A1A1A]">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="docFileInput"
                  />
                  <label htmlFor="docFileInput" className="cursor-pointer space-y-1 block">
                    <Upload className="w-6 h-6 text-[#C9A55B] mx-auto" />
                    <p className="font-bold text-xs text-[#1C1917] dark:text-white">Haz clic para examinar tus archivos</p>
                    <p className="text-[10px] text-[#888888]">Formatos permitidos: PDF, JPG, PNG (Máx 10MB)</p>
                  </label>
                </div>
              </div>

              {docFileUrl && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold text-center">
                  ✓ Archivo adjuntado correctamente ({docFileType.toUpperCase()})
                </p>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-white text-xs rounded-xl"
                >
                  Cancelar
                </button>

                <LuxuryButton type="submit" variant="gold" className="py-2 px-5 text-xs font-bold">
                  Subir para Revisión
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW DOCUMENT MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#C9A55B] rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">
                  {previewDoc.nombreDocumento}
                </h3>
                <p className="text-xs text-[#888888]">{previewDoc.institucion} • {previewDoc.fechaEmision}</p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="text-[#888888] hover:text-black dark:hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-black rounded-2xl p-2 min-h-64 flex items-center justify-center overflow-hidden">
              {previewDoc.fileType === 'pdf' ? (
                <iframe src={previewDoc.fileUrl || undefined} className="w-full h-80 rounded-xl" title="Vista Previa PDF" />
              ) : (
                <img src={previewDoc.fileUrl || undefined} alt={previewDoc.nombreDocumento} className="max-h-80 object-contain rounded-xl mx-auto" />
              )}
            </div>

            <div className="flex justify-end">
              <LuxuryButton variant="gold" onClick={() => setPreviewDoc(null)} className="py-2 px-5 text-xs font-bold">
                Cerrar Vista Previa
              </LuxuryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

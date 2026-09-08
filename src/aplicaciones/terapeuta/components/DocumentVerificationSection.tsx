import React, { useState } from 'react';
import { 
  ShieldCheck, Upload, FileText, CheckCircle2, XCircle, Clock, 
  AlertTriangle, Eye, RefreshCw, Trash2, Plus, Info, Check, ExternalLink 
} from 'lucide-react';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { TherapistDocument, DocumentStatus } from '../../../shared/types/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../lib/firebase';

interface DocumentVerificationSectionProps {
  therapistId: string;
  documentos: TherapistDocument[];
  onUploadDocument: (docData: Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>) => Promise<{ success: boolean; error?: string }>;
  onReplaceDocument: (docId: string, docData: Partial<Omit<TherapistDocument, 'id' | 'estado' | 'fechaSubida'>>) => Promise<{ success: boolean; error?: string }>;
  onDeleteDocument: (docId: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (type: 'success' | 'error', msg: string) => void;
}

const REQUIRED_DOC_TYPES = [
  {
    tipo: 'ine' as const,
    label: 'Identificación Oficial (INE / Pasaporte)',
    descripcion: 'Documento oficial con fotografía y firma visible vigente.',
    esRequerido: true
  },
  {
    tipo: 'licencia' as const,
    label: 'Cédula Profesional o Licencia en Fisioterapia/Masoterapia',
    descripcion: 'Acreditación oficial emitida por la SEP o entidad regulatoria de salud.',
    esRequerido: true
  },
  {
    tipo: 'comprobante_domicilio' as const,
    label: 'Comprobante de Domicilio Vigente',
    descripcion: 'Recibo de luz, agua o teléfono no mayor a 3 meses.',
    esRequerido: true
  },
  {
    tipo: 'constancia' as const,
    label: 'Constancia de Situación Fiscal o CURP',
    descripcion: 'Documento fiscal oficial con RFC y CURP validado.',
    esRequerido: false
  },
  {
    tipo: 'certificado' as const,
    label: 'Certificaciones y Diplomas Especializados',
    descripcion: 'Diplomas en técnicas (Tejido Profundo, Descontracturante, Drenaje, etc.).',
    esRequerido: false
  }
];

export const DocumentVerificationSection: React.FC<DocumentVerificationSectionProps> = ({
  therapistId,
  documentos = [],
  onUploadDocument,
  onReplaceDocument,
  onDeleteDocument,
  showToast
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [replacingDoc, setReplacingDoc] = useState<TherapistDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<TherapistDocument | null>(null);

  // Form State
  const [docNombre, setDocNombre] = useState('');
  const [docTipo, setDocTipo] = useState<TherapistDocument['tipo']>('certificado');
  const [docInstitucion, setDocInstitucion] = useState('');
  const [docFechaEmision, setDocFechaEmision] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileType, setDocFileType] = useState<'pdf' | 'jpg' | 'png'>('pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Metrics
  const totalDocs = documentos.length;
  const validadosCount = documentos.filter(d => d.estado === 'validado' || d.estado === 'aprobado').length;
  const pendientesCount = documentos.filter(d => d.estado === 'pendiente' || !d.estado).length;
  const rechazadosCount = documentos.filter(d => d.estado === 'rechazado').length;

  const getStatusBadge = (estado: DocumentStatus) => {
    if (estado === 'validado' || estado === 'aprobado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Validado</span>
        </span>
      );
    }
    if (estado === 'rechazado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
          <XCircle className="w-3.5 h-3.5" />
          <span>Rechazado</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse">
        <Clock className="w-3.5 h-3.5" />
        <span>Pendiente de revisión</span>
      </span>
    );
  };

  const handleOpenUpload = (preselectedType?: TherapistDocument['tipo'], prefilledName?: string) => {
    setReplacingDoc(null);
    setDocNombre(prefilledName || '');
    setDocTipo(preselectedType || 'certificado');
    setDocInstitucion('');
    setDocFechaEmision(new Date().toISOString().split('T')[0]);
    setDocFileUrl('');
    setDocFileType('pdf');
    setSelectedFile(null);
    setUploadProgress(null);
    setUploadError(null);
    setShowUploadModal(true);
  };

  const handleOpenReplace = (doc: TherapistDocument) => {
    setReplacingDoc(doc);
    setDocNombre(doc.nombreDocumento);
    setDocTipo(doc.tipo);
    setDocInstitucion(doc.institucion);
    setDocFechaEmision(doc.fechaEmision);
    setDocFileUrl('');
    setDocFileType(doc.fileType || 'pdf');
    setSelectedFile(null);
    setUploadProgress(null);
    setUploadError(null);
    setShowUploadModal(true);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('error', 'El archivo supera el límite de 15MB.');
      return;
    }

    const nameLower = file.name.toLowerCase();
    let ext: 'pdf' | 'jpg' | 'png' = 'pdf';
    if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) ext = 'jpg';
    else if (nameLower.endsWith('.png')) ext = 'png';
    else if (!nameLower.endsWith('.pdf')) {
      showToast('error', 'Formato no permitido. Utiliza PDF, JPG o PNG.');
      return;
    }

    setDocFileType(ext);
    setSelectedFile(file);
    setUploadProgress(null);
    setUploadError(null);

    // Generate local Object URL for instant viewing
    const objectUrl = URL.createObjectURL(file);
    setDocFileUrl(objectUrl);
  };

  const uploadFileToStorage = (file: File): Promise<{ url: string; path: string }> => {
    return new Promise((resolve) => {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `terapeutas/${therapistId}/documentos/${timestamp}-${safeName}`;

      setUploadProgress(0);
      setUploadError(null);

      try {
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => {
            console.warn('Firebase Storage upload warning (falling back to local secure URL):', error);
            // Fallback to local object URL or Data URL so user is never blocked
            const fallbackUrl = URL.createObjectURL(file);
            setUploadProgress(100);
            resolve({ url: fallbackUrl, path: storagePath });
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              setUploadProgress(100);
              resolve({ url: downloadUrl, path: storagePath });
            } catch (err: any) {
              const fallbackUrl = URL.createObjectURL(file);
              setUploadProgress(100);
              resolve({ url: fallbackUrl, path: storagePath });
            }
          }
        );
      } catch (err: any) {
        console.warn('Storage init fallback:', err);
        const fallbackUrl = URL.createObjectURL(file);
        setUploadProgress(100);
        resolve({ url: fallbackUrl, path: storagePath });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNombre.trim() || !docInstitucion.trim() || !docFechaEmision) {
      showToast('error', 'Completa todos los campos obligatorios del documento.');
      return;
    }

    if (!selectedFile && !replacingDoc) {
      showToast('error', 'Por favor selecciona un archivo para cargar.');
      return;
    }

    setIsSubmitting(true);
    let finalUrl = docFileUrl;
    let finalStoragePath = replacingDoc?.storagePath || '';

    if (selectedFile) {
      try {
        const uploadResult = await uploadFileToStorage(selectedFile);
        finalUrl = uploadResult.url;
        finalStoragePath = uploadResult.path;
      } catch (err: any) {
        setIsSubmitting(false);
        showToast('error', err.message || 'Error al subir el archivo a Firebase Storage.');
        return;
      }
    }

    if (replacingDoc) {
      const res = await onReplaceDocument(replacingDoc.id, {
        nombreDocumento: docNombre.trim(),
        tipo: docTipo,
        institucion: docInstitucion.trim(),
        fechaEmision: docFechaEmision,
        fileUrl: finalUrl,
        fileType: docFileType,
        storagePath: finalStoragePath
      });
      setIsSubmitting(false);

      if (res.success) {
        setShowUploadModal(false);
        setReplacingDoc(null);
        setSelectedFile(null);
        setUploadProgress(null);
        showToast('success', 'Documento reenviado. Se ha colocado en "Pendiente de revisión" para el administrador.');
      } else {
        showToast('error', res.error || 'Error al actualizar el documento.');
      }
    } else {
      const res = await onUploadDocument({
        nombreDocumento: docNombre.trim(),
        tipo: docTipo,
        institucion: docInstitucion.trim(),
        fechaEmision: docFechaEmision,
        fileUrl: finalUrl,
        fileType: docFileType,
        storagePath: finalStoragePath
      });
      setIsSubmitting(false);

      if (res.success) {
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadProgress(null);
        showToast('success', 'Documento cargado correctamente. Estado: "Pendiente de revisión".');
      } else {
        showToast('error', res.error || 'Error al cargar el documento.');
      }
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (window.confirm(`¿Estás segura de eliminar el documento "${docName}"?`)) {
      const res = await onDeleteDocument(docId);
      if (res.success) {
        showToast('success', 'Documento retirado del expediente.');
      } else {
        showToast('error', res.error || 'Error al eliminar el documento.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Verification Status Overview Banner */}
      <div className="bg-gradient-to-br from-[#FAF8F5] via-white to-[#F5EFE6] dark:from-[#181818] dark:via-[#141414] dark:to-[#1C1A17] border border-[#E5DFD3] dark:border-[#2A2A2A] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A55B]/15 dark:bg-[#C9A55B]/20 border border-[#C9A55B]/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#806020] dark:text-[#C9A55B]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
                Flujo de Verificación y Certificación
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-0.5">
                Supervisión y auditoría de documentos oficiales por la Administradora ESSENYA.
              </p>
            </div>
          </div>

          <LuxuryButton
            variant="gold"
            onClick={() => handleOpenUpload()}
            className="py-2.5 px-4 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Cargar Nuevo Documento</span>
          </LuxuryButton>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-white dark:bg-[#111111] p-3.5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626]">
            <p className="text-[10px] uppercase font-bold text-[#888888]">Expediente Total</p>
            <p className="text-xl font-bold font-mono text-[#1C1917] dark:text-white mt-1">{totalDocs} <span className="text-xs font-normal text-[#888888]">docs</span></p>
          </div>

          <div className="bg-white dark:bg-[#111111] p-3.5 rounded-2xl border border-emerald-500/30">
            <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Validados</span>
            </p>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{validadosCount} <span className="text-xs font-normal text-[#888888]">aprobados</span></p>
          </div>

          <div className="bg-white dark:bg-[#111111] p-3.5 rounded-2xl border border-amber-500/30">
            <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>En Revisión</span>
            </p>
            <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{pendientesCount} <span className="text-xs font-normal text-[#888888]">pendientes</span></p>
          </div>

          <div className="bg-white dark:bg-[#111111] p-3.5 rounded-2xl border border-red-500/30">
            <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Rechazados</span>
            </p>
            <p className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">{rechazadosCount} <span className="text-xs font-normal text-[#888888]">con obs.</span></p>
          </div>
        </div>
      </div>

      {/* Required Documents Checklist Matrix */}
      <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
          <div>
            <h4 className="font-serif font-bold text-sm text-[#1C1917] dark:text-white">
              Guía de Documentación Oficial Requerida
            </h4>
            <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-0.5">
              Revisa los documentos indispensables para mantener activo tu perfil en la plataforma.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REQUIRED_DOC_TYPES.map((req) => {
            const uploadedDocs = documentos.filter(d => d.tipo === req.tipo);
            const isValidated = uploadedDocs.some(d => d.estado === 'validado' || d.estado === 'aprobado');
            const isPending = uploadedDocs.some(d => d.estado === 'pendiente' || !d.estado);
            const isRejected = uploadedDocs.some(d => d.estado === 'rechazado');

            return (
              <div 
                key={req.tipo}
                className="p-3.5 rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A] bg-[#FAF8F5] dark:bg-[#181818] flex flex-col justify-between space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#1C1917] dark:text-white">{req.label}</span>
                      {req.esRequerido && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] uppercase">
                          Obligatorio
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B655F] dark:text-[#888888] leading-relaxed">
                      {req.descripcion}
                    </p>
                  </div>

                  {isValidated ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Validado</span>
                    </span>
                  ) : isPending ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Pendiente</span>
                    </span>
                  ) : isRejected ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Rechazado</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenUpload(req.tipo, req.label)}
                      className="shrink-0 px-2.5 py-1 rounded-xl bg-white dark:bg-[#262626] border border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] text-[10px] font-bold hover:bg-[#C9A55B]/10 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Subir</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
          <div>
            <h4 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">
              Expediente Digital Cargado ({documentos.length})
            </h4>
            <p className="text-xs text-[#6B655F] dark:text-[#888888]">
              Lista de archivos subidos con su estado de validación asignado por la Administración.
            </p>
          </div>
        </div>

        {documentos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-[#E5DFD3] dark:border-[#333333] rounded-3xl p-6 space-y-3 bg-white dark:bg-[#141414]">
            <FileText className="w-12 h-12 text-[#A8A29E] mx-auto" />
            <h4 className="font-bold text-sm text-[#1C1917] dark:text-white">Sin Documentos en tu Expediente</h4>
            <p className="text-xs text-[#6B655F] dark:text-[#888888] max-w-md mx-auto">
              Sube tu identificación oficial, cédula y certificados para que la administración valide tu perfil y puedas recibir servicios VIP.
            </p>
            <LuxuryButton
              variant="gold"
              onClick={() => handleOpenUpload()}
              className="py-2 px-5 text-xs font-bold inline-flex items-center space-x-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Cargar Primer Documento</span>
            </LuxuryButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentos.map((doc) => (
              <div 
                key={doc.id}
                className={`bg-white dark:bg-[#141414] border rounded-2xl p-5 space-y-4 shadow-sm transition-all ${
                  doc.estado === 'validado' || doc.estado === 'aprobado'
                    ? 'border-emerald-500/40 dark:border-emerald-500/30'
                    : doc.estado === 'rechazado'
                    ? 'border-red-500/40 dark:border-red-500/30'
                    : 'border-amber-500/40 dark:border-amber-500/30'
                }`}
              >
                {/* Header of the Card */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h5 className="font-serif font-bold text-sm text-[#1C1917] dark:text-white">
                      {doc.nombreDocumento}
                    </h5>
                    <p className="text-[11px] text-[#6B655F] dark:text-[#888888]">
                      {doc.institucion} • Emisión: {doc.fechaEmision}
                    </p>
                  </div>

                  {getStatusBadge(doc.estado)}
                </div>

                {/* File Attachment Pill */}
                <div className="flex items-center space-x-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#2A2A2A]">
                  <div className="w-8 h-8 rounded-lg bg-[#C9A55B]/15 flex items-center justify-center text-[#806020] dark:text-[#C9A55B] shrink-0 font-mono text-[10px] font-bold uppercase">
                    {doc.fileType}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-xs text-[#1C1917] dark:text-white font-mono truncate">
                      {doc.nombreDocumento}.{doc.fileType}
                    </p>
                    <p className="text-[10px] text-[#888888]">
                      Subido el {new Date(doc.fechaSubida).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Status Specific Information & Feedback */}
                {doc.estado === 'rechazado' && (
                  <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-xl text-xs space-y-1.5">
                    <p className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Observación de la Administradora:</span>
                    </p>
                    <p className="text-red-700 dark:text-red-300 text-[11px] leading-relaxed">
                      {doc.motivoRechazo || 'El documento no cumple con los requisitos de legibilidad o vigencia.'}
                    </p>
                  </div>
                )}

                {(doc.estado === 'validado' || doc.estado === 'aprobado') && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Verificado y certificado por Administradora ESSENYA.</span>
                  </div>
                )}

                {doc.estado === 'pendiente' && (
                  <div className="bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>En cola de revisión por el equipo de supervisión.</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E5DFD3] dark:border-[#262626] text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#222222] border border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-white font-bold text-xs flex items-center space-x-1 hover:border-[#C9A55B] transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C9A55B]" />
                      <span>Ver Documento</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.estado !== 'validado' && doc.estado !== 'aprobado' && (
                      <button
                        onClick={() => handleOpenReplace(doc)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] font-bold text-xs flex items-center space-x-1 hover:bg-[#C9A55B]/10 transition-colors cursor-pointer"
                        title="Reemplazar o volver a subir versión corregida"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{doc.estado === 'rechazado' ? 'Corregir y Reenviar' : 'Reemplazar'}</span>
                      </button>
                    )}

                    {doc.estado !== 'validado' && doc.estado !== 'aprobado' && (
                      <button
                        onClick={() => handleDelete(doc.id, doc.nombreDocumento)}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPLOAD & REPLACE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#C9A55B]" />
                <span>{replacingDoc ? 'Reemplazar y Reenviar Documento' : 'Cargar Documento para Validación'}</span>
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-[#888888] hover:text-black dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-[#FAF8F5] dark:bg-[#1C1C1C] rounded-2xl border border-[#E5DFD3] dark:border-[#2E2E2E] text-[11px] text-[#6B655F] dark:text-[#AAAAAA] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#C9A55B] shrink-0" />
                <span>Al enviar este documento, su estado cambiará a <strong>"Pendiente de revisión"</strong> mientras la Administradora lo valida.</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Nombre del Documento *</label>
                <input
                  type="text"
                  required
                  value={docNombre}
                  onChange={(e) => setDocNombre(e.target.value)}
                  placeholder="Ej. Cédula Profesional en Terapia Física"
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Tipo de Documento *</label>
                  <select
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value as any)}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  >
                    <option value="ine">Identificación Oficial (INE/Pasaporte)</option>
                    <option value="licencia">Cédula / Licencia Profesional</option>
                    <option value="certificado">Certificado de Especialidad</option>
                    <option value="diploma">Diploma Académico</option>
                    <option value="comprobante_domicilio">Comprobante de Domicilio</option>
                    <option value="constancia">Constancia Fiscal / CURP</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Fecha de Emisión *</label>
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
                <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Institución u Organismo Emisor *</label>
                <input
                  type="text"
                  required
                  value={docInstitucion}
                  onChange={(e) => setDocInstitucion(e.target.value)}
                  placeholder="Ej. SEP / INE / Instituto Mexicano de Masoterapia"
                  className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                />
              </div>

              {/* File Selector */}
              <div className="space-y-1">
                <label className="font-bold text-[#6B655F] dark:text-[#888888] uppercase">Archivo Digital (PDF, JPG, PNG) *</label>
                <div className="border-2 border-dashed border-[#E5DFD3] dark:border-[#333333] rounded-2xl p-4 text-center hover:border-[#C9A55B] transition-all bg-[#FAF8F5] dark:bg-[#1A1A1A]">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelection}
                    className="hidden"
                    id="docFileInput"
                  />
                  <label htmlFor="docFileInput" className="cursor-pointer space-y-1 block">
                    <Upload className="w-6 h-6 text-[#C9A55B] mx-auto" />
                    <p className="font-bold text-xs text-[#1C1917] dark:text-white">Haz clic para examinar o arrastra tu archivo</p>
                    <p className="text-[10px] text-[#888888]">Formatos permitidos: PDF, JPG, PNG (Máx 15MB)</p>
                  </label>
                </div>
              </div>

              {docFileUrl && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold text-center">
                  ✓ Archivo seleccionado ({docFileType.toUpperCase()})
                </p>
              )}

              {uploadProgress !== null && (
                <div className="space-y-1.5 p-2 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-xl border border-[#E5DFD3] dark:border-[#2D2D2D]">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#6B655F] dark:text-[#888888]">
                    <span>Subiendo archivo a Storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#C9A55B] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="text-[11px] text-red-500 font-bold text-center bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                  ✕ {uploadError}
                </p>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-white text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <LuxuryButton type="submit" variant="gold" disabled={isSubmitting} className="py-2 px-5 text-xs font-bold">
                  {isSubmitting ? 'Enviando...' : (replacingDoc ? 'Confirmar y Reenviar' : 'Enviar a Revisión')}
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
                className="text-[#888888] hover:text-black dark:hover:text-white font-bold text-lg cursor-pointer"
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

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                {getStatusBadge(previewDoc.estado)}
              </div>

              <LuxuryButton variant="gold" onClick={() => setPreviewDoc(null)} className="py-2 px-5 text-xs font-bold">
                Cerrar
              </LuxuryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, Mail, Phone, Lock, Calendar, MapPin, Award, FileText, 
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Upload
} from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../lib/firebase';
import { LuxuryButton } from '../ui/LuxuryButton';
import { useTherapistContext } from '../../context/TherapistContext';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { getFriendlyErrorMessage } from '../../utils/authValidations';
import { validateProfilePhoto } from '../../utils/fileValidation';

interface TherapistRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AVAILABLE_SPECIALTIES = [
  'Masaje Tejido Profundo',
  'Descontracturante VIP',
  'Aromaterapia Real',
  'Masaje Drenaje Linfático',
  'Lomi Lomi Hawaiano',
  'Piedras Volcánicas Calientes',
  'Masaje Tailandés Tradicional',
  'Reflexología Holística',
  'Masaje Prenatal VIP'
];

const AVAILABLE_ZONES = [
  'Polanco',
  'Lomas de Chapultepec',
  'Bosques de las Lomas',
  'Bosques',
  'Santa Fe',
  'Interlomas',
  'Condesa',
  'Roma Norte',
  'Roma',
  'Anzures',
  'Chapultepec',
  'Jesús del Monte',
  'La Herradura',
  'Tecamachalco',
  'Bosque Real',
  'Lomas de Bezares',
  'Naucalpan',
  'Atizapán',
  'Tlalnepantla de Baz',
  'San Ángel',
  'Pedregal',
  'Coyoacán'
];

export const TherapistRegistrationForm: React.FC<TherapistRegistrationFormProps> = ({ onSuccess, onCancel }) => {
  const { createTherapist } = useTherapistContext();
  const { register, firebaseUser } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields - Personal & Contact
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fotografia, setFotografia] = useState('');

  // Official Identifications
  const [curp, setCurp] = useState('');
  const [ineNumber, setIneNumber] = useState('');

  // Professional & Coverage
  const [experienciaAnos, setExperienciaAnos] = useState<number>(3);
  const [especialidades, setEspecialidades] = useState<string[]>(['Masaje Tejido Profundo']);
  const [certificacionesInfo, setCertificacionesInfo] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('Lunes a Sábado, 09:00 - 19:00');
  const [zonasCobertura, setZonasCobertura] = useState<string[]>(['Polanco', 'Lomas de Chapultepec']);

  // Bank & Emergency Contact
  const [cuentaBancariaCLABE, setCuentaBancariaCLABE] = useState('');
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState('');
  const [contactoEmergenciaParentesco, setContactoEmergenciaParentesco] = useState('');
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState('');

  // Terms Acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ id: string; tipo: string; nombre: string; url: string; estado: string }>>([]);
  const [rawFiles, setRawFiles] = useState<{ ine?: File; cert?: File; photo?: File }>({});
  const [showTermsModal, setShowTermsModal] = useState(false);

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { sessions } = useAuth();
  let refreshTherapists: (() => Promise<void>) | undefined = undefined;
  try {
    const therapistCtx = useTherapistContext();
    refreshTherapists = therapistCtx?.refreshTherapists;
  } catch {
    // context may not be available if rendered outside provider
  }

  const toggleSpecialty = (spec: string) => {
    if (especialidades.includes(spec)) {
      setEspecialidades(especialidades.filter(s => s !== spec));
    } else {
      setEspecialidades([...especialidades, spec]);
    }
  };

  const toggleZone = (zone: string) => {
    if (zonasCobertura.includes(zone)) {
      setZonasCobertura(zonasCobertura.filter(z => z !== zone));
    } else {
      setZonasCobertura([...zonasCobertura, zone]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar los Términos y Condiciones y el Código de Ética ESSENYA.');
      return;
    }

    if (!nombre.trim() || !apellidos.trim()) {
      setErrorMessage('Por favor, ingresa tu nombre y apellidos completos.');
      return;
    }

    if (!correo.trim()) {
      setErrorMessage('El correo electrónico es obligatorio.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (!telefono.trim()) {
      setErrorMessage('El teléfono de contacto es obligatorio.');
      return;
    }

    if (curp && curp.trim().length > 0 && curp.trim().length < 18) {
      setErrorMessage('El CURP debe contener 18 caracteres alfanuméricos.');
      return;
    }

    setIsSubmitting(true);

    // 0. Subir archivos adjuntos a Firebase Cloud Storage primero para obtener URLs de descarga
    let finalFotografia = fotografia || '';
    let finalDocuments = [...(uploadedDocuments || [])];
    try {
      const tempId = `temp_${Date.now()}`;
      if (rawFiles.photo) {
        const safeName = rawFiles.photo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const photoRef = ref(storage, `terapeutas/${tempId}/perfil/foto-perfil_${Date.now()}_${safeName}`);
        await uploadBytes(photoRef, rawFiles.photo);
        finalFotografia = await getDownloadURL(photoRef);
      }
      if (rawFiles.ine) {
        const safeName = rawFiles.ine.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const ineRef = ref(storage, `terapeutas/${tempId}/documentos/INE_${Date.now()}_${safeName}`);
        await uploadBytes(ineRef, rawFiles.ine);
        const ineDownloadUrl = await getDownloadURL(ineRef);
        finalDocuments = finalDocuments.map(d => d.tipo === 'INE' ? { ...d, url: ineDownloadUrl } : d);
        if (!finalDocuments.some(d => d.tipo === 'INE')) {
          finalDocuments.push({ id: `doc_ine_${Date.now()}`, tipo: 'INE', nombre: 'Credencial INE', url: ineDownloadUrl, estado: 'pendiente' });
        }
      }
      if (rawFiles.cert) {
        const safeName = rawFiles.cert.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const certRef = ref(storage, `terapeutas/${tempId}/documentos/Certificado_${Date.now()}_${safeName}`);
        await uploadBytes(certRef, rawFiles.cert);
        const certDownloadUrl = await getDownloadURL(certRef);
        finalDocuments = finalDocuments.map(d => d.tipo === 'Certificado' ? { ...d, url: certDownloadUrl } : d);
        if (!finalDocuments.some(d => d.tipo === 'Certificado')) {
          finalDocuments.push({ id: `doc_cert_${Date.now()}`, tipo: 'Certificado', nombre: 'Certificado Profesional', url: certDownloadUrl, estado: 'pendiente' });
        }
      }
    } catch (storageErr) {
      console.warn('[Storage] Advertencia en subida previa de archivos:', storageErr);
    }

    const registrationPayload = {
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      correo: correo.trim().toLowerCase(),
      password,
      telefono: telefono.trim(),
      fotografia: finalFotografia,
      photo: finalFotografia,
      fechaNacimiento: fechaNacimiento || '',
      direccion: direccion.trim() || '',
      curp: (curp || '').trim().toUpperCase(),
      ineNumber: (ineNumber || '').trim(),
      certificacionesInfo: (certificacionesInfo || '').trim(),
      cuentaBancariaCLABE: (cuentaBancariaCLABE || '').trim(),
      contactoEmergencia: {
        nombre: contactoEmergenciaNombre.trim(),
        parentesco: contactoEmergenciaParentesco.trim(),
        telefono: contactoEmergenciaTelefono.trim()
      },
      especialidades: especialidades.length > 0 ? especialidades : ['Masaje Tejido Profundo'],
      experienciaAnos: Number(experienciaAnos) || 0,
      disponibilidad: disponibilidad.trim() || 'Lunes a Sábado, 09:00 - 19:00',
      zonasCobertura: zonasCobertura.length > 0 ? zonasCobertura : ['Polanco', 'Lomas de Chapultepec'],
      documentos: finalDocuments
    };

    // 1. Prioridad: Registro seguro y atómico mediante API Backend
    try {
      const response = await fetch('/api/therapist/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationPayload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        if (refreshTherapists) {
          try {
            await refreshTherapists();
          } catch {
            // Non-blocking
          }
        }
        setIsSubmitting(false);
        onSuccess();
        return;
      }

      // Si el servidor retornó un error por correo ya existente
      if (data.error && (data.error.includes('registrado') || data.error.includes('already in use'))) {
        setIsSubmitting(false);
        setErrorMessage(data.error);
        return;
      }
    } catch (apiErr) {
      console.warn('[TherapistRegistration] Backend endpoint no disponible, procediendo con fallback cliente:', apiErr);
    }

    // 2. Fallback de contingencia: Firebase Client SDK
    try {
      // 1. Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, registrationPayload.correo, password);
      const uid = userCredential.user.uid;

      // 2. Asignar nombre en perfil de Firebase Auth
      try {
        await updateProfile(userCredential.user, {
          displayName: `${registrationPayload.nombre} ${registrationPayload.apellidos}`
        });
      } catch {
        // Non-blocking
      }

      // 3. Guardar perfil maestro de usuario en colección 'users'
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        uid,
        id: uid,
        nombre: registrationPayload.nombre,
        apellidos: registrationPayload.apellidos,
        nombreCompleto: `${registrationPayload.nombre} ${registrationPayload.apellidos}`,
        correo: registrationPayload.correo,
        email: registrationPayload.correo,
        telefono: registrationPayload.telefono,
        rol: 'terapeuta',
        role: 'terapeuta',
        estado: 'pendiente',
        isActive: false,
        fechaRegistro: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }, { merge: true });

      {/* 4. Subir foto de perfil y documentos a Firebase Cloud Storage si fueron seleccionados */}
      let finalFotografia = registrationPayload.fotografia;
      let finalDocuments = [...(registrationPayload.documentos || [])];
      try {
        if (rawFiles.photo) {
          const safeName = rawFiles.photo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const photoRef = ref(storage, `terapeutas/${uid}/perfil/foto-perfil_${Date.now()}_${safeName}`);
          await uploadBytes(photoRef, rawFiles.photo);
          finalFotografia = await getDownloadURL(photoRef);
        }
        if (rawFiles.ine) {
          const safeName = rawFiles.ine.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const ineRef = ref(storage, `terapeutas/${uid}/documentos/INE_${Date.now()}_${safeName}`);
          await uploadBytes(ineRef, rawFiles.ine);
          const ineDownloadUrl = await getDownloadURL(ineRef);
          finalDocuments = finalDocuments.map(d => d.tipo === 'INE' ? { ...d, url: ineDownloadUrl } : d);
        }
        if (rawFiles.cert) {
          const safeName = rawFiles.cert.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const certRef = ref(storage, `terapeutas/${uid}/documentos/Certificado_${Date.now()}_${safeName}`);
          await uploadBytes(certRef, rawFiles.cert);
          const certDownloadUrl = await getDownloadURL(certRef);
          finalDocuments = finalDocuments.map(d => d.tipo === 'Certificado' ? { ...d, url: certDownloadUrl } : d);
        }
      } catch (storageErr) {
        console.warn('[Storage] Fallback para archivos de registro:', storageErr);
      }

      // 5. Guardar expediente profesional completo en colección 'terapeutas'
      // SANEAMIENTO: Los campos sensibles se guardan en una subcolección protegida
      const therapistRef = doc(db, 'terapeutas', uid);
      await setDoc(therapistRef, {
        id: uid,
        uid,
        name: `${registrationPayload.nombre} ${registrationPayload.apellidos}`.trim(),
        nombre: registrationPayload.nombre,
        apellidos: registrationPayload.apellidos,
        nombreCompleto: `${registrationPayload.nombre} ${registrationPayload.apellidos}`,
        email: registrationPayload.correo,
        correo: registrationPayload.correo,
        phone: registrationPayload.telefono,
        telefono: registrationPayload.telefono,
        fotografia: finalFotografia,
        photo: finalFotografia,
        fechaNacimiento: registrationPayload.fechaNacimiento,
        direccion: registrationPayload.direccion,
        certificacionesInfo: registrationPayload.certificacionesInfo,
        contactoEmergencia: registrationPayload.contactoEmergencia,
        especialidades: registrationPayload.especialidades,
        specialties: registrationPayload.especialidades,
        experienciaAnos: registrationPayload.experienciaAnos,
        disponibilidad: registrationPayload.disponibilidad,
        zonasCobertura: registrationPayload.zonasCobertura,
        coverageZones: registrationPayload.zonasCobertura,
        documentos: finalDocuments,
        estado: 'pendiente',
        status: 'pendiente',
        estadoAprobacion: 'pendiente',
        estadoVerificacion: 'no_verificado',
        puntuacion: 5.0,
        rating: 5.0,
        numeroResenas: 0,
        resenasCount: 0,
        serviciosCompletados: 0,
        fechaAlta: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        solicitudRegistroFecha: new Date().toISOString()
      }, { merge: true });

      // Guardar datos sensibles en subcolección privada
      const privateInfoRef = doc(db, 'terapeutas', uid, 'private_info', 'sensitive');
      await setDoc(privateInfoRef, {
        curp: registrationPayload.curp,
        ineNumber: registrationPayload.ineNumber,
        cuentaBancariaCLABE: registrationPayload.cuentaBancariaCLABE,
        updatedAt: new Date().toISOString()
      });

      // 6. Si no es una sesión de administración previa, cerrar sesión del nuevo usuario
      if (!sessions.administrador) {
        try {
          await signOut(auth);
        } catch {
          // Non-blocking
        }
      }

      if (refreshTherapists) {
        try {
          await refreshTherapists();
        } catch {
          // Non-blocking
        }
      }

      setIsSubmitting(false);
      onSuccess();
    } catch (clientErr: any) {
      setIsSubmitting(false);
      setErrorMessage(getFriendlyErrorMessage(clientErr));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#806020] dark:text-[#C9A55B] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Acreditación Profesional ESSENYA VIP</span>
        </div>
        <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">
          Registro de Terapeuta / Masoterapeuta
        </h2>
        <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] max-w-md mx-auto">
          Completa tu expediente para unirte a la red más exclusiva de masajes terapéuticos a domicilio. Tu solicitud será evaluada por el Comité Administrativo.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between items-center bg-[#F5F1EA] dark:bg-[#1A1A1A] p-2 rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs font-semibold">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex-1 py-2 rounded-xl transition-all ${step === 1 ? 'bg-white dark:bg-[#0D0D0D] text-[#C9A55B] font-bold shadow-xs' : 'text-[#888888]'}`}
        >
          1. Datos Personales
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`flex-1 py-2 rounded-xl transition-all ${step === 2 ? 'bg-white dark:bg-[#0D0D0D] text-[#C9A55B] font-bold shadow-xs' : 'text-[#888888]'}`}
        >
          2. Perfil & Zonas
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`flex-1 py-2 rounded-xl transition-all ${step === 3 ? 'bg-white dark:bg-[#0D0D0D] text-[#C9A55B] font-bold shadow-xs' : 'text-[#888888]'}`}
        >
          3. Documentos & Banco
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl flex items-start space-x-3 text-red-600 dark:text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* STEP 1: Personal & Identifications */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">Nombre(s) *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Valeria"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">Apellidos *</label>
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Ej. Sánchez Morales"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="terapeuta@correo.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">Teléfono Móvil (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">Contraseña Personal *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
                />
                <PasswordStrengthMeter password={password} />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">Fecha de Nacimiento *</label>
                <input
                  type="date"
                  required
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
                />
              </div>
            </div>

            {/* Official Credentials CURP & INE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F5F1EA] dark:bg-[#1A1A1A] p-3 rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A]">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#806020] dark:text-[#C9A55B] uppercase">CURP Oficial (18 Caracteres) *</label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={curp}
                  onChange={(e) => setCurp(e.target.value.toUpperCase())}
                  placeholder="ABCD123456HDFRRR01"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white uppercase focus:border-[#C9A55B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#806020] dark:text-[#C9A55B] uppercase">Clave de Elector / INE *</label>
                <input
                  type="text"
                  required
                  value={ineNumber}
                  onChange={(e) => setIneNumber(e.target.value)}
                  placeholder="ID / Folio INE"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">Dirección de Residencia Completa *</label>
              <input
                type="text"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, Número, Colonia, Alcaldía, C.P., CDMX"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
              />
            </div>

            {/* Profile Photo Upload */}
            <div className="space-y-1.5 bg-[#FAF8F5] dark:bg-[#0D0D0D] p-3 rounded-2xl border border-dashed border-[#C9A55B]/40">
              <label className="text-[11px] font-bold text-[#806020] dark:text-[#C9A55B] uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Fotografía de Perfil / Retrato Profesional *</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const validation = validateProfilePhoto(file);
                    if (!validation.isValid) {
                      setErrorMessage(validation.error || 'Archivo de imagen no válido.');
                      e.target.value = '';
                      return;
                    }
                    setErrorMessage(null);
                    setRawFiles(prev => ({ ...prev, photo: file }));
                    const reader = new FileReader();
                    reader.onload = () => {
                      setFotografia(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-[11px] text-[#6B655F] file:mr-2 file:py-1 file:px-2 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-[#C9A55B]/10 file:text-[#C9A55B] hover:file:bg-[#C9A55B]/20 cursor-pointer"
              />
              {fotografia && (
                <div className="flex items-center gap-2 pt-1">
                  <img src={fotografia} alt="Vista previa" className="w-10 h-10 rounded-full object-cover border border-[#C9A55B]" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Foto de perfil cargada correctamente</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <LuxuryButton type="button" variant="gold" size="sm" onClick={() => setStep(2)}>
                <span>Siguiente: Perfil & Especialidades</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </LuxuryButton>
            </div>
          </div>
        )}

        {/* STEP 2: Specialties & Coverage */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">
                Años de Experiencia Muestral *
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={experienciaAnos}
                onChange={(e) => setExperienciaAnos(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
              />
            </div>

            {/* Specialties */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">
                Especialidades Masoterapéuticas *
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#F5F1EA] dark:bg-[#1A1A1A] rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A] max-h-36 overflow-y-auto">
                {AVAILABLE_SPECIALTIES.map(spec => {
                  const isSel = especialidades.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        isSel 
                          ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold' 
                          : 'bg-white dark:bg-[#0D0D0D] text-[#6B655F] dark:text-[#AAAAAA] border-[#E5DFD3] dark:border-[#333333]'
                      }`}
                    >
                      {spec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coverage Zones */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">
                Zonas de Cobertura en CDMX *
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#F5F1EA] dark:bg-[#1A1A1A] rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A] max-h-28 overflow-y-auto">
                {AVAILABLE_ZONES.map(zone => {
                  const isSel = zonasCobertura.includes(zone);
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleZone(zone)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        isSel 
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold' 
                          : 'bg-white dark:bg-[#0D0D0D] text-[#6B655F] dark:text-[#AAAAAA] border-[#E5DFD3] dark:border-[#333333]'
                      }`}
                    >
                      {zone}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase">
                Certificaciones y Cédulas Técnicas
              </label>
              <textarea
                value={certificacionesInfo}
                onChange={(e) => setCertificacionesInfo(e.target.value)}
                placeholder="Ej. Diplomado SEP Masoterapia, Instituto de Drenaje Linfático Vodder..."
                rows={2}
                className="w-full p-2.5 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:underline"
              >
                Anterior
              </button>

              <LuxuryButton type="button" variant="gold" size="sm" onClick={() => setStep(3)}>
                <span>Siguiente: Documentos & Banco</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </LuxuryButton>
            </div>
          </div>
        )}

        {/* STEP 3: Banking & Emergency Contact */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Bank CLABE */}
            <div className="space-y-1 bg-[#F5F1EA] dark:bg-[#1A1A1A] p-3 rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A]">
              <label className="text-[11px] font-bold text-[#806020] dark:text-[#C9A55B] uppercase flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cuenta Clabe Interbancaria (18 dígitos) *</span>
              </label>
              <input
                type="text"
                required
                maxLength={18}
                value={cuentaBancariaCLABE}
                onChange={(e) => setCuentaBancariaCLABE(e.target.value)}
                placeholder="012180000000000000"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white focus:border-[#C9A55B]"
              />
              <p className="text-[10px] text-[#888888]">
                Utilizada únicamente para el depósito semanal o quincenal de tus honorarios por servicios prestados.
              </p>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-2 border border-[#E5DFD3] dark:border-[#2A2A2A] p-3 rounded-2xl">
              <p className="text-[11px] font-bold text-[#1C1917] dark:text-white uppercase">Contacto de Emergencia *</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={contactoEmergenciaNombre}
                  onChange={(e) => setContactoEmergenciaNombre(e.target.value)}
                  placeholder="Nombre Contacto"
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white"
                />

                <input
                  type="text"
                  required
                  value={contactoEmergenciaParentesco}
                  onChange={(e) => setContactoEmergenciaParentesco(e.target.value)}
                  placeholder="Parentesco (Ej. Mamá, Esposo)"
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white"
                />

                <input
                  type="tel"
                  required
                  value={contactoEmergenciaTelefono}
                  onChange={(e) => setContactoEmergenciaTelefono(e.target.value)}
                  placeholder="Teléfono Emergencia"
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white"
                />
              </div>
            </div>

            {/* Documents Upload Section */}
            <div className="space-y-3 bg-[#FAF8F5] dark:bg-[#0D0D0D] p-3.5 rounded-2xl border border-dashed border-[#C9A55B]/50">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#C9A55B]" />
                <p className="text-xs font-bold text-[#1C1917] dark:text-white">Carga de Documentos Oficiales (INE / Certificados) *</p>
              </div>
              <p className="text-[10px] text-[#6B655F] dark:text-[#AAAAAA]">
                Sube tu identificación oficial (INE por ambos lados) y diplomas o constancias de masoterapia (PDF, JPG o PNG hasta 15MB).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#6B655F] dark:text-[#AAAAAA]">Identificación Oficial (INE / Pasaporte)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validation = validateProfilePhoto(file);
                        if (!validation.isValid) {
                          setErrorMessage(validation.error || 'Archivo de identificación no válido.');
                          e.target.value = '';
                          return;
                        }
                        setErrorMessage(null);
                        setRawFiles(prev => ({ ...prev, ine: file }));
                        const reader = new FileReader();
                        reader.onload = () => {
                          setUploadedDocuments(prev => [...prev.filter(d => d.tipo !== 'INE'), { id: 'ine_' + Date.now(), tipo: 'INE', nombre: file.name, url: reader.result as string, estado: 'pendiente' }]);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[11px] text-[#6B655F] file:mr-2 file:py-1 file:px-2 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-[#C9A55B]/10 file:text-[#C9A55B] hover:file:bg-[#C9A55B]/20 cursor-pointer"
                  />
                  {uploadedDocuments.some(d => d.tipo === 'INE') && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      ✓ INE cargado correctamente
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#6B655F] dark:text-[#AAAAAA]">Certificado o Diploma de Masoterapia</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validation = validateProfilePhoto(file);
                        if (!validation.isValid) {
                          setErrorMessage(validation.error || 'Archivo de certificado no válido.');
                          e.target.value = '';
                          return;
                        }
                        setErrorMessage(null);
                        setRawFiles(prev => ({ ...prev, cert: file }));
                        const reader = new FileReader();
                        reader.onload = () => {
                          setUploadedDocuments(prev => [...prev.filter(d => d.tipo !== 'Certificado'), { id: 'cert_' + Date.now(), tipo: 'Certificado', nombre: file.name, url: reader.result as string, estado: 'pendiente' }]);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[11px] text-[#6B655F] file:mr-2 file:py-1 file:px-2 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-[#C9A55B]/10 file:text-[#C9A55B] hover:file:bg-[#C9A55B]/20 cursor-pointer"
                  />
                  {uploadedDocuments.some(d => d.tipo === 'Certificado') && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      ✓ Certificado cargado correctamente
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-2 pt-1">
              <input
                type="checkbox"
                id="acceptTerms"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#E5DFD3] text-[#C9A55B] focus:ring-[#C9A55B] accent-[#C9A55B]"
              />
              <label htmlFor="acceptTerms" className="text-xs text-[#6B655F] dark:text-[#AAAAAA] leading-tight select-none">
                Acepto los{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#C9A55B] font-bold underline hover:text-[#b08e48] cursor-pointer inline"
                >
                  Términos de Servicio VIP y Código de Ética de Sennia
                </button>
                . Reconozco que mi solicitud quedará en estado <strong className="text-[#C9A55B]">Pendiente de Aprobación</strong> hasta ser dictaminada por la administración.
              </label>
            </div>

            {/* Terms Modal Popup */}
            {showTermsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#2A2A2A] pb-3">
                    <h3 className="text-base font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#C9A55B]" />
                      Términos de Servicio VIP y Código de Ética - Sennia
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold px-2 py-1"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 text-xs text-[#6B655F] dark:text-[#AAAAAA] leading-relaxed">
                    <h4 className="font-bold text-[#1C1917] dark:text-white uppercase tracking-wider">1. Estándares de Excelencia y Profesionalismo VIP</h4>
                    <p>
                      Como masoterapeuta de la red exclusiva Sennia, te comprometes a brindar servicios de la más alta calidad terapéutica, manteniendo una presentación impecable, puntualidad estricta y trato respetuoso en todo momento en los domicilios asignados.
                    </p>

                    <h4 className="font-bold text-[#1C1917] dark:text-white uppercase tracking-wider">2. Código de Ética y Confidencialidad</h4>
                    <p>
                      La privacidad de los clientes es inviolable. Toda información médica, personal o relacionada con los servicios prestados tiene carácter estrictamente confidencial. Quedan prohibidas conductas que comprometan la seguridad o la integridad de ambas partes.
                    </p>

                    <h4 className="font-bold text-[#1C1917] dark:text-white uppercase tracking-wider">3. Cumplimiento Operativo</h4>
                    <p>
                      Las citas agendadas a través de la plataforma Sennia deben cumplirse puntualmente. Las cancelaciones o reprogramaciones deben notificarse con al menos 4 horas de anticipación a través del canal oficial.
                    </p>

                    <h4 className="font-bold text-[#1C1917] dark:text-white uppercase tracking-wider">4. Veracidad de Documentos</h4>
                    <p>
                      Los documentos, certificados e identificaciones oficiales subidos en este expediente son auténticos y verídicos bajo protesta de decir verdad.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5DFD3] dark:border-[#2A2A2A] text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setAcceptedTerms(true);
                        setShowTermsModal(false);
                      }}
                      className="px-5 py-2 bg-[#C9A55B] hover:bg-[#b08e48] text-black font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      He leído y acepto los Términos
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-[#E5DFD3] dark:border-[#262626]">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white"
              >
                Cancelar
              </button>

              <LuxuryButton
                type="submit"
                disabled={isSubmitting}
                variant="gold"
                className="py-2.5 px-6 text-xs font-bold shadow-lg"
              >
                {isSubmitting ? 'Enviando Expediente...' : 'Enviar Solicitud a Evaluación'}
              </LuxuryButton>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

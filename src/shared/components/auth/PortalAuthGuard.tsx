import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Mail, User, Phone, KeyRound, ShieldCheck, ArrowRight, 
  Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw, Sparkles, UserCheck, Shield, Clock,
  ShieldAlert, LogOut, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AuthFormMode, PortalClaimVerificationResult } from '../../types/auth';
import { EssenyaLogo } from '../EssenyaLogo';
import { LuxuryButton } from '../ui/LuxuryButton';
import { CaptchaChallenge } from './CaptchaChallenge';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { TherapistRegistrationForm } from './TherapistRegistrationForm';
import { getLockoutInfo } from '../../utils/authValidations';
import { checkIsAdminInFirestore } from '../../services/adminAuthService';

interface PortalAuthGuardProps {
  role: UserRole;
  children: React.ReactNode;
}

export const PortalAuthGuard: React.FC<PortalAuthGuardProps> = ({ role, children }) => {
  const { 
    sessions, 
    isAuthenticated, 
    getUser, 
    login, 
    register, 
    sendPasswordReset, 
    logout, 
    completeFirstLoginPasswordChange,
    isAuthReady,
    verifyPortalClaim,
    hasPortalClaim
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<AuthFormMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forceShowLogin, setForceShowLogin] = useState(false);

  // Explicit client-side Claim Verification State
  const [claimStatus, setClaimStatus] = useState<'idle' | 'verifying' | 'authorized' | 'denied'>('idle');
  const [claimResult, setClaimResult] = useState<PortalClaimVerificationResult | null>(null);
  const [isSyncingClaims, setIsSyncingClaims] = useState(false);

  // Real-time Firestore admin verification state
  const [adminFirestoreStatus, setAdminFirestoreStatus] = useState<'idle' | 'checking' | 'verified' | 'unauthorized'>('idle');
  const [adminVerificationMsg, setAdminVerificationMsg] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');

  // First Login Password Change State
  const [newFirstPassword, setNewFirstPassword] = useState('');
  const [confirmFirstPassword, setConfirmFirstPassword] = useState('');

  // Status messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lockout banner countdown
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  const currentUser = getUser(role);

  // Role names in Spanish for display
  const roleDisplayNames: Record<UserRole, string> = {
    cliente: 'Cliente VIP',
    terapeuta: 'Terapeuta Certificado',
    administrador: 'Administrador del Sistema'
  };

  const rolePaths: Record<UserRole, string> = {
    cliente: '/cliente',
    terapeuta: '/terapeuta',
    administrador: '/admin'
  };

  // Explicit client-side Claim Verification effect
  useEffect(() => {
    let isMounted = true;

    if (!isAuthReady) return;

    if (currentUser) {
      setClaimStatus('verifying');
      verifyPortalClaim(role, { forceRefresh: false })
        .then((result) => {
          if (!isMounted) return;
          setClaimResult(result);
          if (result.authorized) {
            setClaimStatus('authorized');
          } else {
            setClaimStatus('denied');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setClaimStatus('denied');
          setClaimResult({
            authorized: false,
            claimFound: false,
            error: err?.message || 'Error al validar claims de autenticación.',
            source: 'none'
          });
        });
    } else {
      setClaimStatus('idle');
      setClaimResult(null);
    }

    return () => {
      isMounted = false;
    };
  }, [role, currentUser?.uid, currentUser?.correo, isAuthReady, verifyPortalClaim]);

  const handleForceSyncClaims = async () => {
    setIsSyncingClaims(true);
    try {
      const res = await verifyPortalClaim(role, { forceRefresh: true });
      setClaimResult(res);
      if (res.authorized) {
        setClaimStatus('authorized');
      } else {
        setClaimStatus('denied');
      }
    } finally {
      setIsSyncingClaims(false);
    }
  };

  // Real-time Firestore admin verification effect
  useEffect(() => {
    let isMounted = true;

    if (role === 'administrador') {
      if (currentUser) {
        setAdminFirestoreStatus('checking');
        checkIsAdminInFirestore({ uid: currentUser.uid, email: currentUser.correo })
          .then((result) => {
            if (!isMounted) return;
            if (result.isAdmin) {
              setAdminFirestoreStatus('verified');
            } else {
              setAdminFirestoreStatus('unauthorized');
              setAdminVerificationMsg(
                result.error || 'El usuario autenticado no tiene asignado el rol de Administrador en la colección administradores de Firestore.'
              );
            }
          })
          .catch((err) => {
            if (!isMounted) return;
            setAdminFirestoreStatus('unauthorized');
            setAdminVerificationMsg(err?.message || 'Error de conexión con Firestore.');
          });
      } else {
        setAdminFirestoreStatus('idle');
      }
    } else {
      setAdminFirestoreStatus('idle');
    }

    return () => {
      isMounted = false;
    };
  }, [role, currentUser?.uid, currentUser?.correo]);

  // 0. Initial Auth Preparation Screen: Wait for Firebase Auth and claims resolution
  if (!isAuthReady) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
        <div className="w-full max-w-md bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A55B]">
              Autenticación ESSENYA
            </span>
            <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
              Inicializando Sesión Segura
            </h3>
            <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
              Validando estado criptográfico y claims de acceso...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 1. Role & Claim Integrity Validation: If logged in with the target role
  if (currentUser) {
    // 1a. Security Claim Pre-render Verification
    if (claimStatus === 'verifying') {
      return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
          <div className="w-full max-w-md bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] flex items-center justify-center mx-auto animate-spin">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A55B]">
                Validación de Claims en Cliente
              </span>
              <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
                Verificando Token y Permisos del Portal
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                Comprobando claims para portal <span className="text-[#C9A55B] font-semibold">{roleDisplayNames[role]}</span> antes de cargar la interfaz...
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 1b. Claim Denial Barrier (Prevents UI render and avoids permission errors)
    if (claimStatus === 'denied') {
      return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
          <div className="w-full max-w-lg bg-white dark:bg-[#141414] border border-red-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="bg-red-500/15 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/30 uppercase tracking-widest">
                Acceso Denegado por Claim de Seguridad
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white pt-2">
                Claim Insuficiente para {roleDisplayNames[role]}
              </h2>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] leading-relaxed">
                {claimResult?.error || `Tu token de sesión no cuenta con el claim correspondiente para acceder al portal de ${roleDisplayNames[role]}.`}
              </p>
              {claimResult?.claims && (
                <div className="mt-3 p-3 bg-black/5 dark:bg-black/40 rounded-xl text-left font-mono text-[11px] text-[#6B655F] dark:text-[#AAAAAA] border border-black/10 dark:border-white/10 overflow-x-auto">
                  <div className="font-sans font-bold text-[10px] uppercase text-[#A8A29E] mb-1">Claims detectados en Token:</div>
                  <div>rol: <span className="text-[#C9A55B]">{claimResult.claims.rol || claimResult.claims.role || 'no asignado'}</span></div>
                  <div>admin: <span className="text-[#C9A55B]">{String(Boolean(claimResult.claims.admin))}</span></div>
                  {claimResult.claims.email && <div>email: <span>{claimResult.claims.email}</span></div>}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                type="button"
                disabled={isSyncingClaims}
                onClick={handleForceSyncClaims}
                className="px-5 py-2.5 bg-[#C9A55B] hover:bg-[#D8B46B] text-black text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingClaims ? 'animate-spin' : ''}`} />
                <span>{isSyncingClaims ? 'Sincronizando...' : 'Sincronizar Claims y Reintentar'}</span>
              </button>
              {claimResult?.role && rolePaths[claimResult.role as UserRole] && (
                <button
                  type="button"
                  onClick={() => navigate(rolePaths[claimResult.role as UserRole])}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Ir a mi Portal Autorizado
                </button>
              )}
              <button
                type="button"
                onClick={() => logout(role)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Security check: ensure user role matches expected portal role - automatically redirect instead of showing error card
    if (currentUser.rol && currentUser.rol !== role && rolePaths[currentUser.rol as UserRole]) {
      const targetPath = rolePaths[currentUser.rol as UserRole];
      navigate(targetPath, { replace: true });
      return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
          <div className="w-full max-w-md bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A55B]">
                Redirección Automática
              </span>
              <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
                Redirigiendo a tu portal independiente...
              </h3>
            </div>
          </div>
        </div>
      );
    }

    // Specific Firestore Role Validation for Administrators in 'administradores' collection
    if (role === 'administrador') {
      if (adminFirestoreStatus === 'checking') {
        return (
          <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
            <div className="w-full max-w-md bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-8 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A55B]">
                  Firestore Security Guard
                </span>
                <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
                  Verificando Privilegios de Administrador
                </h3>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                  Validando rol en la colección <code className="text-[#C9A55B] font-mono">administradores</code> de Firestore...
                </p>
              </div>
            </div>
          </div>
        );
      }

      if (adminFirestoreStatus === 'unauthorized') {
        return (
          <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
            <div className="w-full max-w-lg bg-white dark:bg-[#141414] border border-red-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="bg-red-500/15 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/30 uppercase tracking-widest">
                  Acceso Denegado en Firestore
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white pt-2">
                  Rol de Administrador No Encontrado
                </h2>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                  El usuario <span className="font-semibold text-[#1C1917] dark:text-white">{currentUser.correo}</span> no cuenta con un documento con rol de <code className="text-red-400 font-mono">administrador</code> en la colección <code className="text-[#C9A55B] font-mono">administradores</code> de Firestore.
                </p>
                {adminVerificationMsg && (
                  <p className="text-[11px] font-mono text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-500/20">
                    {adminVerificationMsg}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminFirestoreStatus('checking');
                    checkIsAdminInFirestore({ uid: currentUser.uid, email: currentUser.correo })
                      .then((res) => {
                        if (res.isAdmin) setAdminFirestoreStatus('verified');
                        else {
                          setAdminFirestoreStatus('unauthorized');
                          setAdminVerificationMsg(res.error || 'No se encontró en administradores.');
                        }
                      });
                  }}
                  className="px-5 py-2.5 bg-[#C9A55B] hover:bg-[#D8B46B] text-black text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar Verificación</span>
                </button>
                <button
                  type="button"
                  onClick={() => logout(role)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    // Check if therapist is pending approval or rejected
    if (role === 'terapeuta') {
      const therapistStatus = currentUser.estado || currentUser.therapistProfile?.estado;
      if (therapistStatus === 'pendiente') {
        return (
          <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
            <div className="w-full max-w-lg bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C9A55B] via-[#DFBF7A] to-[#806020]" />
              <div className="w-16 h-16 rounded-3xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] flex items-center justify-center mx-auto animate-pulse">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] text-xs font-bold px-3 py-1 rounded-full border border-[#C9A55B]/30 uppercase tracking-widest">
                  Estado: Pendiente de Aprobación
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white pt-2">
                  Solicitud en Evaluación Técnica
                </h2>
                <p className="text-sm font-semibold text-[#1C1917] dark:text-white leading-relaxed">
                  Tu solicitud está siendo revisada por el equipo de ESSENYA.
                </p>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                  Un administrador validará tus documentos, CURP e Identificación INE para activar tu cuenta.
                </p>
              </div>

              <div className="bg-[#F5F1EA] dark:bg-[#1A1A1A] p-4 rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A] text-left text-xs space-y-2">
                <p className="font-bold text-[#1C1917] dark:text-white">Resumen de Expediente Enviado:</p>
                <p className="text-[#6B655F] dark:text-[#AAAAAA]"><strong>Terapeuta:</strong> {currentUser.nombre} {currentUser.apellidos}</p>
                <p className="text-[#6B655F] dark:text-[#AAAAAA]"><strong>Correo:</strong> {currentUser.correo}</p>
                <p className="text-[#6B655F] dark:text-[#AAAAAA]"><strong>Teléfono:</strong> {currentUser.telefono}</p>
              </div>

              <div className="pt-2 flex flex-col items-center space-y-2.5">
                <button
                  onClick={() => logout('terapeuta')}
                  className="text-xs text-[#888888] hover:text-red-400 font-semibold underline cursor-pointer"
                >
                  Cerrar sesión de seguridad
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (therapistStatus === 'rechazado') {
        return (
          <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
            <div className="w-full max-w-lg bg-white dark:bg-[#141414] border border-red-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="bg-red-500/15 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/30 uppercase tracking-widest">
                  Estado: Solicitud No Aprobada
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white pt-2">
                  Atención a Expediente
                </h2>
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-3.5 rounded-2xl text-left">
                  <strong className="block font-bold">Motivo de no aprobación:</strong>
                  <p className="mt-1">{currentUser.therapistProfile?.motivoRechazoAccount || 'La documentación proporcionada requiere actualización o no cumple con los criterios de certificación vigentes.'}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => logout('terapeuta')}
                  className="text-xs text-[#888888] hover:text-red-400 font-semibold underline"
                >
                  Cerrar sesión de seguridad
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    // Forced First Login Password Change
    if (currentUser.mustChangePassword) {
      const handleFirstPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (newFirstPassword !== confirmFirstPassword) {
          setErrorMessage('Las contraseñas no coinciden.');
          return;
        }

        setIsSubmitting(true);
        const res = await completeFirstLoginPasswordChange(role, newFirstPassword);
        setIsSubmitting(false);

        if (!res.success) {
          setErrorMessage(res.error || 'Error al actualizar la contraseña.');
        } else {
          setSuccessMessage('Contraseña actualizada exitosamente. Ingresando a tu panel...');
        }
      };

      return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C9A55B] via-[#DFBF7A] to-[#806020]" />
            
            <div className="text-center space-y-2 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">
                Primer Inicio de Sesión Obligatorio
              </h2>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] max-w-sm mx-auto">
                Hola, <span className="font-bold text-[#1C1917] dark:text-white">{currentUser.nombre}</span>. Por normatividad de ciberseguridad ESSENYA, debes actualizar tu clave temporal por una nueva contraseña personal.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl flex items-start space-x-3 text-red-600 dark:text-red-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex items-start space-x-3 text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleFirstPasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newFirstPassword}
                    onChange={(e) => setNewFirstPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#A8A29E]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newFirstPassword} />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmFirstPassword}
                    onChange={(e) => setConfirmFirstPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              <LuxuryButton
                type="submit"
                disabled={isSubmitting}
                variant="gold"
                className="w-full py-3 text-xs tracking-wider font-bold shadow-lg"
              >
                {isSubmitting ? 'Guardando Nueva Contraseña...' : 'Establecer Contraseña y Acceder'}
              </LuxuryButton>
            </form>

            <div className="text-center pt-2 border-t border-[#E5DFD3] dark:border-[#262626]">
              <button
                onClick={() => logout(role)}
                className="text-xs text-[#888888] hover:text-red-400 font-semibold underline"
              >
                Cerrar sesión de seguridad
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // All verifications passed - grant access to this portal
    return <>{children}</>;
  }

  // 2. Middleware Check: Automatic redirection if session active in another role
  const activeSessionRole: UserRole | null = sessions.administrador 
    ? 'administrador' 
    : sessions.terapeuta 
      ? 'terapeuta' 
      : sessions.cliente 
        ? 'cliente' 
        : null;

  if (activeSessionRole && activeSessionRole !== role && !forceShowLogin) {
    const correctPath = rolePaths[activeSessionRole];
    
    useEffect(() => {
      navigate(correctPath, { replace: true });
    }, [correctPath, navigate]);

    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
        <div className="w-full max-w-md bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#C9A55B] flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A55B]">
              ESSENYA Smart Navigation
            </span>
            <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
              Redirigiendo a tu Portal...
            </h3>
            <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
              Detectada sesión activa ({roleDisplayNames[activeSessionRole]}). Redirigiendo automáticamente...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Login / Register Gateway for this portal
  const roleTitles: Record<UserRole, { title: string; subtitle: string; icon: any }> = {
    cliente: {
      title: 'Portal Privado Clientes ESSENYA',
      subtitle: 'Acceso a Reservas VIP, Terapeutas Certificados y Experiencias Wellness',
      icon: UserCheck
    },
    terapeuta: {
      title: 'Portal de Terapeutas Certificados',
      subtitle: 'Gestión de Agenda, Rutas de Navegación y Servicios en Tiempo Real',
      icon: Sparkles
    },
    administrador: {
      title: 'Centro de Control Administrativo',
      subtitle: 'Plataforma de Operaciones, Monitoreo de Seguridad y Gestión Financiera',
      icon: Shield
    }
  };

  const currentRoleInfo = roleTitles[role];
  const IconComponent = currentRoleInfo.icon;

  const handleModeChange = (newMode: AuthFormMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCaptchaVerified(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isCaptchaVerified) {
      setErrorMessage('Por favor completa la verificación de seguridad (CAPTCHA) antes de continuar.');
      return;
    }

    if (lockoutTimer > 0) {
      setErrorMessage(`El acceso está bloqueado temporalmente por seguridad. Inténtalo en ${Math.ceil(lockoutTimer / 60)} minutos.`);
      return;
    }

    setIsSubmitting(true);

    if (mode === 'login') {
      const res = await login(role, email, password, rememberMe);
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Error al iniciar sesión.');
      }
    } else if (mode === 'register') {
      if (password !== confirmPassword) {
        setIsSubmitting(false);
        setErrorMessage('Las contraseñas no coinciden. Por favor verifica ambos campos.');
        return;
      }

      const res = await register(role, {
        nombre,
        apellidos,
        correo: email,
        telefono,
        contrasena: password
      });
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Error al crear la cuenta.');
      } else {
        setSuccessMessage('Cuenta creada exitosamente. Bienvenido a ESSENYA.');
      }
    } else if (mode === 'forgot_password') {
      const res = await sendPasswordReset(email);
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMessage(res.message || 'Se han enviado las instrucciones a tu correo electrónico.');
      } else {
        setErrorMessage(res.error || 'Error al procesar la solicitud.');
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8 bg-[#FAF8F5] dark:bg-[#0D0D0D] transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
      >
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C9A55B] via-[#DFBF7A] to-[#806020]" />

        {/* Header Logo & Title */}
        <div className="text-center space-y-3 pt-2">
          <div className="flex justify-center">
            <EssenyaLogo variant="auto" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#806020] dark:text-[#C9A55B] text-xs font-semibold uppercase tracking-widest">
            <IconComponent className="w-3.5 h-3.5" />
            <span>{currentRoleInfo.title}</span>
          </div>

          <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] max-w-sm mx-auto leading-relaxed">
            {currentRoleInfo.subtitle}
          </p>

          {/* Secure Route Badge */}
          <div className="flex items-center justify-center space-x-2 pt-1 text-[11px] text-[#888888]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span>Ruta Protegida: <span className="font-mono text-[#C9A55B] font-bold">{location.pathname}</span></span>
          </div>
        </div>

        {/* Lockout Banner */}
        {lockoutTimer > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl flex items-start space-x-3 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Acceso Bloqueado por Ciberseguridad</p>
              <p className="mt-0.5 leading-relaxed">
                Múltiples intentos fallidos detectados. Reintenta en{' '}
                <span className="font-mono font-bold text-red-700 dark:text-red-300">
                  {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
                </span>.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl flex flex-col space-y-2 text-red-600 dark:text-red-400 text-xs">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <span className="leading-relaxed font-bold block">{errorMessage}</span>
                {(errorMessage.includes('temporalmente ocupado') || errorMessage.includes('reconectando')) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      setErrorMessage(null);
                      if (email && password) {
                        handleSubmit(e as any);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 font-semibold transition-colors cursor-pointer text-[11px]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar conexión ahora</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex flex-col space-y-2.5 text-emerald-700 dark:text-emerald-300 text-xs">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-relaxed font-medium">{successMessage}</span>
            </div>

          </div>
        )}

        {/* Tabs: Login / Register / Recover */}
        <div className="flex p-1 bg-[#FAF8F5] dark:bg-[#1C1C1C] rounded-2xl border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleModeChange('login')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
              mode === 'login'
                ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>

          {(role === 'cliente' || role === 'terapeuta') && (
            <button
              type="button"
              onClick={() => handleModeChange('register')}
              className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              {role === 'terapeuta' ? 'Postularme' : 'Registrarse'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleModeChange('forgot_password')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
              mode === 'forgot_password'
                ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            Recuperar
          </button>
        </div>

        {/* Main Form or Therapist Registration Form */}
        {role === 'terapeuta' && mode === 'register' ? (
          <TherapistRegistrationForm
            onSuccess={() => {
              setSuccessMessage('Solicitud enviada exitosamente. Tu expediente está siendo evaluado por el equipo de administración ESSENYA.');
              setMode('login');
            }}
            onCancel={() => setMode('login')}
          />
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Register specific fields for client */}
          {mode === 'register' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
                  Nombre *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
                  Apellidos *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
                  <input
                    type="text"
                    required
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Tus apellidos"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
                  Teléfono Móvil
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@gmail.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
              />
            </div>
            <p className="text-[10px] text-[#888888] dark:text-[#666666] mt-1 pl-1">
              {role === 'cliente' 
                ? 'Puedes usar tu correo personal (Gmail, Outlook, Yahoo, etc.)' 
                : 'Usa el correo con el que te registraste en ESSENYA.'}
            </p>
          </div>

          {/* Password Field */}
          {(mode === 'login' || mode === 'register') && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
                  Contraseña *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot_password')}
                    className="text-[11px] font-semibold text-[#806020] dark:text-[#C9A55B] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-white p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter on register */}
              {mode === 'register' && <PasswordStrengthMeter password={password} />}
            </div>
          )}

          {/* Confirm Password Field */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
                />
              </div>
            </div>
          )}

          {/* Remember session checkbox */}
          {mode === 'login' && (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#E5DFD3] text-[#C9A55B] focus:ring-[#C9A55B] accent-[#C9A55B]"
              />
              <label htmlFor="rememberMe" className="text-xs text-[#6B655F] dark:text-[#AAAAAA] select-none cursor-pointer">
                Recordar mi sesión de forma segura
              </label>
            </div>
          )}

          {/* Captcha Challenge */}
          <CaptchaChallenge 
            onVerify={setIsCaptchaVerified}
            isVerified={isCaptchaVerified}
          />

          {/* Submit Button */}
          <LuxuryButton
            type="submit"
            disabled={isSubmitting || lockoutTimer > 0}
            variant="gold"
            className="w-full py-3 text-xs tracking-wider font-bold shadow-lg flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verificando Credenciales...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Ingresar al Portal'}
                  {mode === 'register' && 'Crear Cuenta ESSENYA'}
                  {mode === 'forgot_password' && 'Enviar Código de Recuperación'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </LuxuryButton>

          {/* Demo Admin Quick Access Helper */}
          {role === 'administrador' && mode === 'login' && (
            <div className="pt-2 border-t border-[#E5DFD3]/60 dark:border-[#262626]">
              <button
                type="button"
                onClick={() => {
                  setEmail('essenya222@gmail.com');
                  setPassword('admin123456');
                  setIsCaptchaVerified(true);
                }}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-[#C9A55B]/50 hover:border-[#C9A55B] bg-[#C9A55B]/5 hover:bg-[#C9A55B]/10 text-[#806020] dark:text-[#C9A55B] text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Rellenar credenciales maestras de administrador (Demo)</span>
              </button>
            </div>
          )}
        </form>
        )}
      </motion.div>
    </div>
  );
};

export default PortalAuthGuard;


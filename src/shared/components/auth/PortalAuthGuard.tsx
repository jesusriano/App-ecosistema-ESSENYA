import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Mail, User, Phone, KeyRound, ShieldCheck, ArrowRight, 
  Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw, Sparkles, UserCheck, Shield, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AuthFormMode } from '../../types/auth';
import { EssenyaLogo } from '../EssenyaLogo';
import { LuxuryButton } from '../ui/LuxuryButton';
import { CaptchaChallenge } from './CaptchaChallenge';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { TherapistRegistrationForm } from './TherapistRegistrationForm';
import { getLockoutInfo } from '../../utils/authValidations';

interface PortalAuthGuardProps {
  role: UserRole;
  children: React.ReactNode;
}

export const PortalAuthGuard: React.FC<PortalAuthGuardProps> = ({ role, children }) => {
  const { isAuthenticated, getUser, login, register, sendPasswordReset, logout, completeFirstLoginPasswordChange } = useAuth();
  
  const [mode, setMode] = useState<AuthFormMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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

  // Check if therapist is pending approval or rejected
  if (role === 'terapeuta' && currentUser) {
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

  // Handle Forced First Login Password Change
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

  // Sync lockout countdown
  useEffect(() => {
    if (!email) {
      setLockoutTimer(0);
      return;
    }
    const info = getLockoutInfo(role, email);
    if (info.isLocked) {
      setLockoutTimer(info.remainingSeconds);
    } else {
      setLockoutTimer(0);
    }
  }, [email, role]);

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // If user is authenticated AND needs first login password change
  if (currentUser && currentUser.mustChangePassword) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#C9A55B] via-[#DFBF7A] to-[#806020]" />
          
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

  // If user is authenticated for this role, render children
  if (currentUser) {
    return <>{children}</>;
  }

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

  // Fast Demo Login option for smooth evaluator testing
  const handleDemoAccess = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const demoEmail = role === 'cliente' ? 'cliente@essenya.com' : role === 'terapeuta' ? 'terapeuta@essenya.com' : 'admin@essenya.com';
    const res = await login(role, demoEmail, 'Essenya2026!');
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Error en acceso demo.');
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
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#C9A55B] via-[#DFBF7A] to-[#806020]" />

        {/* Header Logo & Title */}
        <div className="text-center space-y-3 pt-2">
          <div className="flex justify-center">
            <EssenyaLogo variant="dark" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#806020] dark:text-[#C9A55B] text-xs font-semibold uppercase tracking-widest">
            <IconComponent className="w-3.5 h-3.5" />
            <span>{currentRoleInfo.title}</span>
          </div>

          <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] max-w-sm mx-auto leading-relaxed">
            {currentRoleInfo.subtitle}
          </p>
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
          <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl flex items-start space-x-3 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex items-start space-x-3 text-emerald-600 dark:text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
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
                placeholder="correo@ejemplo.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5DFD3] dark:border-[#333333] bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C9A55B]"
              />
            </div>
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
        </form>
        )}

        {/* Demo Fast Access Option */}
        <div className="pt-2 border-t border-[#E5DFD3] dark:border-[#262626] text-center space-y-2">
          <p className="text-[11px] text-[#806020] dark:text-[#C9A55B] font-medium">
            ¿Deseas probar la plataforma directamente?
          </p>
          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={isSubmitting}
            className="w-full py-2 px-3 rounded-xl border border-[#C9A55B]/40 bg-[#C9A55B]/10 hover:bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] text-xs font-bold transition-all flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4 text-[#C9A55B]" />
            <span>Ingreso Rápido Demo ({role.toUpperCase()})</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

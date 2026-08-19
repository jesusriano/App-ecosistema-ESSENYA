import React, { useState } from 'react';
import { User, ShieldCheck, MapPin, Phone, Mail, Award, CreditCard, Heart, Camera, Upload, CheckCircle2 } from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { useToast } from '../../../context/ToastContext';

export const PerfilPage: React.FC = () => {
  const { client } = useCliente();
  const { showToast } = useToast();
  const [clientPhoto, setClientPhoto] = useState<string>(() => {
    return localStorage.getItem('essenya_client_photo') || client?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setClientPhoto(dataUrl);
        localStorage.setItem('essenya_client_photo', dataUrl);
        showToast('Foto de Perfil Actualizada', 'Tu fotografía de socio VIP se ha guardado exitosamente.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#C9A55B]" />
          <span>Perfil de Usuario VIP</span>
        </h1>
        <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
          Gestión de datos personales, preferencias de terapia y expedientes de seguridad.
        </p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-6">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <img
                src={clientPhoto}
                alt={client?.name || 'Cliente'}
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
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">{client?.name || 'Don Alejandro Garza'}</h2>
                <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {client?.membershipTier || 'Club Black VIP'}
                </span>
              </div>
              <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
                {client?.email || 'alejandro.garza@grupo-garza.com'} • ID Socio: {client?.id || 'cli-1'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <h3 className="font-bold text-[#1C1917] dark:text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#C9A55B]" />
              <span>Dirección Principal de Cobertura</span>
            </h3>
            <div className="p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-xl border border-[#E5DFD3] dark:border-[#262626]">
              <p className="font-semibold text-[#1C1917] dark:text-white">{client?.address || 'Av. Paseo de las Palmas 735, Polanco'}</p>
              <p className="text-[#6B655F] dark:text-[#888888] mt-0.5">Zona: {client?.cityZone || 'Polanco / Lomas CDMX'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-[#1C1917] dark:text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#C9A55B]" />
              <span>Método de Pago Predeterminado</span>
            </h3>
            <div className="p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-xl border border-[#E5DFD3] dark:border-[#262626]">
              <p className="font-semibold text-[#1C1917] dark:text-white">Tarjeta AMEX Centurion •••• 8821</p>
              <p className="text-[#6B655F] dark:text-[#888888] mt-0.5">Facturación automática habilitada CFDI 4.0</p>
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
      </div>
    </div>
  );
};

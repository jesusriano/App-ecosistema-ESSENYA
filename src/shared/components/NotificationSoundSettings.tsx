import React, { useState } from 'react';
import { Volume2, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { NOTIFICATION_SOUND_OPTIONS, getStoredSoundPreference, setStoredSoundPreference, playNotificationSoundById } from '../utils/notificationAudio';
import { useToast } from '../context/ToastContext';

interface NotificationSoundSettingsProps {
  role: 'client' | 'therapist' | 'admin';
  title?: string;
  description?: string;
}

export const NotificationSoundSettings: React.FC<NotificationSoundSettingsProps> = ({
  role,
  title = 'Preferencias de Sonido y Alertas',
  description = 'Elige el sonido ideal para tus notificaciones de reservas y mensajes en tiempo real.'
}) => {
  const [selectedSound, setSelectedSound] = useState<string>(() => getStoredSoundPreference(role));
  const { showToast } = useToast();

  const handleSelectSound = (soundId: string) => {
    setSelectedSound(soundId);
    setStoredSoundPreference(role, soundId);
    playNotificationSoundById(soundId, false, 1);
    showToast('Preferencia Guardada', `Sonido de notificación actualizado exitosamente.`, 'success');
  };

  const handleTestSound = (soundId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playNotificationSoundById(soundId, false, 1);
  };

  return (
    <div className="bg-white dark:bg-[#1E1E1E] border border-[#E5DFD3] dark:border-[#333333] rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/10 flex items-center justify-center text-[#C9A55B]">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] font-sans px-2 py-0.5 bg-[#C9A55B]/10 text-[#806020] dark:text-[#C9A55B] rounded-full border border-[#C9A55B]/20">
              Personalizado
            </span>
          </h3>
          <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        {NOTIFICATION_SOUND_OPTIONS.map((option) => {
          const isSelected = selectedSound === option.id;
          return (
            <div
              key={option.id}
              onClick={() => handleSelectSound(option.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'border-[#C9A55B] bg-[#C9A55B]/5 dark:bg-[#C9A55B]/10 shadow-sm' 
                  : 'border-[#E5DFD3] dark:border-[#333333] hover:border-[#C9A55B]/50 bg-white dark:bg-[#222222]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-[#1C1917] dark:text-white flex items-center gap-1.5">
                    {option.name}
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C9A55B]" />}
                  </h4>
                  <p className="text-[11px] text-[#6B655F] dark:text-[#999999] mt-1 line-clamp-2">
                    {option.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5DFD3]/60 dark:border-[#333333] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#806020] dark:text-[#C9A55B]">
                  {isSelected ? 'Activo' : 'Seleccionar'}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleTestSound(option.id, e)}
                  className="px-2.5 py-1 bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] text-xs font-semibold rounded-lg hover:opacity-90 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Probar este sonido"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Probar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

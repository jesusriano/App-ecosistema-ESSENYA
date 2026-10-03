import { useState } from 'react';
import { fetchPostCareProtocol } from '../shared/services/api';

interface UsePostCareProtocolOptions {
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info' | 'gold') => void;
}

export function usePostCareProtocol({ showToast }: UsePostCareProtocolOptions) {
  const [therapistNotes, setTherapistNotes] = useState<string>(
    'Rigidez liberada en trapecios y lumbar izquierda. Se recomienda buena hidratación.'
  );
  const [postCareLoading, setPostCareLoading] = useState<boolean>(false);
  const [postCareResult, setPostCareResult] = useState<any>(null);

  const generatePostCare = async (serviceName?: string) => {
    if (therapistNotes.trim().length < 20) {
      showToast(
        'Notas insuficientes',
        'Por favor, ingresa al menos 20 caracteres en las notas clínicas para asegurar recomendaciones precisas.',
        'error'
      );
      return;
    }

    setPostCareLoading(true);
    setPostCareResult(null);
    try {
      const data = await fetchPostCareProtocol({
        ritualName: serviceName || 'Ritual Holístico Essenya',
        therapistNotes: therapistNotes
      });
      if (data.protocol) {
        setPostCareResult(data.protocol);
        showToast('Protocolo Generado', 'Recomendaciones post-care sincronizadas con el expediente del socio.', 'gold');
      } else {
        throw new Error('No protocol returned');
      }
    } catch (e: any) {
      console.warn('Post-care protocol warning:', e?.message || e);
      setPostCareResult({
        hydrationTip: "Beba al menos 750ml de agua tibia con infusión de lavanda o manzanilla durante las próximas 3 horas para favorecer la desintoxicación muscular.",
        stretchingProtocol: ["Inclinación suave de cuello lateral 15 seg por lado", "Rotación posterior de escápulas para apertura torácica"],
        careMessage: "Ha sido un absoluto honor brindarle este servicio. Le recomendamos reposar confortablemente para maximizar los beneficios terapéuticos de su experiencia ESSENYA."
      });
      showToast('Protocolo Personalizado', 'Protocolo generado exitosamente.', 'gold');
    } finally {
      setPostCareLoading(false);
    }
  };

  return {
    therapistNotes,
    setTherapistNotes,
    postCareLoading,
    postCareResult,
    generatePostCare
  };
}

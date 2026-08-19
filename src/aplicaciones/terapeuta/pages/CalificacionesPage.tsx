import React from 'react';
import { Star, MessageSquare, Award, ThumbsUp } from 'lucide-react';
import { useTerapeuta } from '../hooks/useTerapeuta';

export const CalificacionesPage: React.FC = () => {
  const { therapist, bookings } = useTerapeuta();

  // Combine static initial feedback with real completed and rated bookings from clients
  const liveReviews = bookings
    .filter(b => b.rating && (b.therapistId === therapist?.id || !b.therapistId))
    .map(b => ({
      id: b.id,
      client: b.clientName || 'Cliente VIP',
      rating: b.rating || 5,
      date: `${b.date} • ${b.serviceName}`,
      comment: b.reviewComment || 'Excelente servicio y puntualidad.',
      zone: b.cityZone || 'CDMX',
    }));

  const initialReviews = [
    {
      id: 'rev-1',
      client: 'Don Alejandro G.',
      rating: 5,
      date: 'Ayer, 18:30',
      comment: 'Servicio excepcional. La atención y puntualidad en Paseo de las Palmas es impecable.',
      zone: 'Polanco / Lomas',
    },
    {
      id: 'rev-2',
      client: 'Sra. Beatriz V.',
      rating: 5,
      date: 'Hace 3 días',
      comment: 'Técnica de tejido profundo excelente. Sentí alivio inmediato en espalda y cervicales.',
      zone: 'Bosques de las Lomas',
    },
  ];

  const allReviews = [...liveReviews, ...initialReviews];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-[#C9A55B]" />
          <span>Calificaciones y Reseñas VIP</span>
        </h1>
        <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
          Puntuación de satisfacción otorgada por los clientes de la red ESSENYA.
        </p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-6 flex items-center space-x-6">
        <div className="text-center border-r border-[#E5DFD3] dark:border-[#262626] pr-6">
          <span className="text-4xl font-serif font-bold text-[#806020] dark:text-[#C9A55B]">{therapist?.rating || '4.9'}</span>
          <div className="flex items-center justify-center my-1 text-[#C9A55B]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-[#C9A55B]" />
            ))}
          </div>
          <span className="text-[10px] text-[#6B655F] dark:text-[#888888]">{therapist?.reviewCount || 128} Reseñas</span>
        </div>

        <div className="space-y-1 text-xs">
          <p className="font-bold text-[#1C1917] dark:text-white">Estándar de Excelencia ESSENYA</p>
          <p className="text-[#6B655F] dark:text-[#888888] leading-relaxed">
            Mantener una calificación superior a 4.8 otorga bonos mensuales de retención y prioridad en solicitudes ejecutivas VIP.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {allReviews.map((r) => (
          <div key={r.id} className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-xs text-[#1C1917] dark:text-white">{r.client}</span>
              <span className="text-[10px] text-[#6B655F] dark:text-[#888888]">{r.date}</span>
            </div>
            <div className="flex items-center space-x-1 text-[#C9A55B]">
              {[...Array(r.rating)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-[#C9A55B]" />
              ))}
            </div>
            <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] italic">"{r.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

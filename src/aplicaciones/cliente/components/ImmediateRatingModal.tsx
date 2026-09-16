import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Sparkles, X, CheckCircle, Heart, ThumbsUp } from 'lucide-react';
import { Booking } from '../../../shared/types';

interface ImmediateRatingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onRate: (bookingId: string, rating: number, comment: string) => void;
}

export const ImmediateRatingModal: React.FC<ImmediateRatingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onRate,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen || !booking) return null;

  const therapistName = booking.therapistName || 'tu masajista';
  const therapistPhoto = booking.therapistPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80';

  const quickTags = [
    'Excelente técnica y presión',
    'Muy puntual y profesional',
    'Aromaterapia y música relajante',
    'Alivio total de nudos y tensión',
    'Atención impecable'
  ];

  const handleSelectTag = (tag: string) => {
    if (!comment) {
      setComment(tag);
    } else if (!comment.includes(tag)) {
      setComment(prev => `${prev}. ${tag}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalComment = comment.trim() || 'Servicio excelente y altamente recomendado.';
    onRate(booking.id, rating, finalComment);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2000);
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 5: return '⭐⭐⭐⭐⭐ Extraordinario (5/5)';
      case 4: return '⭐⭐⭐⭐ Muy Bueno (4/5)';
      case 3: return '⭐⭐⭐ Bueno (3/5)';
      case 2: return '⭐⭐ Regular (2/5)';
      case 1: return '⭐ A Mejorar (1/5)';
      default: return '⭐⭐⭐⭐⭐ Extraordinario (5/5)';
    }
  };

  const displayStars = hoverRating !== null ? hoverRating : rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#141414] border-2 border-[#C9A55B]/60 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-left sm:my-auto mt-auto flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#C9A55B]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#F5F1EA] dark:hover:bg-[#222222] transition-colors z-20"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {isSubmitted ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">
                  ¡Gracias por tu Calificación!
                </h3>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                  Tu mensaje y puntuación de {rating} estrellas han sido enviados a <strong>{therapistName}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 custom-scrollbar">
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="inline-flex items-center space-x-1.5 bg-[#C9A55B]/15 border border-[#C9A55B]/40 px-3 py-1 rounded-full text-[11px] font-bold text-[#806020] dark:text-[#C9A55B] uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Masaje Finalizado</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] dark:text-white leading-tight">
                    ¿Cómo estuvo tu experiencia?
                  </h2>
                  <p className="text-[11px] sm:text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                    Tu masajista ha concluido la sesión de <strong>{booking.serviceName}</strong>. Déjale una calificación y mensaje personal.
                  </p>
                </div>

                {/* Therapist Card Preview */}
                <div className="flex items-center space-x-3.5 bg-[#FAF6EE] dark:bg-[#1C1A17] p-3.5 rounded-2xl border border-[#C9A55B]/30 shadow-sm">
                  <img
                    src={therapistPhoto}
                    alt={therapistName}
                    className="w-13 h-13 rounded-full object-cover border-2 border-[#C9A55B] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-[#1C1917] dark:text-white truncate">
                      {therapistName}
                    </h4>
                    <p className="text-[11px] text-[#806020] dark:text-[#C9A55B] font-semibold">
                      Terapeuta Certificada ESSENYA
                    </p>
                    <p className="text-[10px] text-[#6B655F] dark:text-[#888888] truncate">
                      {booking.clientAddress}
                    </p>
                  </div>
                </div>

                {/* Star Rating Selector */}
                <div className="bg-[#FAF8F5] dark:bg-[#181818] p-4 rounded-2xl border border-[#E5DFD3] dark:border-[#2C2C2C] shadow-inner">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-[#806020] dark:text-[#C9A55B] block mb-2 tracking-widest">
                      {getRatingLabel(displayStars)}
                    </span>
                    <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                          title={`${star} estrellas`}
                        >
                          <Star
                            className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                              star <= displayStars
                                ? 'text-[#C9A55B] fill-[#C9A55B] drop-shadow-[0_0_8px_rgba(201,165,91,0.4)]'
                                : 'text-gray-300 dark:text-gray-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Tags Suggestions */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#6B655F] dark:text-[#AAAAAA] font-bold block">
                    Añadir rápido:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSelectTag(tag)}
                        className="text-[10px] sm:text-[11px] bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] hover:border-[#C9A55B] hover:text-[#806020] dark:hover:text-[#C9A55B] text-[#6B655F] dark:text-[#CCCCCC] px-3 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="space-y-2 pb-4">
                  <label className="text-[10px] uppercase tracking-widest text-[#6B655F] dark:text-[#AAAAAA] font-bold block">
                    Mensaje para {therapistName}:
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={`Escribe aquí tu mensaje o comentario para ${therapistName}...`}
                    className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl p-4 text-xs sm:text-sm text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] focus:ring-1 focus:ring-[#C9A55B] shadow-sm resize-none"
                  />
                </div>
              </div>

              {/* Fixed Footer Actions */}
              <div className="p-6 bg-white dark:bg-[#141414] border-t border-[#E5DFD3] dark:border-[#333333] flex flex-col sm:flex-row items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 px-4 py-4 rounded-xl border border-[#E5DFD3] dark:border-[#333333] text-[11px] sm:text-xs font-bold text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white transition-colors text-center order-2 sm:order-1"
                >
                  Recordármelo más tarde
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-[2] py-4 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-extrabold text-xs sm:text-sm rounded-xl hover:opacity-95 shadow-lg shadow-[#C9A55B]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer order-1 sm:order-2"
                >
                  <Star className="w-4 h-4 fill-black" />
                  <span>Enviar Calificación</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

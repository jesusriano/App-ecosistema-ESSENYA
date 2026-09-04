import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, Gift, Copy, Check, Plus, Calendar, Clock, ArrowRight,
  ShieldCheck, AlertCircle, Sparkles, CheckCircle2, RefreshCw,
  Heart, Send, Share2, CreditCard, DollarSign, X, MessageSquare
} from 'lucide-react';
import { 
  getGiftCards, 
  purchaseGiftCard, 
  redeemExternalGiftCard,
  validateGiftCardCode,
  GiftCard 
} from '../services/billeteraService';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { useToast } from '../../../shared/context/ToastContext';
import { useCliente } from '../hooks/useCliente';
import { useAuth } from '../../../shared/context/AuthContext';

interface BilleteraPageProps {
  onGoToReservas: () => void;
}

export const BilleteraPage: React.FC<BilleteraPageProps> = ({ onGoToReservas }) => {
  const { showToast } = useToast();
  const { client } = useCliente();
  const { getUser } = useAuth();
  const authUser = getUser('cliente');

  const [cards, setCards] = useState<GiftCard[]>(() => getGiftCards());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal de compra de tarjeta de regalo ($1,400 MXN)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [senderName, setSenderName] = useState<string>(() => {
    return authUser?.nombre ? `${authUser.nombre} ${authUser.apellidos || ''}`.trim() : (client?.name || '');
  });
  const [customMessage, setCustomMessage] = useState<string>('¡Feliz día! Te regalo esta sesión de masaje terapéutico de autor en ESSENYA para que te relajes y renueves energías.');
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'transferencia'>('tarjeta');
  const [isProcessingPurchase, setIsProcessingPurchase] = useState<boolean>(false);
  const [justPurchasedCard, setJustPurchasedCard] = useState<GiftCard | null>(null);

  // Canjear tarjeta recibida
  const [redeemCodeInput, setRedeemCodeInput] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'compradas' | 'recibidas'>('compradas');

  // El saldo en cuenta únicamente computa tarjetas recibidas/canjeadas para uso propio, NUNCA regalos que se compraron para obsequiar a otros
  const giftCardsForOthers = cards.filter(c => c.isGiftForSomeoneElse);
  const myRedeemedCards = cards.filter(c => !c.isGiftForSomeoneElse);
  const personalAvailableBalance = myRedeemedCards.reduce(
    (acc, c) => acc + (c.status !== 'agotada' && c.status !== 'vencida' ? c.currentBalance : 0),
    0
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('Código Copiado', `El código ${code} ha sido copiado a tu portapapeles.`, 'gold');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleShareWhatsApp = (card: GiftCard) => {
    const text = encodeURIComponent(
      `¡Hola ${card.recipientName || 'querido/a amigo/a'}! 🌿✨\n\nTe he enviado una Tarjeta de Regalo ESSENYA Haute Wellness por un valor de $1,400 MXN.\n\nDedicatoria: "${card.customMessage}"\n\nTu Código de Regalo para agendar tu masaje terapéutico a domicilio es: *${card.code}*\n\n¡Disfruta de una experiencia sublime de bienestar!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      showToast('Falta Destinatario', 'Por favor ingresa el nombre de la persona a quien le darás el regalo.', 'error');
      return;
    }

    setIsProcessingPurchase(true);
    setTimeout(() => {
      const newCard = purchaseGiftCard({
        recipientName,
        recipientContact,
        senderName,
        customMessage,
        paymentMethod
      });
      setCards(getGiftCards());
      setIsProcessingPurchase(false);
      setJustPurchasedCard(newCard);
      showToast(
        '¡Tarjeta de Regalo Adquirida con Éxito!',
        `Se procesó la compra por $1,400 MXN. Tu cupón de regalo para ${recipientName} está listo para ser obsequiado.`,
        'success'
      );
    }, 800);
  };

  const handleClosePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setJustPurchasedCard(null);
    setRecipientName('');
    setRecipientContact('');
  };

  const handleRedeemCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCodeInput.trim()) {
      showToast('Código Requerido', 'Ingresa el código de la tarjeta de regalo que recibiste.', 'error');
      return;
    }

    setIsRedeeming(true);
    setTimeout(() => {
      const result = redeemExternalGiftCard(redeemCodeInput);
      setIsRedeeming(false);
      if (result.valid && result.card) {
        setCards(getGiftCards());
        showToast('Tarjeta de Regalo Canjeada', result.message, 'success');
        setRedeemCodeInput('');
        setActiveTab('recibidas');
      } else {
        showToast('No se pudo canjear', result.message, 'error');
      }
    }, 600);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-5">
        <div>
          <div className="inline-flex items-center space-x-2 bg-[#C9A55B]/15 border border-[#C9A55B]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#806020] dark:text-[#C9A55B] mb-2">
            <Gift className="w-3.5 h-3.5" />
            <span>Tarjetas de Regalo & Billetera</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] dark:text-white">
            Tarjetas de Regalo ESSENYA
          </h1>
          <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1 max-w-xl">
            Obsequia una experiencia sublime de bienestar a quien más quieres. Compra una tarjeta de regalo por <strong>$1,400 MXN</strong> con dedicatoria personalizada para consentir a alguien especial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setJustPurchasedCard(null);
              setIsPurchaseModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] via-[#C9A55B] to-[#9A7B38] hover:from-[#E6CA65] hover:to-[#B38728] text-black rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-[#C9A55B]/30 transition-all cursor-pointer"
          >
            <Gift className="w-4 h-4 text-black" />
            <span>Comprar Regalo ($1,400 MXN)</span>
          </motion.button>

          <LuxuryButton variant="outline" size="sm" onClick={onGoToReservas}>
            <Calendar className="w-4 h-4 mr-1.5" />
            <span>Reservar Cita</span>
          </LuxuryButton>
        </div>
      </div>

      {/* Hero Banner: Regalar a alguien especial */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1C1917] via-[#2B2217] to-[#141210] border border-[#C9A55B]/50 text-white shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#C9A55B]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-[#C9A55B]/20 text-[#E6CA65] border border-[#C9A55B]/40 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 text-[#E6CA65] fill-[#E6CA65]" />
            <span>El obsequio ideal de bienestar</span>
          </span>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-white leading-tight">
            ¿Deseas regalar un momento inolvidable de desconexión y paz?
          </h2>

          <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed">
            Adquiere una <strong>Tarjeta de Regalo ESSENYA de $1,400 MXN</strong> para dársela a tu pareja, amigo, familiar o colega. Incluye dedicatoria personalizada, código único y vigencia de 12 meses para cualquier masaje terapéutico de autor.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setJustPurchasedCard(null);
                setIsPurchaseModalOpen(true);
              }}
              className="px-5 py-2.5 bg-[#C9A55B] hover:bg-[#E6CA65] text-black font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>Comprar Tarjeta de Regalo ($1,400 MXN)</span>
            </button>

            <span className="text-xs text-[#E6CA65] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Costo de compra: $1,400 MXN • Entrega digital inmediata</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Tarjetas Compradas para Otros vs Canjear / Recibidas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
        <div className="flex items-center space-x-2 bg-[#FAF8F5] dark:bg-[#141414] p-1 rounded-2xl border border-[#E5DFD3] dark:border-[#262626]">
          <button
            onClick={() => setActiveTab('compradas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'compradas'
                ? 'bg-[#C9A55B] text-black shadow-xs'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Regalos Comprados para Obsequiar ({giftCardsForOthers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recibidas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'recibidas'
                ? 'bg-[#C9A55B] text-black shadow-xs'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>¿Te regalaron una? Canjear Código ({myRedeemedCards.length})</span>
          </button>
        </div>

        {personalAvailableBalance > 0 ? (
          <div className="text-xs text-[#6B655F] dark:text-[#888888] flex items-center gap-2">
            <span>Saldo canjeado disponible para citas:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-black">${personalAvailableBalance.toLocaleString()} MXN</strong>
          </div>
        ) : (
          <div className="text-xs text-[#6B655F] dark:text-[#888888] flex items-center gap-2">
            <span>Saldo en billetera:</span>
            <span className="text-[#888888] dark:text-[#666666] text-xs font-semibold">$0 MXN (Sin cupones canjeados)</span>
          </div>
        )}
      </div>

      {/* SECTION 1: Regalos comprados para obsequiar a otros */}
      {activeTab === 'compradas' && (
        <div className="space-y-6">
          {giftCardsForOthers.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#C9A55B]/15 text-[#C9A55B] flex items-center justify-center">
                <Gift className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">
                  Aún no has comprado regalos para obsequiar
                </h3>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                  Sorprende a un ser querido con una Tarjeta de Regalo de $1,400 MXN. Podrá canjearla en su domicilio por un masaje terapéutico exclusivo.
                </p>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="px-5 py-2 bg-[#C9A55B] text-black font-bold text-xs rounded-xl hover:bg-[#E6CA65] transition-all cursor-pointer"
              >
                Comprar Tarjeta de Regalo ($1,400 MXN)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {giftCardsForOthers.map((card) => {
                const isExhausted = card.status === 'agotada' || card.currentBalance <= 0;

                return (
                  <div
                    key={card.id}
                    className="relative rounded-3xl p-6 bg-gradient-to-br from-[#1C1917] via-[#2A2318] to-[#171512] text-white border border-[#C9A55B]/60 shadow-xl overflow-hidden flex flex-col justify-between space-y-5"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#C9A55B]/15 rounded-full blur-2xl pointer-events-none" />

                    {/* Card Header */}
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#E6CA65] block">
                          ESSENYA • REGALO EXCLUSIVO
                        </span>
                        <h3 className="font-serif font-bold text-lg text-white mt-0.5">
                          Para: {card.recipientName || 'Alguien Especial'}
                        </h3>
                        <p className="text-[11px] text-[#AAAAAA]">
                          De parte de: <strong>{card.senderName || 'Alejandro Morales'}</strong>
                        </p>
                      </div>

                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#C9A55B]/20 text-[#E6CA65] border border-[#C9A55B]/40">
                        Valor: $1,400 MXN
                      </span>
                    </div>

                    {/* Dedicatoria */}
                    {card.customMessage && (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-[#E5DFD3] italic relative z-10 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-[#C9A55B] shrink-0 mt-0.5" />
                        <p className="line-clamp-2">"{card.customMessage}"</p>
                      </div>
                    )}

                    {/* Card Code Strip */}
                    <div className="bg-black/60 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between gap-3 relative z-10">
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] text-[#AAAAAA] uppercase block font-semibold">
                          Código de Regalo para Entregar
                        </span>
                        <span className="font-mono font-black text-base text-[#E6CA65] tracking-wider truncate block">
                          {card.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopyCode(card.code)}
                          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Copiar código"
                        >
                          {copiedCode === card.code ? (
                            <Check className="w-4 h-4 text-[#E6CA65]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleShareWhatsApp(card)}
                          className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Enviar regalo por WhatsApp al destinatario"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Enviar por WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#AAAAAA] relative z-10">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C9A55B]" />
                        <span>Vigencia: {card.expirationDate} (12 Meses)</span>
                      </div>
                      <span className="text-emerald-400 font-bold">Pagado: $1,400 MXN</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Canjear Tarjeta Recibida */}
      {activeTab === 'recibidas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="max-w-xl space-y-2">
              <span className="inline-flex items-center gap-1 bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                <Gift className="w-3 h-3" />
                <span>Canje de Obsequio</span>
              </span>
              <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
                ¿Alguien te obsequió una Tarjeta de Regalo ESSENYA?
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                Ingresa el código que te compartieron (ej. <code>REGALO-ESS-1400</code>). Validaremos su saldo de <strong>$1,400 MXN</strong> y se añadirá de inmediato para pagar tus citas.
              </p>
            </div>

            <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-2.5 max-w-lg pt-1">
              <input
                type="text"
                value={redeemCodeInput}
                onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                placeholder="Ej. REGALO-ESS-1400"
                className="flex-1 bg-[#FAF8F5] dark:bg-[#1E1E1E] border border-[#E5DFD3] dark:border-[#333333] px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
              />
              <button
                type="submit"
                disabled={isRedeeming}
                className="px-5 py-2.5 bg-[#C9A55B] hover:bg-[#E6CA65] text-black font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                {isRedeeming ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Canjear y Abonar $1,400</span>
              </button>
            </form>
          </div>

          {/* Tarjetas canjeadas disponibles para citas */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#1C1917] dark:text-white">
              Tarjetas Disponibles para tus Citas
            </h4>

            {myRedeemedCards.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FAF8F5] dark:bg-[#181818] border border-dashed border-[#E5DFD3] dark:border-[#333333] text-center space-y-1">
                <p className="text-xs font-semibold text-[#1C1917] dark:text-white">
                  No tienes saldo de tarjetas de regalo canjeadas en este momento
                </p>
                <p className="text-[11px] text-[#6B655F] dark:text-[#888888]">
                  Si un amigo o familiar te obsequió una tarjeta de regalo ESSENYA, introduce el código arriba para abonarla a tu cuenta.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myRedeemedCards.map((card) => (
                  <div 
                    key={card.id}
                    className="bg-white dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] rounded-2xl p-4 flex justify-between items-center"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#888888] font-mono block">{card.code}</span>
                      <span className="font-serif font-bold text-sm text-[#1C1917] dark:text-white block">
                        ${card.currentBalance.toLocaleString()} MXN disponibles
                      </span>
                      <span className="text-[10px] text-[#6B655F] dark:text-[#AAAAAA]">
                        Vigencia: {card.expirationDate}
                      </span>
                    </div>

                    <LuxuryButton size="sm" variant="gold" onClick={onGoToReservas}>
                      <span>Usar en Cita</span>
                    </LuxuryButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: COMPRA DE TARJETA DE REGALO ($1,400 MXN) */}
      <AnimatePresence>
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-[#161616] border border-[#E5DFD3] dark:border-[#2B2B2B] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
            >
              {/* Gold Top Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#C9A55B] to-[#9A7B38]" />

              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    <Gift className="w-3 h-3 text-[#C9A55B]" />
                    <span>Compra para Obsequiar</span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">
                    Comprar Tarjeta de Regalo ($1,400 MXN)
                  </h3>
                  <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                    El regalo de bienestar ideal para que otra persona disfrute un masaje de autor en su hogar.
                  </p>
                </div>

                <button
                  onClick={handleClosePurchaseModal}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!justPurchasedCard ? (
                <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                  {/* Precio de Compra destacado */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1E1E1E] border border-[#C9A55B]/40 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#888888] block">
                        Costo a Pagar por el Regalo:
                      </span>
                      <span className="font-serif font-extrabold text-2xl text-[#806020] dark:text-[#E6CA65]">
                        $1,400 MXN
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      Válido por 12 Meses
                    </span>
                  </div>

                  {/* Destinatario */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1917] dark:text-white block">
                      ¿Para quién es el regalo? (Nombre del Destinatario) *
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Ej. Sofía Valenzuela, Mamá, Andrea..."
                      className="w-full bg-[#FAF8F5] dark:bg-[#1F1F1F] border border-[#E5DFD3] dark:border-[#333333] px-3.5 py-2 rounded-xl text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  {/* WhatsApp del destinatario (opcional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1917] dark:text-white block">
                      WhatsApp o Teléfono del Destinatario (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={recipientContact}
                      onChange={(e) => setRecipientContact(e.target.value)}
                      placeholder="Ej. +52 55 1234 5678"
                      className="w-full bg-[#FAF8F5] dark:bg-[#1F1F1F] border border-[#E5DFD3] dark:border-[#333333] px-3.5 py-2 rounded-xl text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  {/* De parte de quién */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1917] dark:text-white block">
                      ¿De parte de quién? (Tu Nombre)
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Ej. Alejandro Morales"
                      className="w-full bg-[#FAF8F5] dark:bg-[#1F1F1F] border border-[#E5DFD3] dark:border-[#333333] px-3.5 py-2 rounded-xl text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  {/* Dedicatoria personalizada */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1917] dark:text-white block">
                      Dedicatoria o Mensaje Personalizado
                    </label>
                    <textarea
                      rows={2}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Escribe unas palabras de felicitación o cariño..."
                      className="w-full bg-[#FAF8F5] dark:bg-[#1F1F1F] border border-[#E5DFD3] dark:border-[#333333] px-3.5 py-2 rounded-xl text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  {/* Método de Pago para pagar los $1,400 */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-[#1C1917] dark:text-white block">
                      Método de Pago para liquidar la compra ($1,400 MXN)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('tarjeta')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          paymentMethod === 'tarjeta'
                            ? 'bg-[#C9A55B]/15 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B]'
                            : 'bg-[#FAF8F5] dark:bg-[#1E1E1E] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#888888]'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Tarjeta AMEX/Visa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          paymentMethod === 'transferencia'
                            ? 'bg-[#C9A55B]/15 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B]'
                            : 'bg-[#FAF8F5] dark:bg-[#1E1E1E] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#888888]'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Transferencia SPEI</span>
                      </button>
                    </div>
                  </div>

                  {/* Botón de pago */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isProcessingPurchase}
                      className="w-full py-3 bg-gradient-to-r from-[#D4AF37] via-[#C9A55B] to-[#9A7B38] hover:from-[#E6CA65] hover:to-[#B38728] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#C9A55B]/30 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isProcessingPurchase ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                          <span>Procesando pago de $1,400 MXN...</span>
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4 text-black" />
                          <span>Pagar $1,400 MXN y Generar Tarjeta de Regalo</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Pantalla de Éxito y entrega del regalo */
                <div className="space-y-5 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center">
                    <Check className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
                      ¡Regalo Adquirido Exitosamente!
                    </h4>
                    <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                      Se ha generado la tarjeta digital de $1,400 MXN lista para obsequiar a <strong>{justPurchasedCard.recipientName}</strong>.
                    </p>
                  </div>

                  {/* Tarjeta Digital Lista */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1C1917] to-[#2B2317] text-white border border-[#C9A55B] text-left space-y-3 shadow-lg">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-[#E6CA65] font-bold tracking-widest uppercase">
                        ESSENYA HAUTE WELLNESS
                      </span>
                      <span className="text-xs font-black text-[#E6CA65]">$1,400 MXN</span>
                    </div>

                    <div>
                      <p className="text-xs text-[#CCCCCC]">Para: <strong className="text-white">{justPurchasedCard.recipientName}</strong></p>
                      <p className="text-[11px] text-[#AAAAAA]">De: {justPurchasedCard.senderName}</p>
                    </div>

                    <div className="bg-black/60 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[#888888] block">Código de Canje:</span>
                        <span className="font-mono font-black text-base text-[#E6CA65] tracking-wider">
                          {justPurchasedCard.code}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(justPurchasedCard.code)}
                        className="px-3 py-1.5 bg-[#C9A55B] hover:bg-[#E6CA65] text-black rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode === justPurchasedCard.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>

                  {/* Acciones de Entrega */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => handleShareWhatsApp(justPurchasedCard)}
                      className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Enviar por WhatsApp a {justPurchasedCard.recipientName}</span>
                    </button>

                    <button
                      onClick={handleClosePurchaseModal}
                      className="w-full py-2.5 bg-[#FAF8F5] dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] text-xs font-bold text-[#1C1917] dark:text-white rounded-xl hover:bg-[#E5DFD3]/50 transition-all cursor-pointer"
                    >
                      Cerrar y Ver en Mis Regalos Comprados
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

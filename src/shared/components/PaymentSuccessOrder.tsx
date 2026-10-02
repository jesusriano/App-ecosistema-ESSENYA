import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const PaymentSuccessOrder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('bookingId');
  const amountParam = searchParams.get('amount') || searchParams.get('total');
  const amountVal = amountParam ? Number(amountParam) : 1100;

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0D0D0D]">
      <section className="bg-white dark:bg-[#181818] border border-[#E5DFD3] dark:border-[#333333] flex flex-col w-full max-w-[420px] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D8B76C] via-[#C9A55B] to-[#806020]" />

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#806020] dark:text-[#C9A55B] font-bold">
            Pago Confirmado
          </span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] dark:text-white">
            Thanks for your order!
          </h1>
        </div>

        {/* User requested paragraph and markup */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626]">
          <p className="text-sm font-medium text-[#1C1917] dark:text-white leading-relaxed m-0">
            We appreciate your business! If you have any questions, please email{' '}
            <a 
              href="mailto:orders@example.com" 
              className="text-[#635BFF] dark:text-[#C9A55B] font-bold underline hover:opacity-80 transition-opacity"
            >
              orders@example.com
            </a>.
          </p>
        </div>

        {(sessionId || bookingId) && (
          <div className="text-[11px] font-mono text-[#888888] space-y-0.5 text-left bg-black/5 dark:bg-black/40 p-3 rounded-xl border border-[#E5DFD3]/40 dark:border-[#262626]">
            {bookingId && <div>Ref: <span className="text-[#C9A55B] font-bold">{bookingId}</span></div>}
            {sessionId && <div className="truncate">Session: {sessionId}</div>}
          </div>
        )}

        <div className="pt-2">
          <Link
            to="/cliente"
            className="w-full py-3 px-4 bg-gradient-to-r from-[#D8B76C] via-[#C9A55B] to-[#9A7B38] text-white font-bold text-xs tracking-wider uppercase rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ir al Portal de Clientes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PaymentSuccessOrder;

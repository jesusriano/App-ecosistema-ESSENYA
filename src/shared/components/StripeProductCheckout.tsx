import React from 'react';

export const StripeProductCheckout: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#FAF8F5] dark:bg-[#0D0D0D] rounded-3xl border border-[#E5DFD3] dark:border-[#262626] shadow-xl max-w-md mx-auto my-6">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#806020] dark:text-[#C9A55B] font-bold mb-3">
        Stripe Checkout Integration
      </span>

      <section className="bg-white dark:bg-[#181818] border border-[#E5DFD3] dark:border-[#333333] flex flex-col w-full max-w-[400px] rounded-2xl overflow-hidden shadow-md">
        <div className="product flex items-center p-4 gap-4">
          <img 
            src="https://i.imgur.com/EHyR2nP.png" 
            alt="The cover of Stubborn Attachments" 
            className="w-16 h-16 rounded-xl object-cover shadow-xs border border-[#E5DFD3] dark:border-[#333333]"
          />
          <div className="description flex flex-col justify-center">
            <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white m-0">
              Stubborn Attachments
            </h3>
            <h5 className="font-mono text-sm text-[#806020] dark:text-[#C9A55B] font-semibold mt-1 m-0">
              $20.00 MXN
            </h5>
          </div>
        </div>

        <form action="/create-checkout-session" method="POST" className="m-0">
          <input type="hidden" name="serviceName" value="Stubborn Attachments" />
          <input type="hidden" name="total" value="20" />
          <input type="hidden" name="redirect" value="true" />
          <button 
            type="submit" 
            id="checkout-button"
            className="w-full py-3.5 px-4 bg-[#635BFF] hover:bg-[#534BE5] text-white font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            Checkout con Stripe
          </button>
        </form>
      </section>

      <p className="text-[11px] text-[#888888] text-center mt-3">
        Invocación directa al endpoint oficial <code className="font-mono text-[#C9A55B]">POST /create-checkout-session</code>
      </p>
    </div>
  );
};

export default StripeProductCheckout;

import React from 'react';
import { Globe, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';
import { ServiceItem, PortalType } from '../types';
import { EssenyaLogo } from './EssenyaLogo';

interface CorporateWebsiteProps {
  services: ServiceItem[];
  onStartBooking: () => void;
  onSelectPortal: (portal: PortalType) => void;
}

export const CorporateWebsite: React.FC<CorporateWebsiteProps> = ({
  onStartBooking,
  onSelectPortal,
}) => {
  return (
    <div className="min-h-[85vh] bg-[#0D0D0D] text-white flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#141414] border border-[#C9A55B]/30 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Subtle Gold Ambient Light */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#C9A55B]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#C9A55B]/10 rounded-full blur-3xl"></div>

        <div className="flex justify-center">
          <EssenyaLogo size="lg" showText={true} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 bg-[#1A1A1A] border border-[#C9A55B]/30 px-3 py-1 rounded-full">
            <Globe className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span className="text-[11px] font-mono font-bold text-[#C9A55B] uppercase tracking-wider">
              Sitio Web Oficial
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            ESSENYA México
          </h2>

          <p className="text-xs text-[#888888] max-w-md mx-auto leading-relaxed">
            Accede al portal oficial institucional de ESSENYA México a través del enlace web oficial:
          </p>
        </div>

        {/* Highlighted Link Box */}
        <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/15 border border-[#C9A55B]/30 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-[#C9A55B]" />
            </div>
            <div>
              <span className="text-[10px] text-[#888888] font-mono block uppercase">Enlace Web</span>
              <a 
                href="https://essenyamexico.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-bold text-[#C9A55B] hover:underline font-mono"
              >
                https://essenyamexico.com/
              </a>
            </div>
          </div>

          <a 
            href="https://essenyamexico.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 bg-[#C9A55B] hover:bg-[#D8B46B] text-black font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shrink-0 cursor-pointer shadow-lg"
          >
            <span>Abrir Sitio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {}}
            disabled
            className="w-full py-3 px-4 bg-[#1A1A1A] border border-[#C9A55B]/40 text-[#C9A55B] font-bold text-xs rounded-xl flex items-center justify-center space-x-2 opacity-85 cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-[#C9A55B]" />
            <span>Próximamente</span>
          </button>

          <button
            onClick={() => onSelectPortal('client')}
            className="w-full py-3 px-4 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-stone-300 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>App Clientes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


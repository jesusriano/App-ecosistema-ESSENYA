import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Check, AlertCircle, Bot } from 'lucide-react';

interface CaptchaChallengeProps {
  onVerify: (isValid: boolean) => void;
  isVerified: boolean;
  theme?: 'dark' | 'light';
}

export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({
  onVerify,
  isVerified,
}) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState(false);

  const generateChallenge = useCallback(() => {
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
    setError(false);
    onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    generateChallenge();
  }, [generateChallenge]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setUserAnswer(val);
    const expected = (num1 + num2).toString();
    if (val === expected) {
      setError(false);
      onVerify(true);
    } else {
      if (val.length >= expected.length) {
        setError(true);
      } else {
        setError(false);
      }
      onVerify(false);
    }
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] p-3.5 rounded-2xl space-y-2.5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${isVerified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-[#C9A55B]/10 text-[#C9A55B]'}`}>
            {isVerified ? <ShieldCheck className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917] dark:text-white">
            Verificación de Seguridad
          </span>
        </div>

        <button
          type="button"
          onClick={generateChallenge}
          title="Generar nuevo código de verificación"
          className="text-[#806020] dark:text-[#C9A55B] hover:opacity-80 transition-opacity p-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {isVerified ? (
        <div className="flex items-center space-x-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
          <Check className="w-4 h-4 shrink-0" />
          <span>Verificación humana completada exitosamente</span>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <div className="bg-white dark:bg-[#0D0D0D] border border-[#C9A55B]/40 px-3 py-1.5 rounded-xl text-xs font-bold text-[#806020] dark:text-[#C9A55B] tracking-wider select-none shrink-0 shadow-xs">
            ¿Cuánto es {num1} + {num2}?
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={userAnswer}
              onChange={handleInput}
              placeholder="Respuesta"
              className={`w-full px-3 py-1.5 text-xs rounded-xl border bg-white dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white placeholder:text-[#A8A29E] focus:outline-none transition-all ${
                error 
                  ? 'border-red-500 ring-1 ring-red-500' 
                  : 'border-[#E5DFD3] dark:border-[#333333] focus:border-[#C9A55B]'
              }`}
            />
          </div>
        </div>
      )}

      {error && !isVerified && (
        <p className="text-[11px] text-red-500 flex items-center space-x-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Respuesta incorrecta. Inténtalo de nuevo.</span>
        </p>
      )}
    </div>
  );
};

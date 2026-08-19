import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePasswordStrength } from '../../utils/authValidations';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const result = validatePasswordStrength(password);
  const { score, label, color, requirements } = result;

  const requirementList = [
    { key: 'minLength', label: '8+ caracteres' },
    { key: 'hasUppercase', label: 'Mayúscula' },
    { key: 'hasLowercase', label: 'Minúscula' },
    { key: 'hasNumber', label: 'Número (0-9)' },
    { key: 'hasSpecialChar', label: 'Símbolo (!@#$)' },
  ];

  return (
    <div className="space-y-2 mt-2 bg-white/50 dark:bg-[#141414]/50 p-2.5 rounded-xl border border-[#E5DFD3] dark:border-[#262626]">
      {/* Visual Bar */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-[#806020] dark:text-[#C9A55B]">
          Fortaleza de contraseña:
        </span>
        <span className={`font-bold ${color.replace('bg-', 'text-')}`}>
          {label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              score >= step ? color : 'bg-[#E5DFD3] dark:bg-[#333333]'
            }`}
          />
        ))}
      </div>

      {/* Requirement Checklist */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {requirementList.map((req) => {
          const isMet = requirements[req.key as keyof typeof requirements];
          return (
            <span
              key={req.key}
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                isMet
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-stone-100 dark:bg-[#222222] text-[#A8A29E] border border-stone-200 dark:border-[#333333]'
              }`}
            >
              {isMet ? (
                <Check className="w-2.5 h-2.5 shrink-0" />
              ) : (
                <X className="w-2.5 h-2.5 shrink-0" />
              )}
              <span>{req.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface LuxuryButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'gold' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const LuxuryButton: React.FC<LuxuryButtonProps> = ({
  children,
  variant = 'gold',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl space-x-1.5',
    md: 'px-5 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-2xl space-x-2',
    lg: 'px-7 py-3.5 text-sm font-semibold uppercase tracking-widest rounded-2xl space-x-2.5',
  }[size];

  const variantClasses = {
    gold: 'bg-gradient-to-r from-[#D8B76C] via-[#C9A55B] to-[#9A7B38] text-white shadow-lg shadow-[#C9A55B]/20 hover:shadow-[#C9A55B]/35 border border-[#E6CA65]/30',
    primary: 'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] shadow-md hover:shadow-lg',
    secondary: 'bg-[#F5F1EA] dark:bg-[#222222] text-[#1C1917] dark:text-white border border-[#E5DFD3] dark:border-[#333333] hover:bg-[#EFEAE1] dark:hover:bg-[#2A2A2A]',
    outline: 'border border-[#C9A55B]/50 text-[#806020] dark:text-[#C9A55B] bg-transparent hover:bg-[#C9A55B]/10',
    ghost: 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#F5F1EA] dark:hover:bg-[#1E1E1E]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20',
  }[variant];

  return (
    <motion.button
      whileHover={{ y: disabled || loading ? 0 : -2, scale: disabled || loading ? 1 : 1.01 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none ${sizeClasses} ${variantClasses} ${
        fullWidth ? 'w-full' : ''
      } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Procesando...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

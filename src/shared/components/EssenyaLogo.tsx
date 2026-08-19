import React from 'react';

interface EssenyaLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  align?: 'left' | 'center';
  variant?: 'auto' | 'gold' | 'dark' | 'light';
}

export const EssenyaLogo: React.FC<EssenyaLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  align = 'center',
  variant = 'auto',
}) => {
  // Responsive height configurations
  const dimensions = {
    xs: { iconHeight: 28, fullHeight: 36 },
    sm: { iconHeight: 36, fullHeight: 48 },
    md: { iconHeight: 48, fullHeight: 64 },
    lg: { iconHeight: 68, fullHeight: 90 },
    xl: { iconHeight: 96, fullHeight: 130 },
  }[size];

  // Dynamic color classes based on variant & theme
  const getFillClass = () => {
    if (variant === 'gold') return 'fill-[#C9A55B] text-[#C9A55B]';
    if (variant === 'light') return 'fill-[#FAF8F5] text-[#FAF8F5]';
    if (variant === 'dark') return 'fill-[#1C1917] text-[#1C1917]';
    // 'auto': Deep gold in light mode, luminous radiant gold in dark mode
    return 'fill-[#806020] dark:fill-[#C9A55B] text-[#806020] dark:text-[#C9A55B]';
  };

  const getSecondaryFillClass = () => {
    if (variant === 'gold') return 'fill-[#9A7B38]';
    if (variant === 'light') return 'fill-white/80';
    if (variant === 'dark') return 'fill-[#3A3530]';
    return 'fill-[#A37B2C] dark:fill-[#E6CA65]';
  };

  return (
    <div className={`inline-flex max-w-full ${align === 'center' ? 'flex-col items-center' : 'items-center space-x-2'} ${className} select-none transition-all duration-300`}>
      {/* Transparent SVG Monogram Icon (EA with Leaf & ESSENYA Typography) */}
      <svg
        viewBox="0 0 240 180"
        height={showText ? dimensions.fullHeight : dimensions.iconHeight}
        className={`w-auto max-w-full h-auto transition-colors duration-300 overflow-visible shrink-0 ${getFillClass()}`}
        style={{ 
          maxHeight: showText ? `${dimensions.fullHeight}px` : `${dimensions.iconHeight}px`,
          backgroundColor: 'transparent'
        }}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ESSENYA Logo"
      >
        <g transform="translate(20, 5)">
          {/* ----- LETTER E ----- */}
          {/* Vertical Main Stem of E */}
          <path d="M 58 25 L 72 25 L 72 105 L 58 105 Z" />
          {/* Top serif left spur */}
          <path d="M 50 25 L 72 25 L 72 32 L 54 32 Z" />
          {/* Top horizontal bar of E */}
          <path d="M 72 25 L 112 25 L 112 32 L 72 32 Z" />
          <path d="M 112 25 L 112 38 L 105 32 Z" />
          {/* Middle bar / flourish connection */}
          <path d="M 72 61 L 98 61 L 98 67 L 72 67 Z" />
          {/* Bottom horizontal bar of E */}
          <path d="M 50 105 L 118 105 C 122 105 125 101 125 96 L 125 92 L 118 99 L 72 99 L 72 105 Z" />
          {/* Bottom serif left spur */}
          <path d="M 50 105 L 72 105 L 72 98 L 54 98 Z" />

          {/* ----- LETTER A ----- */}
          {/* Left slanted leg of A (intersects E) */}
          <path d="M 142 25 L 152 25 L 112 105 L 98 105 Z" opacity="0.95" />
          {/* Right slanted leg of A */}
          <path d="M 142 25 L 156 25 L 192 105 L 176 105 Z" />
          {/* Top apex of A */}
          <path d="M 138 25 L 160 25 L 149 18 Z" />
          {/* Right foot serif of A */}
          <path d="M 170 105 L 202 105 L 202 99 L 182 99 Z" />

          {/* ----- CENTRAL ELEGANT LEAF & WAVE MOTIF ----- */}
          {/* Sweeping organic wave bar under leaf */}
          <path 
            d="M 60 76 C 75 76 90 70 110 65 C 130 60 145 61 160 66 C 150 71 130 73 110 74 C 90 75 75 80 60 76 Z" 
            className={getSecondaryFillClass()} 
          />
          
          {/* Leaf Body with Transparent Vein Cutout (evenodd rule = 100% transparent hole) */}
          <path 
            d="M 108 63 C 104 50 112 30 128 22 C 128 38 122 55 108 63 Z M 112 58 C 114 48 120 36 126 28 C 123 38 118 48 112 58 Z" 
            fillRule="evenodd"
            className="transition-colors duration-300"
          />

          {/* ----- TYPOGRAPHY BELOW (ESSENYA) ----- */}
          {showText && (
            <text
              x="100"
              y="152"
              textAnchor="middle"
              className="font-serif font-bold transition-colors duration-300"
              style={{
                fontSize: '31px',
                letterSpacing: '0.38em',
                fontFamily: "'Cinzel', 'Playfair Display', 'Cormorant Garamond', 'Didot', serif",
              }}
            >
              ESSENYA
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export const EssenyaMonogram: React.FC<{ className?: string; size?: number }> = ({ 
  className = '', 
}) => {
  return (
    <EssenyaLogo size="sm" showText={false} className={className} />
  );
};

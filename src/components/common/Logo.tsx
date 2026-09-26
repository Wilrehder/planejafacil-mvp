import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark'; // 'light' = dark text for light background, 'dark' = white text for dark navy background
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const isDarkBg = variant === 'dark';

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* Brand Icon SVG: House + Cabinet Grid + Green Checkmark Swoosh */}
      <div className={`relative shrink-0 ${iconSizes[size]}`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
          {/* House Roof & Outline */}
          <path
            d="M50 12 L15 40 V82 C15 85.3 17.7 88 21 88 H79 C82.3 88 85 85.3 85 82 V40 L50 12 Z"
            fill={isDarkBg ? "#FFFFFF" : "#1B2B48"}
          />
          {/* Inner Cabinet / Grid Window cutout */}
          <rect x="30" y="42" width="40" height="34" rx="4" fill={isDarkBg ? "#1B2B48" : "#FFFFFF"} />
          <path d="M50 42 V76 M30 59 H70" stroke={isDarkBg ? "#FFFFFF" : "#1B2B48"} strokeWidth="4" strokeLinecap="round" />
          {/* Dynamic Green Checkmark Swoosh */}
          <path
            d="M24 56 L42 74 L88 22"
            stroke="#439346"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 56 L42 74 L88 22"
            stroke="#52B055"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col justify-center leading-tight">
        <div className={`font-black tracking-tight flex items-center ${textSizes[size]}`}>
          <span className={isDarkBg ? "text-white" : "text-[#1B2B48]"}>Planeja</span>
          <span className="text-[#439346] font-extrabold ml-0.5">Fácil</span>
        </div>
        {showSubtitle && (
          <span className={`font-semibold tracking-wide uppercase ${isDarkBg ? "text-slate-300" : "text-slate-500"} ${subtitleSizes[size]}`}>
            Móveis Sob Medida
          </span>
        )}
      </div>
    </div>
  );
};

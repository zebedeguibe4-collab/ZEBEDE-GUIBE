import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const CsplzLogo: React.FC<LogoProps> = ({className = '', size = 44}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Logo officiel CSPLZ"
  >
    <circle cx="32" cy="32" r="30" fill="#F0FDFA" stroke="#0F766E" strokeWidth="2.2" />
    <circle cx="32" cy="32" r="25.5" stroke="#0F766E" strokeWidth="0.8" strokeDasharray="2 2" />
    {/* Medical cross */}
    <path
      d="M27 14H37V27H50V37H37V50H27V37H14V27H27V14Z"
      fill="#0F766E"
    />
    {/* Inner clinical shield / caduceus line */}
    <path
      d="M32 18V46"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M25 25C25 22.5 39 22.5 39 26.5C39 30.5 25 30.5 25 34.5C25 38.5 39 38.5 39 41.5"
      stroke="#99F6E4"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="32" cy="18" r="2.2" fill="#FFFFFF" />
  </svg>
);

export const CsplzWatermark: React.FC = () => (
  <div
    className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden z-0"
    aria-hidden="true"
  >
    <div className="flex flex-col items-center justify-center opacity-[0.055] -rotate-12">
      <svg
        width="340"
        height="340"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="30" stroke="#0F766E" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="25" stroke="#0F766E" strokeWidth="1" strokeDasharray="2 2" />
        <path
          d="M27 14H37V27H50V37H37V50H27V37H14V27H27V14Z"
          fill="#0F766E"
        />
      </svg>
      <div className="mt-4 text-center font-display tracking-[0.28em] text-[#0F766E] font-bold text-2xl uppercase">
        CSPLZ · ZOUABI
      </div>
      <div className="mt-1 text-center font-sans tracking-[0.18em] text-[#0F766E] font-semibold text-xs uppercase">
        Centre de Santé Privé Laïc Zouabi
      </div>
    </div>
  </div>
);

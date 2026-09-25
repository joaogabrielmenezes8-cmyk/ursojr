import React from 'react';

interface UrsoLogoProps {
  variant?: 'full' | 'symbol' | 'app-icon' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const UrsoLogo: React.FC<UrsoLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  // Dimension maps for symbol
  const symbolSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  // Horizontal Logo sizing:
  // Desktop recommendation is 150–190px
  const logoWidths = {
    sm: 'w-[140px]',
    md: 'w-[168px]',
    lg: 'w-[185px]',
    xl: 'w-[220px]',
  };

  // 1. Symbol only (Bear Head + Lime Check Shield)
  if (variant === 'symbol' || variant === 'compact') {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 select-none ${symbolSizes[size]} ${className}`}
        title="URSO JR."
      >
        <img
          src="/brand/urso-jr-symbol.svg?v=v_new_2509"
          alt="URSO JR."
          className="w-full h-full object-contain"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // 2. App Icon (Bear Head inside #0F1115 rounded squircle)
  if (variant === 'app-icon') {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-2xl ${symbolSizes[size]} ${className}`}
        title="URSO JR."
      >
        <img
          src="/brand/urso-jr-app-icon.svg?v=v_new_2509"
          alt="URSO JR."
          className="w-full h-full object-contain shadow-sm"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // 3. Full Official Horizontal Logo (Bear Head + URSO JR. + Seu estagiário com IA.)
  // Strictly preserves original proportion, no duplicate text next to it.
  return (
    <div
      className={`inline-flex items-center select-none py-1 ${className}`}
      title="URSO JR. — Seu estagiário com IA"
    >
      <img
        src="/brand/urso-jr-logo-horizontal.svg?v=v_new_2509"
        alt="URSO JR. — Seu estagiário com IA"
        className={`${logoWidths[size]} h-auto object-contain transition-opacity`}
        style={{
          maxHeight: '44px',
          width: 'auto',
          maxWidth: '185px',
        }}
        loading="eager"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

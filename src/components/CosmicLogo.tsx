import React from 'react';

interface CosmicLogoProps {
  customLogoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CosmicLogo: React.FC<CosmicLogoProps> = ({
  customLogoUrl,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  const logoSrc = customLogoUrl || '/logo.svg';

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={logoSrc}
        alt="NeuroYobe Logo"
        className={`${sizeClasses[size]} object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] hover:scale-105 transition-transform`}
      />
    </div>
  );
};


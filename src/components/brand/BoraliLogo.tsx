import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showSlogan?: boolean
  inverted?: boolean
  className?: string
}

export const BoraliLogo: React.FC<LogoProps> = ({
  size = 'md',
  showSlogan = false,
  inverted = false,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const sloganSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  }

  return (
    <div className={`inline-flex items-center gap-2.5 font-sans select-none ${className}`}>
      {/* Símbolo Borali SVG */}
      <div className={`${iconSizes[size]} flex-shrink-0 relative`}>
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient
              id="logoBlue"
              x1="0"
              y1="0"
              x2="64"
              y2="64"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#1754AE" />
              <stop offset="1" stopColor="#0F3D82" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill={inverted ? '#FFFFFF' : 'url(#logoBlue)'} />
          {/* Acento vermelho de destaque inspirado na bandeira de Óbidos */}
          <circle cx="45" cy="18" r="5" fill="#E63239" />
          <circle cx="45" cy="18" r="2" fill="#FFFFFF" />
          {/* Letra B */}
          <path
            d="M23 16h11c4.5 0 8 2.5 8 6 0 2.3-1.6 4.3-4.2 5.3 3.3 1 5.2 3.2 5.2 6.2 0 4.2-4.2 7.5-9.5 7.5H23V16z"
            fill={inverted ? '#1754AE' : '#FFFFFF'}
          />
          <path
            d="M29 22h4c1.8 0 3 1.1 3 2.5s-1.2 2.5-3 2.5h-4V22zm0 9h4.5c2 0 3.5 1.2 3.5 3s-1.5 3-3.5 3H29v-6z"
            fill={inverted ? '#FFFFFF' : '#1754AE'}
          />
        </svg>
      </div>

      {/* Tipografia */}
      <div className="flex flex-col leading-tight">
        <div className="flex items-center tracking-tight font-extrabold">
          <span className={`${textSizes[size]} ${inverted ? 'text-white' : 'text-[#1754AE]'}`}>
            BORA
          </span>
          <span className={`${textSizes[size]} text-[#E63239]`}>LI</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E63239] ml-0.5 mb-1" />
        </div>
        {showSlogan && (
          <span
            className={`${sloganSizes[size]} font-medium tracking-normal -mt-0.5 ${
              inverted ? 'text-white/80' : 'text-[#172033]/70'
            }`}
          >
            Sua cidade, mais perto de você
          </span>
        )}
      </div>
    </div>
  )
}

export default BoraliLogo

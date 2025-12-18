import { cn } from '@/lib/utils';

interface KodexLogoProps {
  className?: string;
  variant?: 'full' | 'mark';
}

export function KodexLogo({ className, variant = 'mark' }: KodexLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-primary', className)}
    >
      <defs>
        <linearGradient id="kodex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(4, 90%, 55%)" />
          <stop offset="100%" stopColor="hsl(280, 85%, 55%)" />
        </linearGradient>
      </defs>
      
      {/* Outer hexagonal badge shape */}
      <path
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
        fill="url(#kodex-gradient)"
        opacity="0.15"
      />
      <path
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
        stroke="url(#kodex-gradient)"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Stylized K lettermark */}
      <path
        d="M11 8V24M11 16L21 8M11 16L21 24"
        stroke="url(#kodex-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Diagonal slash (Ø reference) */}
      <line
        x1="18"
        y1="10"
        x2="14"
        y2="22"
        stroke="url(#kodex-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

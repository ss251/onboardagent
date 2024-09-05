import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export const ZoraLogo: React.FC<LogoProps> = ({ className }) => (
  <Image src="/logos/zora-logo.png" alt="Zora Logo" width={24} height={24} className={className} />
);

export const FarcasterLogo: React.FC<LogoProps> = ({ className }) => (
  <Image src="/logos/farcaster-logo.jpg" alt="Farcaster Logo" width={24} height={24} className={className} />
);

export const LensLogo: React.FC<LogoProps> = ({ className }) => (
  <Image src="/logos/lens-logo.svg" alt="Lens Logo" width={24} height={24} className={className} />
);

export const HeyLogo: React.FC<LogoProps> = ({ className }) => (
  <Image src="/logos/hey-logo.png" alt="Hey Logo" width={24} height={24} className={className} />
);

export const WarpcastLogo: React.FC<LogoProps> = ({ className }) => (
  <Image src="/logos/warpcast-logo.webp" alt="Warpcast Logo" width={24} height={24} className={className} />
);
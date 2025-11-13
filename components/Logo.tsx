import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { width: 100, height: 35 },
    md: { width: 120, height: 40 },
    lg: { width: 150, height: 50 },
  };

  const currentSize = sizes[size];

  return (
    <Image
      src="https://image.s7.sfmc-content.com/lib/fe2a11717d640474741277/m/1/7698e693-e9b1-4d90-8eab-2403bd4d6d8c.png"
      alt="MaveriX Logo"
      width={currentSize.width}
      height={currentSize.height}
      className={`object-contain ${className}`}
      priority
      unoptimized
    />
  );
}

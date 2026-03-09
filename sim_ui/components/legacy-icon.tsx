import { getLegacyIconUrl } from '@/lib/ui/legacy-icons';

interface LegacyIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function LegacyIcon({ name, size = 16, className = '' }: LegacyIconProps) {
  const src = getLegacyIconUrl(name);
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-sm object-contain ${className}`.trim()}
      loading="lazy"
    />
  );
}

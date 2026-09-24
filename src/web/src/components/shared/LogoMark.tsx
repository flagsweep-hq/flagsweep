export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 6px oklch(0.58 0.2 18 / 25%))' }}
    >
      <rect width="64" height="64" rx="14" fill="#f2607a" />
      <rect x="14" y="26" width="36" height="16" rx="8" fill="#fdfbf9" opacity="0.35" />
      <circle cx="42" cy="34" r="8" fill="#fdfbf9" />
    </svg>
  )
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--primary)" />
      <path d="M32 12c-8 9-8 24 0 33 8-9 8-24 0-33Z" fill="var(--primary-fg)" />
      <path d="M31 46C21 45 12 37 12 26c9 0 16 6 19 20Z" fill="var(--primary-fg)" opacity=".92" />
      <path d="M33 46c10-1 19-9 19-20-9 0-16 6-19 20Z" fill="var(--primary-fg)" opacity=".92" />
      <path d="M17 51c9 5 21 5 30 0" fill="none" stroke="#f3c15a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

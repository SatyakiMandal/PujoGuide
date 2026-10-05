"use client";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm"
      aria-hidden
    >
      {/* Squircle Badge in Sindoor Red */}
      <rect width="40" height="40" rx="10" fill="#D4261C" />

      {/* Gold Alpona Base Arc */}
      <path
        d="M 10 32 Q 20 36 30 32"
        stroke="#FFC24B"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Side Handles */}
      <path
        d="M 12 17 C 8 17 8 22 13 22 M 28 17 C 32 17 32 22 27 22"
        stroke="#FFC24B"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Dhunuchi Burner Vessel & Base */}
      <path d="M 16 30 L 24 30 L 22 24 L 18 24 Z" fill="#FFC24B" />
      <path d="M 12 17 C 12 24, 28 24, 28 17 L 25 14 L 15 14 Z" fill="#FFF8F0" />

      {/* Triple Dhunuchi Flames */}
      <path d="M 20 6 Q 24 10 20 14 Q 16 10 20 6 Z" fill="#FFC24B" />
      <path d="M 15 9 Q 18 11 16 14 Q 14 12 15 9 Z" fill="#FFF8F0" />
      <path d="M 25 9 Q 22 11 24 14 Q 26 12 25 9 Z" fill="#FFF8F0" />
      <path d="M 20 8 Q 22 10 20 12 Q 18 10 20 8 Z" fill="#D4261C" />
    </svg>
  );
}

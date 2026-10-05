import React from "react";

export function AutoRickshawIcon({ size = 20, className = "" }: { size?: number; className?: string; weight?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Kolkata Auto Rickshaw Silhouette */}
      <path d="M19 12h-1V9c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v3H3c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h1.18c.41 1.16 1.51 2 2.82 2s2.41-.84 2.82-2h4.36c.41 1.16 1.51 2 2.82 2s2.41-.84 2.82-2H21c.55 0 1-.45 1-1v-2c0-2.21-1.79-4-4-4zM7 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-7H7V9h10v2z" />
    </svg>
  );
}

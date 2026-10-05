"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Chip({
  active,
  onClick,
  children,
  color,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  /** CSS var name, e.g. "--c-pandal"; defaults to the primary colour. */
  color?: string;
  count?: number;
}) {
  const c = `var(${color ?? "--primary"})`;
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={active ? { background: c, borderColor: c, color: "var(--pin-fg)" } : undefined}
      className={clsx(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        !active && "border-line bg-surface text-fg hover:bg-surface2",
      )}
    >
      {children}
      {count !== undefined && <span className="text-xs opacity-70">{count}</span>}
    </motion.button>
  );
}

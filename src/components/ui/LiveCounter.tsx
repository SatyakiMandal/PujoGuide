"use client";

import { useLiveCount } from "@/lib/presence";
import { clsx } from "clsx";

export function LiveCounter({ className }: { className?: string }) {
  const count = useLiveCount();
  if (count === null) return null;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full bg-surface2 px-2 py-0.5 text-[10px] lg:text-[11px] font-medium text-muted",
        className,
      )}
      title="People with PujoGuide open right now"
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      {count} {count === 1 ? "person" : "people"} here now
    </span>
  );
}

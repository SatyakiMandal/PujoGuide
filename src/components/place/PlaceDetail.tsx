"use client";

import {
  CaretLeft,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  Eye,
  Heart,
  Lightbulb,
  MapPinSimpleArea,
  NavigationArrow,
  NotePencil,
  Plus,
  ShareNetwork,
  ThumbsUp,
  TrainSimple,
  Users,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { CATEGORY_META, CUISINE_LABEL, DIET_LABEL, PRICE, VIBE_LABEL } from "@/lib/categories";
import { zoneName } from "@/lib/data";
import { PlaceIcon } from "@/lib/placeIcon";
import { isFood, type Crowd, type Place } from "@/lib/schema";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";
import { HoursCard } from "./HoursCard";
import { MenuCard } from "./MenuCard";

/** Pins at "area" confidence aren't the real spot, so route by name rather than by coordinates. */
const directionsUrl = (p: Place) => {
  const dest =
    p.coordConfidence === "area" ? encodeURIComponent(`${p.name.en}, Kolkata`) : `${p.lat},${p.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
};

const CROWD: Record<Crowd, { label: string; dots: number }> = {
  low: { label: "Quiet", dots: 1 },
  medium: { label: "Moderate", dots: 2 },
  high: { label: "Busy", dots: 3 },
  extreme: { label: "Very crowded", dots: 4 },
};

export function PlaceDetail({ place: p }: { place: Place }) {
  const select = useUI((s) => s.select);
  const [shared, setShared] = useState(false);
  const inRoute = useUI((s) => s.route.stops.includes(p.slug));
  const stopNo = useUI((s) => s.route.stops.indexOf(p.slug) + 1);
  const saved = useUI((s) => s.saved.includes(p.slug));
  const visited = useUI((s) => s.visited.includes(p.slug));
  const myNote = useUI((s) => s.notes[p.slug] ?? "");
  const meta = CATEGORY_META[p.category];

  const share = async () => {
    const url = `${location.origin}/?place=${p.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: p.name.en, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const tips = p.tips;
  // The closed banner already says what the snapshot found, so don't repeat it as a tip.
  const watch = p.closed && tips?.watch?.startsWith("Google Maps lists") ? undefined : tips?.watch;
  const tipRows = tips
    ? ([
        { key: "expect", label: "What to expect", icon: Eye, text: tips.expect },
        { key: "good", label: "What's good", icon: ThumbsUp, text: tips.good },
        { key: "watch", label: "Look out for", icon: Warning, text: watch },
        { key: "tip", label: "Tip", icon: Lightbulb, text: tips.tip },
      ] as const).filter((r) => r.text)
    : [];

  return (
    <motion.article
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="space-y-5 pb-4"
    >
      <button
        type="button"
        onClick={() => select(null)}
        className="-ml-1 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-muted hover:text-fg"
      >
        <CaretLeft size={16} weight="bold" /> All places
      </button>

      <header className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs"
              style={{ background: `var(${meta.cssVar})`, color: "var(--pin-fg)" }}
            >
              <PlaceIcon place={p} size={16} /> {meta.label}
              {p.tags.includes("rajbari") && " · Rajbari"}
            </span>
            {p.pureVeg && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                100% Pure Veg
              </span>
            )}
            {p.source === "curated" && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                ★ Best-of Pick
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <Toggle
              on={saved}
              label={saved ? "Remove from saved" : "Save"}
              onClick={() => useUI.getState().toggleSaved(p.slug)}
              icon={<Heart size={20} weight={saved ? "fill" : "bold"} />}
            />
            <Toggle
              on={visited}
              label={visited ? "Mark as not visited" : "Mark as visited"}
              onClick={() => useUI.getState().toggleVisited(p.slug)}
              icon={<CheckCircle size={20} weight={visited ? "fill" : "bold"} />}
            />
          </div>
        </div>
        <h2 className="font-display text-2xl font-semibold leading-tight">{p.name.en}</h2>
        {p.aliases.length > 0 && <p className="text-sm text-muted">Also known as: {p.aliases.join(", ")}</p>}
        <p className="text-sm text-muted">{p.zones.map((z) => zoneName.get(z)).join(" · ")}</p>
      </header>

      {p.closed && (
        <p className="flex gap-2 rounded-xl border border-primary/40 bg-surface2 p-3 text-sm">
          <XCircle size={20} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
          <span>
            {p.tips?.watch?.startsWith("Google Maps lists")
              ? `${p.tips.watch} Check before you go.`
              : "Looks permanently closed according to what I found online. Check before you go."}
          </span>
        </p>
      )}
      {p.source === "old" && !p.closed && p.info !== "researched" && (
        <p className="flex gap-2 rounded-xl bg-surface2 p-3 text-sm">
          <ClockCounterClockwise size={20} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
          <span>From your older list. It may have closed or moved, so check before you go.</span>
        </p>
      )}
      {p.coordConfidence !== "verified" && (
        <p className="flex gap-2 rounded-xl bg-surface2 p-3 text-sm">
          <MapPinSimpleArea size={20} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
          <span>
            {p.coordConfidence === "area"
              ? "Approximate pin. It sits in the right neighbourhood but not on the exact spot yet. Directions search by name."
              : "Pin matched by name on OpenStreetMap. Pandals move every year, so confirm the spot before you set out."}
          </span>
        </p>
      )}

      {p.blurb && <p className="leading-relaxed">{p.blurb}</p>}

      <HoursCard place={p} />

      <MenuCard place={p} />

      {tipRows.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Know before you go</h3>
          <ul className="space-y-3">
            {tipRows.map(({ key, label, icon: RowIcon, text }) => (
              <li key={key} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface2 text-accent">
                  <RowIcon size={18} weight="duotone" />
                </span>
                <span className="text-sm leading-relaxed">
                  <b className="block text-[13px]">{label}</b>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.dishes && p.dishes.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {isFood(p.category) ? "Known for" : "Look for"}
          </h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {p.dishes.map((d) => (
              <span key={d} className="rounded-full bg-surface2 px-3 py-1">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {p.crowd && (
        <p className="flex items-center gap-2 text-sm">
          <Users size={20} weight="duotone" className="text-muted" />
          <span>Crowd at peak hours:</span>
          <b>{CROWD[p.crowd].label}</b>
          <span aria-hidden className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <i
                key={i}
                className={clsx("size-2 rounded-full", i <= CROWD[p.crowd!].dots ? "bg-primary" : "bg-line")}
              />
            ))}
          </span>
        </p>
      )}

      {isFood(p.category) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {p.priceLevel && <Tag>{PRICE(p.priceLevel)}</Tag>}
          {p.cuisines?.map((c) => <Tag key={c}>{CUISINE_LABEL[c]}</Tag>)}
          {p.vibes?.map((v) => <Tag key={v}>{VIBE_LABEL[v]}</Tag>)}
          {p.diet?.map((d) => <Tag key={d}>{DIET_LABEL[d]}</Tag>)}
          {p.openLate && <Tag>Open late</Tag>}
        </div>
      )}

      {p.address && <p className="text-sm text-muted">{p.address}</p>}
      {p.notes && p.source && p.source !== "seed" && (
        <p className="text-sm">
          <span className="text-muted">Your note from Maps: </span>
          {p.notes}
        </p>
      )}
      {p.notes && (!p.source || (p.source === "seed" && !p.notes.startsWith("Unverified"))) && (
        <p className="text-sm">{p.notes}</p>
      )}

      {p.metro.length > 0 && (
        <p className="flex items-center gap-2 text-sm">
          <TrainSimple size={20} weight="duotone" className="text-muted" /> Nearest metro: {p.metro.join(", ")}
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted">
        {p.info === "researched"
          ? "Notes compiled from web research. Hours, prices and even pandal themes change, so treat them as a guide."
          : isFood(p.category)
            ? "Tags here are suggested from the name; I couldn't find enough to confirm them."
            : "Notes are general guidance, not official information."}
      </p>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => (inRoute ? useUI.getState().removeStop(p.slug) : useUI.getState().addStop(p.slug))}
          className={
            inRoute
              ? "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-primary px-5 font-semibold text-primary transition-transform active:scale-95"
              : "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-fg transition-transform active:scale-95"
          }
        >
          {inRoute ? <Check size={20} weight="bold" /> : <Plus size={20} weight="bold" />}
          {inRoute ? `In your route (stop ${stopNo}). Tap to remove` : "Add to route"}
        </button>
        <div className="flex gap-2">
          <a
            href={directionsUrl(p)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 font-medium transition-transform active:scale-95"
          >
            <NavigationArrow size={18} weight="fill" /> Directions
          </a>
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 font-medium transition-transform active:scale-95"
          >
            <ShareNetwork size={18} weight="bold" /> {shared ? "Link copied" : "Share"}
          </button>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <NotePencil size={16} weight="bold" /> Your notes (kept on this device)
        </span>
        <textarea
          value={myNote}
          onChange={(e) => useUI.getState().setNote(p.slug, e.target.value)}
          rows={3}
          placeholder="What you ordered, who you went with, what to do next time…"
          className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>
    </motion.article>
  );
}

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-line bg-surface px-2.5 py-1">{children}</span>
);

function Toggle({ on, label, onClick, icon }: { on: boolean; label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={onClick}
      className={clsx(
        "grid size-10 place-items-center rounded-full border transition-all active:scale-90",
        on ? "border-transparent bg-primary text-primary-fg" : "border-line bg-surface text-fg hover:bg-surface2",
      )}
    >
      {icon}
    </button>
  );
}

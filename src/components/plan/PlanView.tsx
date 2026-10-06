"use client";

import { PlaceIcon } from "@/lib/placeIcon";
import { pujaDay } from "@/lib/calendar";
import { fmtClock } from "@/lib/hours";
import {
  ArrowSquareOut,
  CaretDown,
  Clock,
  Copy,
  CurrencyInr,
  DeviceMobile,
  DotsSixVertical,
  DownloadSimple,
  ForkKnife,
  Hourglass,
  Lightning,
  LinkSimple,
  Moon,
  Path,
  Plus,
  QrCode,
  Ruler,
  Shuffle,
  Trash,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, Reorder, useDragControls, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { places, zoneName } from "@/lib/data";
import { formattedShareText, googleMapsLinks, legLink, shareUrl, wholeRouteMode } from "@/lib/route/export";
import { fmtFare, fmtMin, MODE_META } from "@/lib/route/modeMeta";
import { optimiseOrder } from "@/lib/route/optimise";
import { routePlaces, summarise, useLegs, type Leg } from "@/lib/route/useLegs";
import { placeDwellMin } from "@/lib/route/dwell";
import { findNearbyFood } from "@/lib/route/geo";
import { isFood, type Place } from "@/lib/schema";
import { generateQRCodeSVG } from "@/lib/qrcode";
import { PlansCatalog } from "./PlansCatalog";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";

export function PlanView() {
  const stops = useUI((s) => s.route.stops);
  const pujaNight = useUI((s) => s.route.pujaNight);
  const schedule = useUI((s) => s.route.schedule);
  const planDayId = useUI((s) => s.route.day);
  const { setStops, clearRoute, setPujaNight, select } = useUI.getState();
  const legs = useLegs();
  const routePlacesList = routePlaces(stops);
  const [copied, setCopied] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  if (routePlacesList.length === 0 || browse) {
    return <PlansCatalog hasRoute={routePlacesList.length > 0} onDone={() => setBrowse(false)} />;
  }

  const sum = summarise(legs, routePlacesList, { pujaNight });
  const links = googleMapsLinks(routePlacesList, wholeRouteMode(legs.map((l) => l.chosen)));
  const legAfter = (i: number) => legs[i];

  const foodStops = routePlacesList.filter((p) => isFood(p.category));
  const minFood = foodStops.reduce((acc, p) => acc + (p.priceLevel === 3 ? 450 : p.priceLevel === 2 ? 200 : 70), 0);
  const maxFood = foodStops.reduce((acc, p) => acc + (p.priceLevel === 3 ? 900 : p.priceLevel === 2 ? 400 : 160), 0);

  const optimise = () => {
    const order = optimiseOrder(routePlacesList);
    setStops(order.map((i) => routePlacesList[i].slug));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formattedShareText(location.origin, routePlacesList));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; nothing useful to do */
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-4 gap-1 text-center">
          <Stat icon={<Clock size={18} weight="duotone" />} value={fmtMin(sum.total)} label="total time" />
          <Stat icon={<Ruler size={18} weight="duotone" />} value={`${sum.km.toFixed(1)} km`} label="travel" />
          <Stat
            icon={<CurrencyInr size={18} weight="duotone" />}
            value={sum.fareMax === 0 ? "Free" : `₹${sum.fareMin}–${sum.fareMax}`}
            label="transit fares"
          />
          <Stat
            icon={<ForkKnife size={18} weight="duotone" />}
            value={foodStops.length === 0 ? "No food" : `₹${minFood}–${maxFood}`}
            label={foodStops.length > 0 ? `${foodStops.length} food stop${foodStops.length > 1 ? "s" : ""}` : "est. food"}
          />
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-surface2 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Moon size={18} weight="duotone" className="text-accent" /> Puja-night conditions
          </span>
          <span className="text-xs text-muted">slower roads, dearer cabs, crowded lanes</span>
          <input
            type="checkbox"
            checked={pujaNight}
            onChange={(e) => setPujaNight(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
        </label>
      </section>

      {schedule && planDayId && (
        <p className="flex items-center justify-between gap-2 rounded-xl bg-surface2 px-3 py-2 text-sm">
          <span>
            <b>{pujaDay(planDayId).name}</b> plan, {fmtClock(Math.min(...Object.values(schedule).map((t) => t.arrive)))} to{" "}
            {fmtClock(Math.max(...Object.values(schedule).map((t) => t.depart)))}
          </span>
          <button type="button" onClick={() => setBrowse(true)} className="font-semibold text-primary">
            Re-plan
          </button>
        </p>
      )}

      <Reorder.Group axis="y" values={stops} onReorder={setStops} className="space-y-1">
        {places.map((p, i) => (
          <StopRow key={p.slug} place={p} index={i} leg={legAfter(i)} time={schedule?.[p.slug]} onOpen={() => select(p.slug)} />
        ))}
      </Reorder.Group>

      <div className="flex flex-wrap gap-2">
        <Action onClick={() => setBrowse(true)} icon={<Path size={17} weight="bold" />}>
          Plans &amp; auto-plan
        </Action>
        <Action onClick={optimise} disabled={places.length < 4} icon={<Shuffle size={17} weight="bold" />}>
          Optimise order
        </Action>
        <Action onClick={() => setOfflineOpen(true)} icon={<DeviceMobile size={17} weight="bold" />}>
          Offline mode
        </Action>
        <Action onClick={() => setQrOpen(true)} icon={<QrCode size={17} weight="bold" />}>
          QR Code
        </Action>
        {links.map((href, i) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg transition-transform active:scale-95"
          >
            <ArrowSquareOut size={17} weight="bold" />
            {links.length > 1 ? `Google Maps · part ${i + 1}` : "Open in Google Maps"}
          </a>
        ))}
        <Action onClick={copy} icon={<LinkSimple size={17} weight="bold" />}>
          {copied ? "Link copied" : "Copy link"}
        </Action>
        <Action onClick={clearRoute} icon={<Trash size={17} weight="bold" />}>
          Clear
        </Action>
      </div>

      <OfflinePlanModal open={offlineOpen} onClose={() => setOfflineOpen(false)} places={routePlacesList} />
      <QRCodeModal open={qrOpen} onClose={() => setQrOpen(false)} url={shareUrl(location.origin, stops)} />

      <p className="text-xs leading-relaxed text-muted">
        Times and fares are estimates. Pins are approximate until verified, and auto, cab and bike prices are rough
        models, not quotes. Open the ride apps for real prices. Metro stations and tracks come from OpenStreetMap.
      </p>
    </div>
  );
}

function StopRow({
  place,
  index,
  leg,
  time,
  onOpen,
}: {
  place: Place;
  index: number;
  leg?: Leg;
  time?: { arrive: number; depart: number };
  onOpen: () => void;
}) {
  const controls = useDragControls();
  const removeStop = useUI((s) => s.removeStop);
  const pujaNight = useUI((s) => s.route.pujaNight);
  const meta = CATEGORY_META[place.category];
  const dwell = placeDwellMin(place, { pujaNight });

  return (
    <Reorder.Item
      value={place.slug}
      dragListener={false}
      dragControls={controls}
      className="list-none"
      whileDrag={{ scale: 1.02, zIndex: 20 }}
      transition={{ type: "spring", stiffness: 500, damping: 36 }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2">
        <button
          type="button"
          aria-label={`Drag to reorder ${place.name.en}`}
          onPointerDown={(e) => controls.start(e)}
          className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted active:cursor-grabbing"
        >
          <DotsSixVertical size={20} weight="bold" />
        </button>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fg text-xs font-bold text-bg">
          {index + 1}
        </span>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full"
            style={{ background: `var(${meta.cssVar})`, color: "var(--pin-fg)" }}
          >
            <PlaceIcon place={place} size={17} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{place.name.en}</span>
            <span className="block truncate text-xs text-muted">
              {time ? `${fmtClock(time.arrive)} – ${fmtClock(time.depart)} · ` : ""}
              {zoneName.get(place.zones[0])}
              {dwell.queue > 0 && (
                <span className="ml-1.5 font-medium text-amber-600 dark:text-amber-400">
                  ⌛ ~{dwell.queue}m queue
                </span>
              )}
            </span>
          </span>
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          aria-label={`Remove ${place.name.en}`}
          onClick={() => removeStop(place.slug)}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface2"
        >
          <X size={16} weight="bold" />
        </motion.button>
      </div>
      {leg && <LegCard leg={leg} />}
    </Reorder.Item>
  );
}

function MidRouteFoodFinder({ leg }: { leg: Leg }) {
  const [open, setOpen] = useState(false);
  const stops = useUI((s) => s.route.stops);
  const insertStop = useUI((s) => s.insertStop);
  const nearby = useMemo(() => findNearbyFood(leg.from, leg.to, places, stops, 0.75), [leg.from, leg.to, stops]);

  if (nearby.length === 0) return null;

  return (
    <div className="mt-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-surface2"
      >
        <ForkKnife size={13} weight="bold" className="text-primary" />
        {open ? "Hide food nearby" : `Add food spot nearby (${nearby.length})`}
        <CaretDown size={12} className={clsx("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 rounded-xl border border-line bg-surface2/60 p-2.5">
              <span className="block font-semibold text-muted">Verified food near this leg:</span>
              <ul className="space-y-1">
                {nearby.slice(0, 4).map((p) => {
                  const meta = CATEGORY_META[p.category];
                  return (
                    <li key={p.slug} className="flex items-center justify-between gap-2 rounded-lg bg-surface p-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{p.name.en}</span>
                          {p.pureVeg && <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-semibold text-emerald-600">Veg</span>}
                        </div>
                        <span className="block truncate text-[10px] text-muted">
                          {meta.label} · {p.mustTry?.nonveg[0] || p.mustTry?.veg[0] || p.cuisines?.[0] || "Good food"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => insertStop(p.slug, leg.from.slug)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-fg"
                      >
                        <Plus size={12} weight="bold" /> Add
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegCard({ leg }: { leg: Leg }) {
  const pujaNight = useUI((s) => s.route.pujaNight);
  const setLegMode = useUI((s) => s.setLegMode);
  const o = leg.option;
  const road = leg.chosen === "auto" || leg.chosen === "cab" || leg.chosen === "bike";

  return (
    <div className="ml-6 mt-1 border-l-2 border-dashed border-line pb-2 pl-4">
      <div className="grid grid-cols-5 gap-1 py-1.5">
        {leg.options.map((opt) => {
          const m = MODE_META[opt.mode];
          const Icon = m.icon;
          const active = leg.chosen === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              disabled={!opt.available}
              aria-pressed={active}
              onClick={() => setLegMode(leg.key, opt.mode === leg.auto && !active ? null : opt.mode)}
              className={clsx(
                "relative flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-0.5 py-1.5 text-[11px] leading-tight transition-colors",
                active ? "border-transparent text-white" : "border-line bg-surface hover:bg-surface2",
                !opt.available && "opacity-40",
                leg.loading && "animate-pulse",
              )}
              style={active ? { background: m.color } : undefined}
            >
              <Icon size={19} weight={active ? "fill" : "duotone"} />
              <span className="font-semibold tabular-nums">{opt.available ? fmtMin(opt.minutes).replace(" min", "m").replace(" h ", "h ") : "n/a"}</span>
              <span className={clsx("w-full truncate text-center text-[10px] tabular-nums", active ? "text-white" : "text-muted")}>
                {opt.available ? fmtFare(opt.fare) : "–"}
              </span>
              {opt.mode === leg.auto && opt.available && (
                <span className="absolute -right-1 -top-1.5 grid size-4 place-items-center rounded-full bg-accent text-[#17110e]" title="Suggested">
                  <Lightning size={10} weight="fill" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {o.steps && (
        <ol className="mt-1 space-y-1 text-xs text-muted">
          {o.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-1.5">
              {s.kind === "walk" && <span>Walk {s.minutes} min to {s.to}</span>}
              {s.kind === "ride" && (
                <span>
                  <i className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: s.color }} />
                  {s.line}: {s.from} → {s.to} ({s.stops} stops, {s.minutes} min)
                </span>
              )}
              {s.kind === "transfer" && <span>Change at {s.at} (~{s.minutes} min)</span>}
            </li>
          ))}
        </ol>
      )}
      {o.note && <p className="mt-1 text-xs text-muted">{o.note}</p>}
      <a
        href={legLink(leg.from, leg.to, leg.chosen)}
        target="_blank"
        rel="noreferrer"
        className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <ArrowSquareOut size={14} weight="bold" /> This leg in Google Maps ({MODE_META[leg.chosen].label.toLowerCase()})
      </a>
      {road && pujaNight && (
        <p className="mt-1 text-xs text-muted">
          After dark, vehicles are often kept out of the big pandal areas. Expect to get down and walk the last stretch.
        </p>
      )}
      {o.approx && !leg.loading && leg.chosen !== "metro" && (
        <p className="mt-1 text-xs text-muted">Straight-line estimate: the router didn&apos;t respond.</p>
      )}
      <MidRouteFoodFinder leg={leg} />
    </div>
  );
}

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="space-y-0.5">
    <div className="flex justify-center text-accent">{icon}</div>
    <div className="text-sm font-semibold tabular-nums">{value}</div>
    <div className="text-[11px] leading-tight text-muted">{label}</div>
  </div>
);

function Action({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium transition-colors disabled:opacity-40"
    >
      {icon}
      {children}
    </motion.button>
  );
}

function OfflinePlanModal({
  open,
  onClose,
  places,
}: {
  open: boolean;
  onClose: () => void;
  places: Place[];
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const text = formattedShareText(location.origin, places);

  const copyOffline = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback ignore */
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PujoGuide-Offline-Plan-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-label="Offline Plan"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-bg p-5 shadow-float"
        >
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <DeviceMobile size={20} weight="duotone" className="text-primary" />
              Offline Plan Access
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface2"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Network towers near major pandals get jammed during Puja nights. Save or copy this text plan so you have full route directions offline!
          </p>

          <pre className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-surface p-3 font-mono text-xs leading-relaxed">
            {text}
          </pre>

          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={copyOffline}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-semibold"
              >
                <Copy size={16} weight="bold" /> {copied ? "Copied!" : "Copy Text"}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={downloadTxt}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-fg"
              >
                <DownloadSimple size={16} weight="bold" /> Download .txt
              </motion.button>
            </div>
            <p className="text-[11px] text-center text-muted">
              Emergency Numbers: <b>112</b> (All) · <b>100</b> (Police) · <b>108</b> (Ambulance)
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function QRCodeModal({ open, onClose, url }: { open: boolean; onClose: () => void; url: string }) {
  if (!open) return null;
  const svgMarkup = generateQRCodeSVG(url);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-label="Scan QR Code to clone route"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="w-full max-w-sm rounded-3xl border border-line bg-bg p-6 text-center shadow-float"
        >
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <QrCode size={20} weight="duotone" className="text-primary" /> Scan to Clone Route
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface2"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            <div
              className="size-56 rounded-2xl bg-white p-3 text-black shadow-inner"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Point any phone camera at this screen to instantly open and clone this exact Puja route!
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

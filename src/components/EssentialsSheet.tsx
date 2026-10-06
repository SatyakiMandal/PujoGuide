"use client";

import { Drop, Footprints, Phone, ShieldCheck, TrainSimple, Umbrella, Warning, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useUI } from "@/store/ui";
import { findNearestAmenity } from "@/lib/amenities";

/** National emergency numbers that work anywhere in India. */
const NUMBERS = [
  { n: "112", label: "All emergencies" },
  { n: "100", label: "Police" },
  { n: "108", label: "Ambulance" },
  { n: "101", label: "Fire" },
  { n: "1091", label: "Women's helpline" },
  { n: "1098", label: "Child helpline" },
];

const TIPS = [
  { icon: ShieldCheck, title: "In a crowd", text: "Agree a meeting point and keep your group together. Zip bags in front, keep phones in inner pockets, and leave a queue the moment it gets crushing. No pandal is worth a stampede." },
  { icon: Footprints, title: "Shoes and bags", text: "Wear shoes you can walk 8 km in. Skip big bags: some houses and pandals ask you to leave them, and they slow you down in queues." },
  { icon: Drop, title: "Water and rest", text: "Carry water. Stop for a proper meal rather than snacking through the night, and keep your phone charged with a power bank." },
  { icon: Umbrella, title: "Rain", text: "Showers are common in October. A compact umbrella and a plan with indoor stops (a Bonedi Bari or a cafe) save the evening." },
  { icon: TrainSimple, title: "Metro", text: "The Metro ran extended or night-long services during Puja in recent years. The 2026 timetable is announced close to Mahalaya, so check Kolkata Metro's notices before relying on a late train." },
  { icon: Warning, title: "Roads", text: "In past years Kolkata Police closed roads and banned vehicles around the big pandals each evening, and along immersion routes such as Rabindra Sarani, Strand Road and Nimtala Ghat Street. Notices for 2026 appear just before Mahalaya. Expect to be dropped off and to walk the last stretch." },
];

export function EssentialsSheet() {
  const open = useUI((s) => s.essentials);
  const userPos = useUI((s) => s.userPos);
  const selectedSlug = useUI((s) => s.selected);
  const close = () => useUI.getState().setEssentials(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && useUI.getState().setEssentials(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.section
            role="dialog"
            aria-label="Essentials and safety"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-bg p-5 shadow-float sm:rounded-3xl"
          >
            <div className="relative mb-5 overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-primary/10 via-surface to-accent/10 p-5">
              <div className="absolute -right-4 -top-6 size-32 opacity-15 pointer-events-none">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="w-full h-full text-primary" strokeWidth="2">
                  <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="28" />
                  <path d="M50 10 L50 90 M10 50 L90 50 M22 22 L78 78 M22 78 L78 22" />
                </svg>
              </div>
              <div className="flex w-full items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-fg">Essentials &amp; Safety</h2>
                  <p className="text-xs text-muted mt-0.5">Emergency helplines and crowd guidance for Pujo 2026</p>
                </div>
                <button type="button" onClick={close} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-fg hover:bg-surface2">
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Emergency numbers</h3>
            <ul className="mb-5 grid grid-cols-2 gap-2">
              {NUMBERS.map(({ n, label }) => (
                <li key={n}>
                  <a href={`tel:${n}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:scale-95">
                    <Phone size={20} weight="duotone" className="text-primary" />
                    <span>
                      <b className="block text-lg leading-none tabular-nums">{n}</b>
                      <span className="text-xs text-muted">{label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Practical Amenities &amp; Assistance</h3>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {[
                { type: "toilet" as const, label: "Restroom / Toilet", icon: "🚽" },
                { type: "water" as const, label: "Drinking Water", icon: "🚰" },
                { type: "police_booth" as const, label: "Police Help Desk", icon: "👮" },
                { type: "first_aid" as const, label: "First Aid Post", icon: "🏥" },
              ].map(({ type, label, icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const refLat = userPos?.lat ?? 22.5726;
                    const refLng = userPos?.lng ?? 88.3639;
                    const nearest = findNearestAmenity(refLat, refLng, type);
                    useUI.setState({ showAmenities: true, essentials: false });
                    if (nearest) {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${nearest.amenity.lat},${nearest.amenity.lng}`;
                      window.open(url, "_blank");
                    }
                  }}
                  className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-3 text-left transition-all active:scale-95 hover:border-accent/40 hover:bg-surface2"
                >
                  <span className="text-xl">{icon}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-xs font-semibold leading-tight text-fg">{label}</b>
                    <span className="text-[10px] text-muted">Show nearest on map</span>
                  </span>
                </button>
              ))}
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Staying comfortable and safe</h3>
            <ul className="space-y-3">
              {TIPS.map(({ icon: TipIcon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface2 text-accent">
                    <TipIcon size={20} weight="duotone" />
                  </span>
                  <span className="text-sm leading-relaxed">
                    <b className="block">{title}</b>
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-xs leading-relaxed text-muted">
              Hours, prices, road closures and pandal locations change, and this app can be out of date. Verify with
              official notices (Kolkata Police, Kolkata Metro) and the organisers.
            </p>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

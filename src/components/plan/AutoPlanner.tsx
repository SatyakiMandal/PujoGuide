"use client";

import { ArrowClockwise, CaretLeft, CrosshairSimple, Flame, Sparkle, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import {
  GROUPS,
  INTERESTS,
  PACES,
  planDay,
  planDays,
  scheduleOf,
  slugsOf,
  type Group,
  type Interest,
  type Itinerary,
  type Meals,
  type Pace,
  type PlanRequest,
} from "@/lib/autoplan";
import { PUJA_CAL, pujaDay, type PujaDayId } from "@/lib/calendar";
import { placeBySlug, places } from "@/lib/data";
import { fmtClock, parseTimeInput, toTimeInput } from "@/lib/hours";
import { PlaceIcon } from "@/lib/placeIcon";
import { MODE_META } from "@/lib/route/modeMeta";
import type { Region } from "@/lib/schema";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";

const REGION_LABEL: Record<Region, string> = { north: "North", central: "Central", south: "South", saltlake: "Salt Lake" };
const GROUP_LABEL: Record<Group, string> = { solo: "Solo", couple: "Couple", friends: "Friends", family: "Family", elders: "With elders" };
const INTEREST_LABEL: Record<Interest, string> = {
  heritage: "Heritage",
  photogenic: "Photogenic",
  themes: "Big themes",
  quiet: "Quiet",
  foodie: "Food",
  date: "Date night",
  rituals: "Catch a ritual",
  famous: "The big names",
};
const PACE_LABEL: Record<Pace, string> = { relaxed: "Relaxed", normal: "Steady", packed: "Packed" };
const MEAL_LABEL: Record<keyof Meals, string> = { lunch: "Lunch", snack: "Tea & snack", dinner: "Dinner", supper: "Late supper" };

const flip = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function AutoPlanner({ hasRoute, onDone }: { hasRoute: boolean; onDone: () => void }) {
  const req = useUI((s) => s.planReq);
  const setPlanReq = useUI((s) => s.setPlanReq);
  const userPos = useUI((s) => s.userPos);
  const [days, setDays] = useState<PujaDayId[]>([req.day]);
  const [useMe, setUseMe] = useState(false);
  const [skip, setSkip] = useState<string[]>([]);
  const [result, setResult] = useState<Itinerary[] | null>(null);
  const [locating, setLocating] = useState(false);

  const patch = (p: Partial<PlanRequest>) => setPlanReq({ ...req, ...p });
  const endsNextDay = req.end <= req.start;

  const run = (avoid: string[]) => {
    const base: PlanRequest = {
      ...req,
      end: endsNextDay ? req.end + 1440 : req.end,
      avoid,
      startFrom: useMe && userPos ? userPos : undefined,
    };
    const out =
      days.length === 1
        ? [planDay(places, { ...base, day: days[0] })]
        : planDays(places, base, days).days;
    setResult(out);
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        useUI.getState().setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseMe(true);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (result) {
    return (
      <Results
        result={result}
        hasRoute={hasRoute}
        onBack={() => setResult(null)}
        onSkip={(slug) => {
          const next = [...skip, slug];
          setSkip(next);
          run(next);
        }}
        onReplan={() => run(skip)}
        onDone={onDone}
      />
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSkip([]);
        run([]);
      }}
    >
      <Field label="Which day">
        <div className="flex flex-wrap gap-2">
          {PUJA_CAL.map((d) => (
            <Chip
              key={d.id}
              active={days.includes(d.id)}
              onClick={() => {
                const next = flip(days, d.id);
                const kept = next.length ? next : [d.id];
                setDays(kept);
                patch({ day: kept[0] });
              }}
            >
              {d.name} <span className="text-xs">{d.weekday} {d.date.slice(8)}</span>
            </Chip>
          ))}
        </div>
        {days.length > 1 && <p className="text-xs text-muted">Several days: each day gets its own part of the city and no place repeats.</p>}
        {days.length === 1 && pujaDay(days[0]).crowd === "extreme" && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Flame size={14} weight="fill" className="text-primary" /> {pujaDay(days[0]).name} is the busiest day. Plans allow for queues.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <TimeField label="Start" value={req.start} onChange={(start) => patch({ start })} />
        <TimeField label="Finish by" value={req.end} onChange={(end) => patch({ end })} hint={endsNextDay ? "next day" : undefined} />
      </div>

      <Field label="Where">
        <div className="flex flex-wrap gap-2">
          <Chip active={req.regions.length === 0} onClick={() => patch({ regions: [] })}>
            Anywhere
          </Chip>
          {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
            <Chip key={r} active={req.regions.includes(r)} onClick={() => patch({ regions: flip(req.regions, r) })}>
              {REGION_LABEL[r]}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (useMe ? setUseMe(false) : userPos ? setUseMe(true) : locate())}
          aria-pressed={useMe}
          className={clsx(
            "mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
            useMe ? "border-transparent bg-fg text-bg" : "border-line bg-surface",
          )}
        >
          <CrosshairSimple size={16} weight="bold" /> {locating ? "Locating…" : useMe ? "Starting near me" : "Start near me"}
        </button>
      </Field>

      <Field label="Who is going">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <Chip key={g} active={req.group === g} onClick={() => patch({ group: g })}>
              {GROUP_LABEL[g]}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="What you like">
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Chip key={i} active={req.interests.includes(i)} onClick={() => patch({ interests: flip(req.interests, i) })}>
              {INTEREST_LABEL[i]}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Meals">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MEAL_LABEL) as (keyof Meals)[]).map((m) => (
            <Chip key={m} active={req.meals[m]} onClick={() => patch({ meals: { ...req.meals, [m]: !req.meals[m] } })}>
              {MEAL_LABEL[m]}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {([1, 2, 3, 4] as const).map((b) => (
            <Chip key={b} active={req.budget === b} onClick={() => patch({ budget: b })}>
              {"₹".repeat(b)}
              <span className="text-xs">{["street", "casual", "nice", "splurge"][b - 1]}</span>
            </Chip>
          ))}
          <Chip active={req.diet === "veg"} onClick={() => patch({ diet: req.diet === "veg" ? "any" : "veg" })}>
            Veg only
          </Chip>
        </div>
      </Field>

      <Field label="Pace &amp; Weather">
        <div className="flex flex-wrap gap-2">
          {PACES.map((p) => (
            <Chip key={p} active={req.pace === p} onClick={() => patch({ pace: p })}>
              {PACE_LABEL[p]}
            </Chip>
          ))}
          <Chip
            active={!!req.rainAware}
            onClick={() => patch({ rainAware: !req.rainAware })}
          >
            🌧️ Rain-aware (indoor focus)
          </Chip>
        </div>
      </Field>

      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-fg transition-transform active:scale-95"
      >
        <Sparkle size={20} weight="fill" /> Plan {days.length > 1 ? `${days.length} days` : "my day"}
      </button>
    </form>
  );
}

function Results({
  result,
  hasRoute,
  onBack,
  onSkip,
  onReplan,
  onDone,
}: {
  result: Itinerary[];
  hasRoute: boolean;
  onBack: () => void;
  onSkip: (slug: string) => void;
  onReplan: () => void;
  onDone: () => void;
}) {
  const { setPlanned, setTab, select } = useUI.getState();
  const load = (it: Itinerary) => {
    setPlanned(slugsOf(it), scheduleOf(it), it.request.day);
    select(null);
    setTab("plan");
    onDone();
  };
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="-ml-1 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <CaretLeft size={16} weight="bold" /> Change my answers
      </button>

      {result.map((it) => {
        const day = pujaDay(it.request.day);
        return (
          <section key={it.request.day} className="space-y-3 rounded-2xl border border-line bg-surface p-3.5" aria-label={`${day.name} plan`}>
            <header className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">
                {day.name} <span className="text-sm font-normal text-muted">{day.weekday} {day.date.slice(8)} Oct</span>
              </h3>
              <span className="text-xs text-muted tabular-nums">
                {it.stopCount} stops{it.items.length ? ` · done ${fmtClock(it.endsAt)}` : ""}
              </span>
            </header>

            {it.items.length === 0 ? (
              <p className="text-sm text-muted">Nothing fit these answers.</p>
            ) : (
              <ol className="space-y-0">
                {it.items.map((item) => {
                  const p = placeBySlug.get(item.slug)!;
                  const Mode = item.travel ? MODE_META[item.travel.mode].icon : null;
                  return (
                    <li key={item.slug} className="relative">
                      {item.travel && Mode && (
                        <p className="ml-[3.1rem] flex items-center gap-1.5 border-l-2 border-dashed border-line py-1.5 pl-4 text-xs text-muted">
                          <Mode size={14} weight="duotone" /> {item.travel.minutes} min · {MODE_META[item.travel.mode].label.toLowerCase()} · {item.travel.km.toFixed(1)} km
                        </p>
                      )}
                      <div className="flex items-start gap-3 py-1.5">
                        <span className="w-[3.1rem] shrink-0 pt-1 text-right text-xs font-semibold tabular-nums">{fmtClock(item.arrive)}</span>
                        <span
                          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
                          style={{ background: `var(${p.category === "bonedi_bari" ? "--c-bari" : p.category === "pandal" ? "--c-pandal" : "--c-food"})`, color: "var(--pin-fg)" }}
                        >
                          <PlaceIcon place={p} size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => select(p.slug)} className="block max-w-full truncate text-left text-sm font-semibold hover:underline">
                            {p.name.en}
                          </button>
                          <p className="text-xs text-muted">
                            {item.kind === "meal" ? "Eat" : "See"} · until {fmtClock(item.depart)}
                            {item.why.length > 0 && ` · ${item.why.join(" · ")}`}
                          </p>
                          {item.ritual && (
                            <p className="mt-0.5 text-xs font-medium text-accent">
                              {item.ritual.label}, about {fmtClock(item.ritual.start)}
                            </p>
                          )}
                          {item.warnings.map((w) => (
                            <p key={w} className="mt-0.5 flex items-start gap-1 text-xs text-muted">
                              <Warning size={13} weight="fill" className="mt-0.5 shrink-0 text-primary" /> {w}
                            </p>
                          ))}
                        </div>
                        {!item.ritual && (
                          <button
                            type="button"
                            aria-label={`Not ${p.name.en}: find another`}
                            title="Find another"
                            onClick={() => onSkip(item.slug)}
                            className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface2"
                          >
                            <ArrowClockwise size={16} weight="bold" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {it.notes.length > 0 && (
              <ul className="space-y-1 text-xs leading-relaxed text-muted">
                {it.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}

            {it.items.length > 0 && (
              <button
                type="button"
                onClick={() => load(it)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg transition-transform active:scale-95"
              >
                {hasRoute ? "Replace my plan with this" : "Use this plan"}
              </button>
            )}
          </section>
        );
      })}

      <button type="button" onClick={onReplan} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-medium">
        <ArrowClockwise size={16} weight="bold" /> Re-plan
      </button>
      <p className="text-xs leading-relaxed text-muted">
        Times are estimates. Hours come from Google Maps as of the last snapshot, and ritual times are a guide: each club sets its own.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</legend>
      {children}
    </fieldset>
  );
}

function TimeField({ label, value, onChange, hint }: { label: string; value: number; onChange: (m: number) => void; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label} {hint && <span className="font-normal normal-case">({hint})</span>}
      </span>
      <input
        type="time"
        value={toTimeInput(value)}
        onChange={(e) => {
          const m = parseTimeInput(e.target.value);
          if (m !== null) onChange(m);
        }}
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}

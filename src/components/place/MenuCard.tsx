"use client";

import { Coffee, CookingPot, ForkKnife, IceCream, Sparkle } from "@phosphor-icons/react";
import type { Place } from "@/lib/schema";

export function MenuCard({ place: p }: { place: Place }) {
  const hasMustTry =
    p.mustTry &&
    (p.mustTry.veg.length > 0 || p.mustTry.nonveg.length > 0 || p.mustTry.drinks.length > 0);
  const hasMenu = p.menu && p.menu.length > 0;

  if (!hasMustTry && !hasMenu) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <ForkKnife size={16} weight="bold" className="text-primary" /> Menu & Recommendations
        </h3>
        {p.pureVeg && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            100% Pure Veg
          </span>
        )}
      </div>

      {hasMustTry && (
        <div className="space-y-2 rounded-xl bg-surface2/60 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-fg">
            <Sparkle size={15} weight="fill" className="text-accent" /> Must Try
          </h4>
          <div className="space-y-2 text-xs">
            {p.mustTry!.nonveg.length > 0 && (
              <div>
                <span className="font-medium text-rose-600 dark:text-rose-400">Non-Veg: </span>
                <span className="text-muted">{p.mustTry!.nonveg.join(" · ")}</span>
              </div>
            )}
            {p.mustTry!.veg.length > 0 && (
              <div>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Veg: </span>
                <span className="text-muted">{p.mustTry!.veg.join(" · ")}</span>
              </div>
            )}
            {p.mustTry!.drinks.length > 0 && (
              <div>
                <span className="font-medium text-amber-600 dark:text-amber-400">Drinks: </span>
                <span className="text-muted">{p.mustTry!.drinks.join(" · ")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasMenu && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted">Popular Menu Items</h4>
          <div className="divide-y divide-line/40 rounded-xl border border-line/60 bg-surface">
            {p.menu!.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      item.diet === "veg" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    title={item.diet === "veg" ? "Vegetarian" : "Non-Vegetarian"}
                  />
                  <span className="font-medium text-fg">{item.name}</span>
                  {item.kind === "drink" && <Coffee size={13} className="text-muted" />}
                  {item.kind === "dessert" && <IceCream size={13} className="text-muted" />}
                </div>
                {item.price !== undefined && (
                  <span className="font-mono font-medium text-muted">₹{item.price}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {p.menuSources && p.menuSources.length > 0 && (
        <p className="text-[11px] text-muted">
          Sources: {p.menuSources.join(", ")}
        </p>
      )}
    </section>
  );
}

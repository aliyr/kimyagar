import { qualitativeLevel } from '../engine';
import type { PropertyMultipliers } from '../engine/types';
import { qualitativeLabels } from '../data/labels';
import { useGameStore } from '../store/gameStore';

interface PropertyChipsProps {
  values: PropertyMultipliers;
}

/** تراشه‌های کیفی — هرگز عدد خام نشان نمی‌دهد. */
export function PropertyChips({ values }: PropertyChipsProps) {
  const properties = useGameStore((s) => s.defs.properties);
  const chips = properties.flatMap((p) => {
    const v = values[p.id];
    if (v == null) return [];
    const level = qualitativeLevel(v, p);
    if (level === 'none') return [];
    return [{ id: p.id, nameFa: p.nameFa, label: qualitativeLabels[level] }];
  });

  if (chips.length === 0) {
    return <p className="kimi-chips-empty">اثر محسوسی دیده نمی‌شود.</p>;
  }

  return (
    <ul className="kimi-prop-chips">
      {chips.map((c) => (
        <li key={c.id} className="kimi-prop-chip">
          {c.nameFa}: {c.label}
        </li>
      ))}
    </ul>
  );
}

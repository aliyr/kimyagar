import { describe, expect, it } from 'vitest';
import { attarQuotes, dayOfYear, quoteForDate } from '../../src/data/attarQuotes';
import { isStageUnlocked, stages } from '../../src/data/stages';
import { SKY_THEMES, currentTimeOfDay, hourOverride, skyVars, timeOfDayForHour } from '../../src/scene/intro/timeOfDay';

describe('timeOfDay', () => {
  it('maps hours to dawn / dusk / night at the documented boundaries', () => {
    expect(timeOfDayForHour(4)).toBe('dawn');
    expect(timeOfDayForHour(10)).toBe('dawn');
    expect(timeOfDayForHour(11)).toBe('dusk');
    expect(timeOfDayForHour(18)).toBe('dusk');
    expect(timeOfDayForHour(19)).toBe('night');
    expect(timeOfDayForHour(0)).toBe('night');
    expect(timeOfDayForHour(3)).toBe('night');
  });

  it('tolerates fractional, negative and out-of-range hours', () => {
    expect(timeOfDayForHour(10.9)).toBe('dawn');
    expect(timeOfDayForHour(25)).toBe('night');
    expect(timeOfDayForHour(-2)).toBe('night');
  });

  it('parses ?hour= override and rejects garbage', () => {
    expect(hourOverride('?hour=21')).toBe(21);
    expect(hourOverride('?foo=1&hour=7')).toBe(7);
    expect(hourOverride('?hour=24')).toBeNull();
    expect(hourOverride('?hour=abc')).toBeNull();
    expect(hourOverride('')).toBeNull();
  });

  it('currentTimeOfDay prefers the override over the clock', () => {
    const noon = new Date(2026, 0, 1, 12, 0, 0);
    expect(currentTimeOfDay(noon, '')).toBe('dusk');
    expect(currentTimeOfDay(noon, '?hour=22')).toBe('night');
    expect(currentTimeOfDay(noon, '?hour=5')).toBe('dawn');
  });

  it('emits one CSS variable per theme field, and only night has fireflies', () => {
    for (const theme of Object.values(SKY_THEMES)) {
      const vars = skyVars(theme);
      expect(Object.keys(vars).every((k) => k.startsWith('--'))).toBe(true);
      expect(vars['--sky-a']).toBe(theme.skyA);
      expect(vars['--moon-opacity']).toBe(String(theme.moon));
      expect(vars['--tint-filter']).toBe(theme.tintFilter);
      expect(vars['--passer-opacity']).toBe(String(theme.passerOpacity));
    }
    // سایه‌ی رهگذر: هرچه روشن‌تر، کم‌رنگ‌تر
    expect(SKY_THEMES.night.passerOpacity).toBeGreaterThan(SKY_THEMES.dusk.passerOpacity);
    expect(SKY_THEMES.dusk.passerOpacity).toBeGreaterThan(SKY_THEMES.dawn.passerOpacity);
    expect(SKY_THEMES.night.fireflies).toBe(true);
    expect(SKY_THEMES.dusk.fireflies).toBe(false);
    expect(SKY_THEMES.dawn.fireflies).toBe(false);
  });
});

describe('attarQuotes', () => {
  it('every quote has two non-empty lines and an attribution', () => {
    expect(attarQuotes.length).toBeGreaterThanOrEqual(6);
    for (const q of attarQuotes) {
      expect(q.lines).toHaveLength(2);
      expect(q.lines[0].trim().length).toBeGreaterThan(0);
      expect(q.lines[1].trim().length).toBeGreaterThan(0);
      expect(q.attribution.trim().length).toBeGreaterThan(0);
    }
  });

  it('dayOfYear counts from 0 on Jan 1', () => {
    expect(dayOfYear(new Date(2026, 0, 1, 9))).toBe(0);
    expect(dayOfYear(new Date(2026, 1, 1, 9))).toBe(31);
    expect(dayOfYear(new Date(2026, 11, 31, 9))).toBe(364);
  });

  it('is stable within a day and cycles through the whole list', () => {
    const morning = new Date(2026, 4, 10, 6);
    const evening = new Date(2026, 4, 10, 23);
    expect(quoteForDate(morning)).toBe(quoteForDate(evening));

    const seen = new Set<AttarQuoteLike>();
    for (let d = 0; d < attarQuotes.length; d++) {
      seen.add(quoteForDate(new Date(2026, 0, 1 + d, 12)));
    }
    expect(seen.size).toBe(attarQuotes.length);
  });
});

type AttarQuoteLike = (typeof attarQuotes)[number];

describe('stages', () => {
  it('has six stages with unique ids and in-bounds map coordinates', () => {
    expect(stages).toHaveLength(6);
    expect(new Set(stages.map((s) => s.id)).size).toBe(6);
    for (const s of stages) {
      expect(s.mapX).toBeGreaterThan(0);
      expect(s.mapX).toBeLessThan(100);
      expect(s.mapY).toBeGreaterThan(0);
      expect(s.mapY).toBeLessThan(100);
    }
  });

  it('only the shop is unlocked for now', () => {
    expect(stages[0].id).toBe('shop');
    expect(isStageUnlocked(0)).toBe(true);
    for (let i = 1; i < stages.length; i++) expect(isStageUnlocked(i)).toBe(false);
  });
});

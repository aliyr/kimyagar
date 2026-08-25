/**
 * ترکیب صحنه‌ی نسخه ۲ — مالک: Workstream B.
 *
 * تفاوت اصلی با کارگاه کلاسیک: کابینت کشویی حذف شده و جایش قفسه‌ی دیواری
 * همیشه-دیده (ShelfStation از Workstream A) آمده؛ همه‌ی لایه‌ها سبک‌آگاه‌اند
 * (flat/pixel) و از V2_ZONES/V2_ART می‌آیند.
 *
 * ترتیب نوشتن زیر فقط برای خوانایی است؛ z واقعی از V2_ZONES می‌آید.
 */

import { StyleContext } from './contracts';
import type { ArtStyle } from './contracts';
import { ShelfStation } from './ShelfStation';
import { MortarStationV2 } from './MortarStationV2';
import { CauldronStationV2 } from './CauldronStationV2';
import {
  BackdropV2,
  BottleStationV2,
  CustomerAreaV2,
  GoalNoteV2,
  HeatControlV2,
  TablePropsV2,
  WorkTableV2,
} from './stations';
import { StyleSwitcher } from './StyleSwitcher';
import { DragGhost } from '../DragGhost';
import './scene-v2.css';

export function WorkshopSceneV2({ artStyle }: { artStyle: ArtStyle }) {
  return (
    <StyleContext.Provider value={artStyle}>
      <div className="v2-scene" data-testid="v2-scene" data-art-style={artStyle}>
        <BackdropV2 />
        <ShelfStation />
        <WorkTableV2 />
        <MortarStationV2 />
        <CauldronStationV2 />
        <HeatControlV2 />
        <BottleStationV2 />
        <CustomerAreaV2 />
        <GoalNoteV2 />
        <TablePropsV2 />
        <DragGhost />
        <StyleSwitcher />
      </div>
    </StyleContext.Provider>
  );
}

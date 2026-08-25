/**
 * ترکیب لایه‌های کارگاه. ترتیب رندر مهم نیست چون z-index از
 * SCENE_ZONES می‌آید؛ ترتیب زیر فقط برای خوانایی است.
 *
 * قفسه‌ی دیواری (ShelfStationClassic) جای کابینت کشویی را گرفته است؛ فایل
 * Cabinet.tsx دست‌نخورده می‌ماند اما دیگر رندر نمی‌شود.
 */

import './classic-ambience.css';
import { Backdrop } from './Backdrop';
import { CauldronStation } from './CauldronStation';
import { HeatControl } from './HeatControl';
import { MortarStation } from './MortarStation';
import { BottleStation } from './BottleStation';
import { TableProps } from './TableProps';
import { CustomerArea } from './CustomerArea';
import { ShelfStationClassic } from './ShelfStationClassic';
import { GoalNote } from './GoalNote';
import { DragGhost } from './DragGhost';

export function WorkshopScene() {
  return (
    <>
      <Backdrop />
      <ShelfStationClassic />
      <CustomerArea />
      <HeatControl />
      <CauldronStation />
      <MortarStation />
      <BottleStation />
      <TableProps />
      <GoalNote />
      <DragGhost />
    </>
  );
}

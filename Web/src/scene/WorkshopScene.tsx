/**
 * ترکیب لایه‌های کارگاه. ترتیب رندر مهم نیست چون z-index از
 * SCENE_ZONES می‌آید؛ ترتیب زیر فقط برای خوانایی است.
 */

import { Backdrop } from './Backdrop';
import { CauldronStation } from './CauldronStation';
import { HeatControl } from './HeatControl';
import { MortarStation } from './MortarStation';
import { BottleStation } from './BottleStation';
import { TableProps } from './TableProps';
import { CustomerArea } from './CustomerArea';
import { Cabinet } from './Cabinet';
import { GoalNote } from './GoalNote';
import { DragGhost } from './DragGhost';

export function WorkshopScene() {
  return (
    <>
      <Backdrop />
      <CustomerArea />
      <HeatControl />
      <CauldronStation />
      <MortarStation />
      <BottleStation />
      <TableProps />
      <Cabinet />
      <GoalNote />
      <DragGhost />
    </>
  );
}

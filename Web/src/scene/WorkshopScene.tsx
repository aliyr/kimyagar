/**
 * ترکیب لایه‌های کارگاه. ترتیب رندر مهم نیست چون z-index از
 * SCENE_ZONES می‌آید؛ ترتیب زیر فقط برای خوانایی است.
 *
 * قفسه‌ی دیواری (ShelfStationClassic) جای کابینت کشویی را گرفته است؛ فایل
 * Cabinet.tsx دست‌نخورده می‌ماند اما دیگر رندر نمی‌شود.
 */

import './classic-ambience.css';
import { Backdrop } from './Backdrop';
import { ContactShadows } from './ContactShadows';
import { StoveHole } from './StoveHole';
import { CauldronStation } from './CauldronStation';
import { FurnaceFire } from './FurnaceFire';
import { MortarStation } from './MortarStation';
import { BottlingSequence } from './BottlingSequence';
import { TableProps } from './TableProps';
import { CustomerArea } from './CustomerArea';
import { ShelfStationClassic } from './ShelfStationClassic';
import { GoalNote } from './GoalNote';
import { DragGhost } from './DragGhost';
import { BurntSmoke } from './BurntSmoke';
import { Cinematic } from './Cinematic';
import { ScenePreload } from './ScenePreload';

export function WorkshopScene() {
  return (
    <>
      <ScenePreload />
      <Backdrop />
      <ContactShadows />
      <StoveHole />
      <ShelfStationClassic />
      <CustomerArea />
      <FurnaceFire />
      <CauldronStation />
      <MortarStation />
      <BottlingSequence />
      <BurntSmoke />
      <TableProps />
      <GoalNote />
      <DragGhost />
      <Cinematic />
    </>
  );
}

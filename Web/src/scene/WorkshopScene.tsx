/**
 * ترکیب لایه‌های کارگاه. ترتیب رندر مهم نیست چون z-index از
 * SCENE_ZONES می‌آید؛ ترتیب زیر فقط برای خوانایی است.
 *
 * کابینت ایستاده‌ی سمت چپ میز (SideCabinetClassic، لایه‌ی کار) جای قفسه‌ی
 * دیواری افقی را گرفته است؛ فایل Cabinet.tsx دست‌نخورده می‌ماند اما دیگر رندر
 * نمی‌شود.
 */

import { useRef, useState } from 'react';
import './classic-ambience.css';
import { useRouteKind } from '../route';
import { useSceneTilt } from './tilt/useSceneTilt';
import { TILT } from './tilt/tiltMath';
import { TiltPinContext } from './tilt/tiltPin';
import { Backdrop } from './Backdrop';
import { DiscardWallFx } from './DiscardWallFx';
import { ContactShadows } from './ContactShadows';
import { StoveHole } from './StoveHole';
import { StoveFlames } from './cauldron/StoveFlames';
import { CauldronStation } from './CauldronStation';
import { FurnaceFire, HeatNotches } from './FurnaceFire';
import { MortarStation } from './MortarStation';
import { BottlingSequence } from './BottlingSequence';
import { TableProps } from './TableProps';
import { CustomerArea } from './CustomerArea';
import { SideCabinetClassic } from './SideCabinetClassic';
import { GoalNote } from './GoalNote';
import { DragGhost } from './DragGhost';
import { BurntSmoke } from './BurntSmoke';
import { Cinematic } from './Cinematic';
import { ScenePreload } from './ScenePreload';

export function WorkshopScene() {
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const [pin, setPin] = useState<HTMLElement | null>(null);
  const live = useRouteKind() === 'classic';
  useSceneTilt(tiltRef, live, { pointer: true });

  return (
    <TiltPinContext.Provider value={pin}>
      <div ref={tiltRef} className="scene-tilt">
        <div className="scene-tilt__persp">
          <div className="scene-tilt__rig" data-tilt-rig="">
            <ScenePreload />
            <Cinematic />
            <div className="scene-depth scene-depth--back" data-tilt-depth={TILT.depthBack}>
              <Backdrop />
              {/* لکه‌ی دیگِ دورریخته روی دیوار: زیرِ میز */}
              <DiscardWallFx />
            </div>
          </div>
        </div>
        {/* بیرون از چرخش: فقط ۲ پیکسل، تا دیگ و هاون از زیر دست نلغزند */}
        <div className="scene-depth scene-depth--work" data-tilt-depth={TILT.depthWork}>
          <ContactShadows />
          <StoveHole />
          <StoveFlames />
          <FurnaceFire />
          <CauldronStation />
          <SideCabinetClassic />
          <MortarStation />
          <BottlingSequence />
          <BurntSmoke />
          <DragGhost />
          <TableProps part="history" />
        </div>
        <div className="scene-depth scene-depth--near" data-tilt-depth={TILT.depthNear}>
          <CustomerArea />
          <GoalNote />
        </div>
        <div ref={setPin} className="scene-depth scene-depth--pin">
          <HeatNotches />
          <TableProps part="notebook" />
          <TableProps part="bucket" />
        </div>
      </div>
    </TiltPinContext.Provider>
  );
}

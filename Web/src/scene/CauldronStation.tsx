/**
 * پاتیل — مرکز ادراکی تجربه (بخش ۴.۱)، نسخه‌ی هیبرید کلاسیک.
 *
 * بدنه‌ی مسیِ PNG (SCENE_ZONES.cauldron) می‌ماند؛ هرچه داخل دهانه زنده است —
 * مایع با رنگ ترکیب مواد، ذرات شناور که به نسبت استخراج فرو می‌روند، قاشق
 * سر بزی، حباب، بخار، شمسه‌ی «رسیده» و دود «سوخته» — از FlatCookingScene کیت
 * Works روی Canvas (ClassicCauldronFx) رندر می‌شود که دقیقاً روی دهانه‌ی PNG
 * نشسته است (classicCauldronGeometry).
 *
 * تعامل:
 * - ژست دایره‌ای ⇒ هم‌زدن دستی؛ قاشق Canvas دنبال اشاره‌گر می‌رود.
 * - Tap بدون حرکت روی پاتیلِ پر ⇒ شروع توالی ریختن در شیشه (BottlingSequence):
 *   bottleBrew + فاز 'tilt' در uiState. هر وقت محتوا هست مجاز است؛ آماده‌بودن
 *   با شمسه و هاله‌ی طلایی نشان داده می‌شود، نه با قفل.
 * - دما بدون عقربه: شدت آتش کوره، حباب، بخار و نور کف دیگ (FurnaceFire/FireLight).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import { useCircleGesture } from '../gestures';
import { SCENE_ZONES } from './artManifest';
import { PROPS } from './layout';
import { ArtLayer, rectStyle, zoneStyle } from './Zone';
import { useUiState } from './uiState';
import { FlatCookingScene } from '../art/flat/kit/scene.ts';
import { ClassicCauldronFx } from './ClassicCauldronFx';
import { CLASSIC_KIT_MOUTH, CLASSIC_MOUTH, classicSpoonAngleFor } from './classicCauldronGeometry';
import { classicSpoonShape } from './classicSpoon';
import { sfx } from '../audio/sfx';
import './classic-stations.css';

/** راهنمای کوتاه «برای ریختن، پاتیل را لمس کن» — بالای لبه */
const BOTTLE_HINT = { ...PROPS.stirHint, y: PROPS.stirHint.y - 4 };

export function CauldronStation() {
  const entries = useGameStore((s) => s.brew.entries);
  const stirCount = useGameStore((s) => s.brew.stirCount);
  const bottled = useGameStore((s) => s.brew.bottled);
  const bottleBrew = useGameStore((s) => s.bottleBrew);
  const stir = useGameStore((s) => s.stir);

  const stirring = useUiState((s) => s.stirring);
  const setStirring = useUiState((s) => s.setStirring);
  const pulse = useUiState((s) => s.pulse);
  const pour = useUiState((s) => s.pour);
  const transfer = useUiState((s) => s.transfer);
  const setPour = useUiState((s) => s.setPour);

  const filled = entries.length > 0;
  const overprocessed = entries.some((e) => e.stage === 'overprocessed');
  const allReady = filled && !overprocessed && entries.every((e) => e.stage === 'ready');
  const canBottle = filled && !bottled && pour === null && transfer === null;

  // یک صحنه‌ی کیت برای عمر کامپوننت — بدون دیگ/اجاق برداری، با دهانه‌ی PNG و قاشق کلاسیک
  const scene = useMemo(
    () => new FlatCookingScene({ drawPot: false, drawHearth: false, mouth: CLASSIC_KIT_MOUTH, spoon: classicSpoonShape() }),
    [],
  );
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const stirGesture = useCircleGesture({
    enabled: filled && !bottled && pour === null,
    onCircle: () => {
      stir();
      pulse('swirlPulse');
      sfx.stir();
    },
    onActiveChange: (active) => {
      setStirring(active);
      if (!active) scene.setSpoonFollow(null);
    },
    onMove: (point) => scene.setSpoonFollow(classicSpoonAngleFor(point)),
    onTap: () => {
      if (!canBottle) return;
      bottleBrew();
      setPour('tilt');
    },
  });

  // پس از بطری‌کردن اگر قاشق دستی مانده بود، بیرون بیاید
  useEffect(() => {
    if (bottled) scene.setSpoonFollow(null);
  }, [scene, bottled]);

  return (
    <>
      <div
        data-testid="cauldron"
        data-ready={allReady ? 'true' : undefined}
        className={`cauldron cst-cauldron interactive${stirring ? ' is-stirring' : ''}${
          allReady && canBottle ? ' is-ready' : ''
        }${canBottle ? ' can-bottle' : ''}`}
        style={zoneStyle(SCENE_ZONES.cauldron)}
        {...stirGesture}
      >
        <div ref={bodyRef} className="cst-cauldron__body">
          <ArtLayer src={SCENE_ZONES.cauldron.img}>
            <div className="cauldron__ph">
              <div className="cauldron__belly" />
              <div className="cauldron__handle cauldron__handle--l" />
              <div className="cauldron__handle cauldron__handle--r" />
              <div className="cauldron__rim" />
            </div>
          </ArtLayer>
        </div>
        {/* هاله‌ی طلایی «آماده برای ریختن» دور دهانه */}
        <div
          className="cst-cauldron__ready"
          style={{
            left: CLASSIC_MOUTH.x - CLASSIC_MOUTH.rx - SCENE_ZONES.cauldron.x - 14,
            top: CLASSIC_MOUTH.y - CLASSIC_MOUTH.ry - SCENE_ZONES.cauldron.y - 10,
            width: CLASSIC_MOUTH.rx * 2 + 28,
            height: CLASSIC_MOUTH.ry * 2 + 20,
          }}
        />
      </div>

      <ClassicCauldronFx scene={scene} bodyRef={bodyRef} />

      {filled && !bottled && stirCount === 0 ? (
        <div className="hint hint--stir" style={rectStyle(PROPS.stirHint, 60)}>
          {uiLabels.stirHint}
        </div>
      ) : null}
      {allReady && canBottle && stirCount > 0 ? (
        <div className="hint hint--stir hint--bottle" style={rectStyle(BOTTLE_HINT, 60)}>
          {uiLabels.tapToBottleHint}
        </div>
      ) : null}
    </>
  );
}

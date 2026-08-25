/**
 * پیشخوان مشتری — سمت راست، جدا از میز کار.
 *
 * مشتری یک بازیگر با چهار فاز است و فازها از state بازی رانده می‌شوند:
 *   enter  — از لبه‌ی راست وارد می‌شود (translateX از +۲۵۰ تا ۰) با چند تکان
 *            راه‌رفتن و محو-به-روشن (~۱٫۱ ثانیه).
 *   idle   — نفس‌کشیدن آرام و بی‌پایان (جابه‌جایی ۱-۲ پیکسل).
 *   react  — به‌محض آمدن evaluation: تصویر به حالت خوشحال/ناراحت Crossfade
 *            می‌شود، انیمیشن واکنش پخش می‌شود و حبابِ گفتار کاغذی با متن
 *            reactionFa کمی بعد ظاهر می‌شود.
 *   leave  — با تغییر customerIndex، چهره‌ی قبلی به راست بیرون می‌رود
 *            (~۰٫۹ ثانیه) و بعد مشتری تازه وارد می‌شود.
 *
 * band ارزیابی: excellent/good ⇒ happy و partial/failure ⇒ sad.
 * تصاویر دو حالت به‌محض ورود مشتری Preload می‌شوند تا تعویض بی‌درنگ باشد.
 */

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { QualityBand } from '../engine/types';
import { CLASSIC_ART, SCENE_ZONES, artUrl } from './artManifest';
import { ArtLayer, rectStyle, useArt, zoneStyle } from './Zone';
import './classic-ambience.css';

const APPEARANCE_STATES = SCENE_ZONES.customer.states as Record<string, string | undefined>;

/** باید با مدت انیمیشن‌های cust-enter / cust-leave در CSS هم‌خوان بماند */
const ENTER_MS = 1100;
const LEAVE_MS = 900;

type Phase = 'enter' | 'idle' | 'react' | 'leave';
type Emotion = 'happy' | 'sad';

function emotionForBand(band: QualityBand): Emotion {
  return band === 'excellent' || band === 'good' ? 'happy' : 'sad';
}

/** هاله‌ی گرمِ زیرِ نورِ واکنش — پشت مشتری، فقط تزئینی */
const SPOT_RECT = {
  x: SCENE_ZONES.customer.x - 120,
  y: SCENE_ZONES.customer.y - 60,
  width: SCENE_ZONES.customer.width + 240,
  height: SCENE_ZONES.customer.height + 200,
};

/** حباب گفتار: چپِ مشتری می‌نشیند تا با کاغذ سفارش (بالا-راست) تلاقی نکند */
const BUBBLE = { left: 1020, top: 176, width: 420 };

const SPARKLES = [
  { left: '16%', top: '18%', delay: '0.15s' },
  { left: '74%', top: '10%', delay: '0.42s' },
  { left: '48%', top: '30%', delay: '0.68s' },
];

export function CustomerArea() {
  const customerIndex = useGameStore((s) => s.customerIndex);
  const customer = useGameStore((s) => s.currentCustomer());
  const evaluation = useGameStore((s) => s.evaluation);
  const appearance = customer.appearance;

  /** چهره‌ای که همین حالا روی صحنه است (در فاز leave هنوز مشتری قبلی است) */
  const [shown, setShown] = useState({ index: customerIndex, appearance });
  const shownRef = useRef(shown);
  shownRef.current = shown;

  const [phase, setPhase] = useState<Phase>('enter');
  const [emotion, setEmotion] = useState<Emotion | null>(null);

  // واکنش: evaluation که آمد، احساس را قفل می‌کنیم؛ رفتنش (Reset) به idle برمی‌گردد
  useEffect(() => {
    if (evaluation) {
      setEmotion(emotionForBand(evaluation.band));
      setPhase('react');
      return;
    }
    // اگر مشتری هم عوض شده، احساس تا پایان خروج حفظ می‌شود (افکت بعدی فاز leave را می‌گذارد)
    if (customerIndex !== shownRef.current.index) return;
    setEmotion(null);
    setPhase((p) => (p === 'react' ? 'idle' : p));
  }, [evaluation, customerIndex]);

  // مشتری بعدی: اول خروج چهره‌ی قبلی، بعد ورود چهره‌ی تازه
  // (این افکت بعد از افکت واکنش اجرا می‌شود تا در nextCustomer فاز leave برنده شود)
  useEffect(() => {
    if (customerIndex === shownRef.current.index) return;
    setPhase('leave');
    const timer = window.setTimeout(() => {
      setShown({ index: customerIndex, appearance });
      setEmotion(null);
      setPhase('enter');
    }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [customerIndex, appearance]);

  // پایان ورود ⇒ نفس‌کشیدن
  useEffect(() => {
    if (phase !== 'enter') return;
    const timer = window.setTimeout(() => setPhase('idle'), ENTER_MS);
    return () => window.clearTimeout(timer);
  }, [phase, shown.index]);

  // Preload هر دو حالت احساسی تا Crossfade بی‌درنگ باشد
  useEffect(() => {
    if (typeof Image === 'undefined') return;
    for (const e of ['happy', 'sad'] as const) {
      const img = new Image();
      img.src = artUrl(CLASSIC_ART.customerEmotion(shown.appearance, e));
    }
  }, [shown.appearance]);

  const emotionArt = useArt(
    emotion ? CLASSIC_ART.customerEmotion(shown.appearance, emotion) : undefined,
    { fit: 'contain', className: 'cust-emotion' },
  );

  const reacting = phase === 'react';

  return (
    <>
      {reacting ? (
        <div className="cust-spot" style={rectStyle(SPOT_RECT, SCENE_ZONES.customer.z - 1)} />
      ) : null}

      <div
        data-testid="customer"
        className="customer cust-root"
        data-appearance={shown.appearance}
        data-phase={phase}
        data-reaction={emotion ?? undefined}
        style={zoneStyle(SCENE_ZONES.customer)}
      >
        <div className="cust-walk">
          <div className="cust-bob">
            <div
              className="cust-sprite"
              data-testid="customer-emotion"
              data-emotion={emotion ?? undefined}
            >
              <ArtLayer key={shown.appearance} src={APPEARANCE_STATES[shown.appearance]}>
                <div className="customer__ph">
                  <span className="customer__drape" />
                  <span className="customer__body" />
                  <span className="customer__head" />
                  <span className="customer__rim" />
                </div>
              </ArtLayer>
              {emotionArt.node}
            </div>
            {reacting && emotion === 'happy'
              ? SPARKLES.map((s, i) => (
                  <span
                    key={i}
                    className="cust-spark"
                    style={{ left: s.left, top: s.top, animationDelay: s.delay }}
                  />
                ))
              : null}
          </div>
        </div>
      </div>

      {reacting && evaluation ? (
        <div
          data-testid="customer-bubble"
          className={`cust-bubble cust-bubble--${emotion ?? 'happy'}`}
          dir="rtl"
          style={{
            position: 'absolute',
            left: BUBBLE.left,
            top: BUBBLE.top,
            width: BUBBLE.width,
            zIndex: 88,
          }}
        >
          <p className="cust-bubble__name">{customer.nameFa}</p>
          <p className="cust-bubble__text">{evaluation.reactionFa}</p>
        </div>
      ) : null}

      <div className="counter" style={zoneStyle(SCENE_ZONES.customerCounter)}>
        <ArtLayer src={SCENE_ZONES.customerCounter.img}>
          <div className="counter__ph">
            <div className="counter__slab" />
            <div className="counter__front" />
            <div className="counter__scale" />
          </div>
        </ArtLayer>
      </div>
    </>
  );
}

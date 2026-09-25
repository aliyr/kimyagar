/**
 * سردر کیمیاگر — نمای بیرونی دکان در راسته‌ی بازار، روی قاب ۱۹۲۰×۱۰۸۰.
 *
 * لایه‌ها (از عقب به جلو):
 *   آسمان (گرادینت به‌وقتِ روز + ماه/ستاره) ⇐ رهگذر ⇐ لنگه‌های در ⇐ نمای دکان
 *   (دهانه‌ی در شفاف؛ کارگاه کلاسیک پشت آن است) ⇐ اشیا: تابلو و لوگو، فانوس،
 *   درکوب، نقشه، دفتر، ورق عطار، گربه، فانوس تنظیمات ⇐ FX.
 *
 * ورود: درکوب ⇒ دو کوبه و زنگ ⇒ لنگه‌ها به داخل باز می‌شوند ⇒ تیرگی کارگاه
 * برمی‌خیزد ⇒ دوربین از آستانه می‌گذرد (scale روی همین لایه) ⇒ #/classic.
 * بار دوم به بعد همه‌چیز با ضریب ۰٫۶ سریع‌تر است؛ reduced-motion فقط fade.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { uiLabels } from '../../data/labels';
import { quoteForDate } from '../../data/attarQuotes';
import { sfx, unlockAudio } from '../../audio/sfx';
import { startAmbience, stopAmbience } from '../../audio/ambience';
import { useGameStore } from '../../store/gameStore';
import { hasProgress, useProgressStore } from '../../store/progressStore';
import { GATE_ART, INTRO_ART, artUrl } from '../artManifest';
import { preloadArt } from '../preloadArt';
import { IntroPanels } from './IntroPanels';
import { markIntroSeen, readIntroSeen, useIntroState } from './introState';
import { SKY_THEMES, currentTimeOfDay, skyVars } from './timeOfDay';
import { useSceneTilt } from '../tilt/useSceneTilt';
import './intro.css';

/** زمان‌بندی ورود (میلی‌ثانیه، پیش از ضریب سرعت) */
const T_KNOCK_2 = 180;
const T_BELL = 450;
const T_DOORS = 500;
const T_ENTER = 700;
const T_DONE = 2100;
/** طول boot اولین اجرا */
const T_BOOT = 2600;
/** حداکثر انتظار برای decode هنر پیش از نمایش */
const T_PRELOAD_MAX = 1800;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function IntroScreen() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const phase = useIntroState((s) => s.phase);
  const panel = useIntroState((s) => s.panel);
  const setPhase = useIntroState((s) => s.setPhase);
  const setPanel = useIntroState((s) => s.setPanel);
  const progress = useProgressStore((s) => s.progress);
  const startFresh = useGameStore((s) => s.startFresh);
  const openOverlayAction = useGameStore((s) => s.openOverlayAction);

  const [ready, setReady] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [catAwake, setCatAwake] = useState(false);
  /** ورق عطار بزرگ شده تا خوانده شود */
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [timeOfDay] = useState(() => currentTimeOfDay());
  const [quote] = useState(() => quoteForDate(new Date()));
  /** ضریب سرعت: بار اول ۱، بعدها ۰٫۶ (در mount ثابت می‌شود) */
  const [speed] = useState(() => (readIntroSeen() ? 0.6 : 1));

  const theme = SKY_THEMES[timeOfDay];
  const canContinue = hasProgress(progress);
  const busy = phase === 'opening' || phase === 'entering';

  useSceneTilt(rootRef, ready && !busy);

  // پیش‌بار هنر؛ بعدش صحنه ظاهر می‌شود (سقف زمانی تا روی شبکه‌ی کند گیر نکند)
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const cap = window.setTimeout(finish, T_PRELOAD_MAX);
    void preloadArt([
      INTRO_ART.facade,
      INTRO_ART.skyFx,
      INTRO_ART.lantern,
      INTRO_ART.knocker,
      INTRO_ART.plaque,
      INTRO_ART.mapRolled,
      INTRO_ART.ledgerClosed,
      INTRO_ART.catSleep,
      GATE_ART.doorWest,
      GATE_ART.doorEast,
      GATE_ART.sign,
      GATE_ART.parchment,
      GATE_ART.customerShadow,
    ]).then(() => {
      finish();
      // پنل‌ها و فریم بیدار گربه بعد از ضروری‌ها، بی‌سروصدا (با آن‌ها سرِ اتصال‌ها رقابت نکنند)
      void preloadArt([INTRO_ART.mapOpen, INTRO_ART.ledgerOpen, INTRO_ART.catAwake]);
    });
    return () => window.clearTimeout(cap);
  }, []);

  // boot اولین اجرا ⇒ idle
  useEffect(() => {
    if (!ready || phase !== 'boot') return;
    const ms = prefersReducedMotion() ? 200 : T_BOOT;
    const id = window.setTimeout(() => {
      markIntroSeen();
      setPhase('idle');
    }, ms);
    return () => window.clearTimeout(id);
  }, [ready, phase, setPhase]);

  // فضای صوتی بازار تا وقتی روی سردر هستیم؛ اولین لمسِ هرجای صفحه صدا را باز می‌کند
  useEffect(() => {
    startAmbience();
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      stopAmbience();
    };
  }, []);

  // جرجر زنجیر هم‌گام با تاب تابلو (دوره‌ی انیمیشن ۶ ثانیه)
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.7) sfx.chainCreak();
    }, 6000);
    return () => window.clearInterval(id);
  }, [ready]);

  // با خروج (رفتن به کارگاه) فاز برای بازگشت بعدی به سردر آماده شود
  useEffect(() => {
    return () => {
      useIntroState.getState().setPanel(null);
      useIntroState.getState().setPhase(readIntroSeen() ? 'idle' : 'boot');
    };
  }, []);

  function enter() {
    if (busy || phase === 'boot') return;
    unlockAudio();
    setPanel(null);
    setQuoteOpen(false);
    const k = speed;
    if (prefersReducedMotion()) {
      sfx.shopBell();
      setPhase('entering');
      window.setTimeout(() => {
        window.location.hash = '#/classic';
      }, 300);
      return;
    }
    setPhase('opening');
    sfx.knock();
    window.setTimeout(() => sfx.knock(), T_KNOCK_2 * k);
    window.setTimeout(() => sfx.shopBell(), T_BELL * k);
    window.setTimeout(() => setDoorsOpen(true), T_DOORS * k);
    window.setTimeout(() => setPhase('entering'), T_ENTER * k);
    window.setTimeout(() => {
      window.location.hash = '#/classic';
    }, T_DONE * k);
  }

  function pokeCat() {
    if (catAwake) return;
    unlockAudio();
    sfx.meow();
    setCatAwake(true);
    window.setTimeout(() => setCatAwake(false), 4000);
  }

  function confirmFresh() {
    startFresh();
    setPanel(null);
  }

  function toggleQuote() {
    if (busy) return;
    unlockAudio();
    sfx.paperRustle();
    setQuoteOpen((o) => !o);
  }

  const rootStyle: CSSProperties = {
    ...(skyVars(theme) as CSSProperties),
    ['--k' as string]: String(speed),
  };
  const classes = [
    'intro',
    `intro--${timeOfDay}`,
    ready ? 'is-ready' : 'is-loading',
    phase === 'boot' ? 'is-booting' : '',
    phase === 'opening' || phase === 'entering' ? 'is-opening' : '',
    doorsOpen ? 'is-doors-open' : '',
    phase === 'entering' ? 'is-entering' : '',
    panel ? 'has-panel' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={classes} style={rootStyle} data-testid="gate-screen" data-phase={phase} data-time={timeOfDay}>
      <div className="intro__tilt">
      <div className="intro__tilt-rig">
      {/* ---------------- آسمان ---------------- */}
      <div className="intro__layer intro__layer--sky">
        <div className="intro__sky-gradient" />
        <img className="intro__sky-fx" src={artUrl(INTRO_ART.skyFx)} alt="" draggable={false} />
        {theme.fireflies ? (
          <div className="intro__fireflies" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="intro__firefly" style={{ ['--i' as string]: String(i) }} />
            ))}
          </div>
        ) : null}
      </div>

      {/* ---------------- نما + در ---------------- */}
      <div className="intro__layer intro__layer--facade">
        <div className="intro__doors" aria-hidden>
          <div className="intro__leaf intro__leaf--west">
            <img src={artUrl(GATE_ART.doorWest)} alt="" draggable={false} />
          </div>
          <div className="intro__leaf intro__leaf--east">
            <img src={artUrl(GATE_ART.doorEast)} alt="" draggable={false} />
          </div>
          <div className="intro__doorway-glow" />
        </div>

        <div className="intro__facade">
          <img className="intro__facade-img" src={artUrl(INTRO_ART.facade)} alt="" draggable={false} />
          {/* همان تصویر با فیلتر رنگیِ وقتِ روز روی خودش؛ آلفای تصویر، دهانه و آسمان را خودش رعایت می‌کند */}
          <img className="intro__facade-tint" src={artUrl(INTRO_ART.facade)} alt="" draggable={false} aria-hidden />
          <div className="intro__window-glow intro__window-glow--left" />
          <div className="intro__window-glow intro__window-glow--right" />
          <div className="intro__lantern-light" />
          <div className="intro__smoke" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>

        <button
          type="button"
          className="intro__settings interactive"
          data-testid="gate-settings"
          aria-label={uiLabels.settings}
          disabled={busy}
          onClick={() => {
            unlockAudio();
            openOverlayAction('settings');
          }}
        >
          <img src={artUrl(INTRO_ART.lantern)} alt="" draggable={false} />
          <span className="intro__tag">{uiLabels.settings}</span>
        </button>
        <button
          type="button"
          className={`intro__cat interactive${catAwake ? ' is-awake' : ''}`}
          data-testid="gate-cat"
          aria-label={uiLabels.gateCat}
          onClick={pokeCat}
        >
          <img className="intro__cat-sleep" src={artUrl(INTRO_ART.catSleep)} alt="" draggable={false} />
          <img className="intro__cat-awake" src={artUrl(INTRO_ART.catAwake)} alt="" draggable={false} />
        </button>
        <button
          type="button"
          className="intro__knocker interactive"
          aria-label={canContinue ? uiLabels.gateContinue : uiLabels.gateStart}
          disabled={busy}
          onClick={enter}
        >
          <img src={artUrl(INTRO_ART.knocker)} alt="" draggable={false} />
        </button>
      </div>

      <div className="intro__layer intro__layer--front">
        {/* تابلو با زنجیر، لوگوتایپ برنجی */}
        <div className="intro__sign">
          <div className="intro__sign-swing">
            <img className="intro__sign-board" src={artUrl(GATE_ART.sign)} alt="" draggable={false} />
            {/* تیتر برنجیِ حکاکی‌شده — همان Vazirmatn بازی، نه تصویر */}
            <h1 className="intro__logo">{uiLabels.gameTitle}</h1>
            <p className="intro__subtitle">{uiLabels.gateSubtitle}</p>
          </div>
        </div>

        {/* فانوس دیواری */}
        <div className="intro__lantern" aria-hidden>
          <span className="intro__lantern-halo" />
          <img src={artUrl(INTRO_ART.lantern)} alt="" draggable={false} />
          <span className="intro__dust" />
          <span className="intro__dust" />
          <span className="intro__dust" />
          <span className="intro__dust" />
          <span className="intro__dust" />
        </div>

        {canContinue ? (
          <button
            type="button"
            className="intro__fresh interactive"
            data-testid="gate-fresh"
            disabled={busy}
            onClick={() => setPanel('confirmFresh')}
          >
            {uiLabels.gateFresh}
          </button>
        ) : null}

        {/* رهگذر در کوچه، جلوی دکان — سایه‌ای که هر چند ثانیه رد می‌شود */}
        <div className="intro__passer" aria-hidden>
          <img src={artUrl(GATE_ART.customerShadow)} alt="" draggable={false} />
        </div>
      </div>
      </div>
      </div>

      <div className="intro__pin">
        <button
          type="button"
          className="intro__ledger interactive"
          data-testid="gate-scores"
          aria-haspopup="dialog"
          aria-expanded={panel === 'scores'}
          disabled={busy}
          onClick={() => setPanel(panel === 'scores' ? null : 'scores')}
        >
          <img src={artUrl(INTRO_ART.ledgerClosed)} alt="" draggable={false} />
          <span className="intro__tag">{uiLabels.gateScores}</span>
        </button>
        {quoteOpen ? (
          <button type="button" className="intro__quote-backdrop interactive" aria-label={uiLabels.closeOverlay} onClick={toggleQuote} />
        ) : null}
        <button
          type="button"
          className={`intro__quote interactive${quoteOpen ? ' is-open' : ''}`}
          data-testid="gate-quote"
          aria-expanded={quoteOpen}
          aria-label={quote.attribution}
          disabled={busy}
          onClick={toggleQuote}
        >
          <img src={artUrl(GATE_ART.parchment)} alt="" draggable={false} />
          <span className="intro__quote-text">
            <span>{quote.lines[0]}</span>
            <span>{quote.lines[1]}</span>
          </span>
          <span className="intro__quote-by">{quote.attribution}</span>
        </button>
        <button
          type="button"
          className="intro__start interactive"
          data-testid="gate-start"
          aria-label={canContinue ? uiLabels.gateContinue : uiLabels.gateStart}
          disabled={busy}
          onClick={enter}
        >
          <span className="intro__plaque">
            <img src={artUrl(INTRO_ART.plaque)} alt="" draggable={false} />
            <span className="intro__plaque-text">{canContinue ? uiLabels.gateContinue : uiLabels.gateStart}</span>
          </span>
        </button>
        <button
          type="button"
          className="intro__map interactive"
          data-testid="gate-stages"
          aria-haspopup="dialog"
          aria-expanded={panel === 'stages'}
          disabled={busy}
          onClick={() => setPanel(panel === 'stages' ? null : 'stages')}
        >
          <img src={artUrl(INTRO_ART.mapRolled)} alt="" draggable={false} />
          <span className="intro__tag">{uiLabels.gateStages}</span>
        </button>
      </div>

      {/* boot: سیاهی که کنار می‌رود */}
      <div className="intro__boot-veil" aria-hidden />

      <IntroPanels panel={panel} onClose={() => setPanel(null)} onFresh={confirmFresh} />
    </div>
  );
}

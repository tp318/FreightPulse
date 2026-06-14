/**
 * TutorialOverlay v3 — Non-blocking interactive onboarding tour.
 *
 * Key behaviours:
 *  • Backdrop is pointer-events:none  → user can click anything on the page freely
 *  • Animated glowing ring highlights the mentioned element (no blocking spotlight)
 *  • Card auto-positions near the target — above / below / left / right based on space
 *  • Steps auto-navigate (dashboard ↔ engine) and auto-scroll to every target element
 *  • Keyboard: ← → Enter Esc
 *  • Typewriter animation on the welcome step
 */
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';

// ─── Tour steps ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    navigate: 'dashboard',
    title: 'Welcome to FreightPulse',
    typewriter: true,
    body: `FreightPulse is a **real-time freight disruption intelligence platform**.\n\nIt monitors global shipping routes, detects disruptions — strikes, severe weather, port congestion, AIS anomalies — and runs a **10-stage AI pipeline** that recommends and acts on the best response.\n\nThis guided tour covers every feature. You can **click anything on the page** while the tour is running!`,
    target: null,
    icon: '🚢',
    hint: 'Use ← → arrow keys or the buttons below. Click anything on the page freely!',
  },
  {
    id: 'topbar',
    navigate: 'dashboard',
    title: '🧭 Top Navigation Bar',
    body: `The top bar is your control centre:\n\n• **FreightPulse** logo — brand mark\n• **Dashboard / Engine** tabs — switch views\n• **● LIVE** pulsing dot — polling heartbeat\n• **Last polled** — data freshness\n• **❓ Tour** button — reopen this tour anytime`,
    target: 'header',
    scrollTo: false,
    icon: '🧭',
  },
  {
    id: 'nav-tabs',
    navigate: 'dashboard',
    title: '📌 Dashboard & Engine Tabs',
    body: `Two core views:\n\n**Dashboard** — your freight command centre. Live shipment map, fleet metrics, signal feed, and alert banner.\n\n**Engine** — the AI pipeline visualiser. Watch all 10 stages run live in real time as disruptions flow through the system.`,
    target: '#nav-tab-dashboard',
    scrollTo: false,
    icon: '📌',
    hint: 'Try clicking Engine tab right now — the tour will stay visible!',
  },
  {
    id: 'map',
    navigate: 'dashboard',
    title: '🗺 Live Shipment Map',
    body: `The world map plots every shipment as an **origin → destination arc**:\n\n• 🟢 Green circle = origin port\n• 🔴 Red/orange = destination (coloured by risk score)\n• Dashed arc = shipping route\n\nHover any marker for shipment details. The map auto-fits when you load data.`,
    target: null,
    icon: '🌍',
    hint: 'Upload a CSV on the right panel to populate the map with your routes.',
  },
  {
    id: 'csv-upload',
    navigate: 'dashboard',
    title: '📁 Upload Shipment Data',
    body: `Upload a **CSV file** with your shipments.\n\nSupported columns (flexible naming):\n  **id · origin · destination · vessel · eta · cargoValue**\n\nDrag-and-drop or click the upload zone. Shipments instantly appear on the map, table, and fleet metrics.`,
    target: null,
    icon: '📤',
    hint: 'Try it: drag a .csv file onto the upload zone, or click to browse.',
  },
  {
    id: 'engine-tab-point',
    navigate: 'dashboard',
    title: '⚡ Switching to the Engine',
    body: `The **Engine tab** reveals the full AI disruption pipeline.\n\nClick the Engine tab now to switch — or press **Next** and we'll take you there automatically.\n\nThe pipeline fires every time a disruption is detected from any data source, or when you click **Simulate Disruption**.`,
    target: '#nav-tab-engine',
    scrollTo: false,
    icon: '⚡',
    hint: 'Click the Engine tab to navigate there yourself, then press Next.',
  },
  {
    id: 'engine-controls',
    navigate: 'engine',
    title: '🎮 Simulate a Disruption',
    body: `At the top of the Engine page:\n\n• **Disruption Type** — strike, weather, congestion, attack, closure\n• **Affected Port** — Rotterdam, Hamburg, Singapore…\n• **⚡ Simulate Disruption** — injects a mock event and fires all 10 stages live\n\nThe backend also **auto-fires a port congestion spike** within ~60 seconds of starting.`,
    target: '#btn-simulate-disruption',
    scrollTo: true,
    icon: '🚨',
    hint: 'Click ⚡ Simulate Disruption right now to start the pipeline!',
  },
  {
    id: 'stage-ingestion',
    navigate: 'engine',
    title: 'Stage 1 — Data Ingestion 📡',
    body: `Data flows in from **4 sources simultaneously**:\n\n• 📰 GDELT news — geopolitical events, strikes, closures\n• 🌊 OpenWeatherMap — wind speed & wave height\n• 🛳 AIS mock — vessel positions & route deviation\n• ⚓ Port congestion — avg wait times at major ports\n\nAll events are published to Kafka topics for the detection engine downstream.`,
    target: '#pipeline-card-ingestion',
    scrollTo: true,
    icon: '📡',
  },
  {
    id: 'stage-kafka',
    navigate: 'engine',
    title: 'Stage 2 — Kafka Streaming ⚡',
    body: `All ingestion events flow through **Redpanda** (Kafka-compatible) in real time.\n\n6 active topics:\n  ingestion.news · ingestion.weather · ingestion.ais\n  ingestion.port-congestion · disruption.detected · engine.stage-updates\n\nThe WebSocket subscribes to \`engine.stage-updates\` — every stage update is pushed to the frontend instantly.`,
    target: '#pipeline-card-kafka',
    scrollTo: true,
    icon: '⚡',
  },
  {
    id: 'stage-storage',
    navigate: 'engine',
    title: 'Stage 3 — Storage Layer 🗄',
    body: `Ingestion events are persisted to two stores:\n\n• **Neo4j** — graph database modelling the freight network as nodes & relationships\n• **TimescaleDB** — time-series database for historical congestion & AIS data\n\nNeo4j powers the graph query step. TimescaleDB powers trend analysis and ML feature engineering.`,
    target: '#pipeline-card-storage',
    scrollTo: true,
    icon: '🗄',
  },
  {
    id: 'stage-detection',
    navigate: 'engine',
    title: 'Stage 4 — Disruption Detection 🚨',
    body: `The rules engine classifies events by threshold:\n\n• **News**: keyword match (strike/houthi/blockade…) + port location\n• **Weather**: wind > 55 km/h OR waves > 4m\n• **Port Congestion**: avg wait > **24 hours** ← auto-fires on startup!\n• **AIS**: vessel > 30nm off expected route\n\nDetected disruptions are written to Neo4j and trigger the decision pipeline immediately.`,
    target: '#pipeline-card-detection',
    scrollTo: true,
    icon: '🚨',
  },
  {
    id: 'stage-graph',
    navigate: 'engine',
    title: 'Stage 5 — Graph Query 🕸',
    body: `Neo4j models the freight network as a **knowledge graph**:\n\n\`(Shipment)→(Vessel)→(Route)→(Port)→(DisruptionEvent)\`\n\nA Cypher traversal finds every affected shipment across multi-hop routes in milliseconds. Falls back to mock shipments when Neo4j isn't connected so the pipeline always completes.`,
    target: '#pipeline-card-graph-query',
    scrollTo: true,
    icon: '🕸',
  },
  {
    id: 'stage-ml',
    navigate: 'engine',
    title: 'Stage 6 — ML Prediction 🧪',
    body: `Each affected shipment goes through the **ML predictor**:\n\n• Predicted delay hours\n• Confidence score (0–1)\n• Escalation probability\n\nCurrently running \`mock-heuristic-v1\`. Swap \`backend/ml/mock_predictor.py\` with a real trained model to go to production — the pipeline interface stays the same.`,
    target: '#pipeline-card-ml-prediction',
    scrollTo: true,
    icon: '🧪',
  },
  {
    id: 'stage-scoring',
    navigate: 'engine',
    title: 'Stage 7 — Scoring & Ranking 📊',
    body: `The scorer assigns a **weighted risk score** to each shipment:\n\n• Cargo value × daily demurrage rate\n• Customer SLA strictness & strategic importance\n• Priority level (critical / high / medium)\n• Predicted delay hours from ML\n• Historical port reliability\n\nShipments are ranked highest-risk first so the LLM focuses on what matters most.`,
    target: '#pipeline-card-scoring',
    scrollTo: true,
    icon: '📊',
  },
  {
    id: 'stage-altroutes',
    navigate: 'engine',
    title: 'Stage 8 — Alternative Routes 🗺',
    body: `The engine queries Neo4j for **alternative routes** that avoid the disrupted port.\n\nFor each top-risk shipment it returns:\n• Alternative port sequence & hops\n• Estimated extra transit days\n• Route reliability score\n\nFalls back to hardcoded alternatives in demo mode so the card always populates.`,
    target: '#pipeline-card-alt-routes',
    scrollTo: true,
    icon: '🗺',
  },
  {
    id: 'stage-llm',
    navigate: 'engine',
    title: 'Stage 9 — LLM Reasoning 🤖',
    body: `The top shipments, ML predictions, and alt routes are sent to **Claude** for final decision-making:\n\n• **Decision**: reroute / hold / expedite / split-shipment\n• **Rationale**: 2-3 sentence justification\n• **Call Script**: what the calling agent reads aloud\n\nWatch the **token stream appear** character-by-character. No API key? A mock streamer runs the animation so the UI is always alive.`,
    target: '#pipeline-card-llm-reasoning',
    scrollTo: true,
    icon: '🤖',
    hint: 'Set ANTHROPIC_API_KEY in .env for real Claude reasoning.',
  },
  {
    id: 'stage-calling',
    navigate: 'engine',
    title: 'Stage 10 — Calling Agent 📞',
    body: `The final stage places an **outbound Twilio phone call** to the freight forwarder.\n\nThe call script from Claude is served as TwiML at \`/twiml/brief/{id}\` and read aloud automatically. In demo mode the call is skipped but the script is logged.\n\nThis closes the loop: **detect → analyse → decide → act**.`,
    target: '#pipeline-card-calling-agent',
    scrollTo: true,
    icon: '📞',
    hint: 'Set TWILIO_* credentials in .env to enable real outbound calls.',
  },
  {
    id: 'done',
    navigate: 'engine',
    title: "🎉 You're all set!",
    body: `You've seen the entire FreightPulse pipeline!\n\n**Quick start:**\n• Click **⚡ Simulate Disruption** to watch all 10 stages run live\n• Upload a shipment CSV on the Dashboard to populate the map\n• Check the right sidebar for the architecture legend\n\n**Enable real features:**\n• \`ANTHROPIC_API_KEY\` — real LLM reasoning via Claude\n• \`TWILIO_*\` — real outbound phone calls\n• \`docker-compose up\` — full Kafka + Neo4j + TimescaleDB stack`,
    target: null,
    icon: '🚀',
  },
];

const STORAGE_KEY = 'fp_tutorial_v3_dismissed';
const CARD_W = 460;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(val, lo, hi) { return Math.min(Math.max(val, lo), hi); }

/** Calculate pixel top/left for the card given the target selector. */
function calcPosition(targetSelector) {
  if (!targetSelector) return { top: null, left: null, centered: true, arrowDir: null };

  const el = document.querySelector(targetSelector);
  if (!el) return { top: null, left: null, centered: true, arrowDir: null };

  const r   = el.getBoundingClientRect();
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const M   = 12;   // margin from edge
  const GAP = 16;   // gap between card and ring
  const CH  = 400;  // estimated card height

  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;

  const below  = vh - r.bottom - M;
  const above  = r.top         - M;
  const toRight = vw - r.right  - M;
  const toLeft  = r.left        - M;

  let top, left, arrowDir;

  if (below >= CH + GAP) {
    top      = r.bottom + GAP;
    left     = clamp(cx - CARD_W / 2, M, vw - CARD_W - M);
    arrowDir = 'up';
  } else if (above >= CH + GAP) {
    top      = r.top - CH - GAP;
    left     = clamp(cx - CARD_W / 2, M, vw - CARD_W - M);
    arrowDir = 'down';
  } else if (toRight >= CARD_W + GAP) {
    top      = clamp(cy - CH / 2, M, vh - CH - M);
    left     = r.right + GAP;
    arrowDir = 'left';
  } else {
    top      = clamp(cy - CH / 2, M, vh - CH - M);
    left     = Math.max(r.left - CARD_W - GAP, M);
    arrowDir = 'right';
  }

  top  = clamp(top,  M, vh - CH - M);
  left = clamp(left, M, vw - CARD_W - M);

  return { top, left, centered: false, arrowDir };
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed, active) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setOut(text); setDone(true); return; }
    setOut(''); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return { out, done };
}

// ─── Minimal Markdown renderer ────────────────────────────────────────────────
function Md({ text }) {
  return (
    <div style={{ lineHeight: 1.72 }}>
      {text.split('\n').map((line, i) => {
        const segs = line.split(/\*\*([^*]+)\*\*/g);
        const r = segs.map((s, j) =>
          j % 2 === 1 ? <strong key={j} style={{ color: '#e2e8f0', fontWeight: 700 }}>{s}</strong> : s
        );
        if (line.startsWith('•') || line.startsWith('-')) {
          return (
            <div key={i} style={{ display: 'flex', gap: '7px', marginBottom: '4px', paddingLeft: '4px' }}>
              <span style={{ color: '#1d9e75', flexShrink: 0, marginTop: '1px' }}>›</span>
              <span>{r}</span>
            </div>
          );
        }
        if (/^\s{2}|^\`/.test(line)) {
          return (
            <div key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#6edcb8',
              background: 'rgba(29,158,117,0.09)', padding: '2px 8px',
              borderRadius: '4px', marginBottom: '4px', marginLeft: '8px',
            }}>{r}</div>
          );
        }
        return <div key={i} style={{ marginBottom: line === '' ? '10px' : '1px' }}>{r}</div>;
      })}
    </div>
  );
}

// ─── Glowing ring around the target (pointer-events:none — fully non-blocking) ─
function Ring({ selector }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!selector) { setRect(null); return; }
    const el = document.querySelector(selector);
    if (!el) { setRect(null); return; }

    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, w: r.width, h: r.height });
    };
    update();
    el.scrollIntoView?.({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    const obs = new ResizeObserver(update);
    obs.observe(document.documentElement);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [selector]);

  if (!rect) return null;

  const P = 10;
  return (
    <div style={{
      position: 'fixed',
      top:    rect.top  - P,
      left:   rect.left - P,
      width:  rect.w + P * 2,
      height: rect.h + P * 2,
      borderRadius: '12px',
      border: '2px solid #1d9e75',
      boxShadow: '0 0 0 4px rgba(29,158,117,0.18), 0 0 24px rgba(29,158,117,0.45)',
      pointerEvents: 'none',
      zIndex: 9998,
      animation: 'fp-ring 2s ease-in-out infinite',
    }}>
      {/* Corner brackets */}
      {[
        { top: -4,  left: -4,  borderTop: '3px solid #1d9e75', borderLeft:  '3px solid #1d9e75' },
        { top: -4,  right: -4, borderTop: '3px solid #1d9e75', borderRight: '3px solid #1d9e75' },
        { bottom: -4, left: -4,  borderBottom: '3px solid #1d9e75', borderLeft:  '3px solid #1d9e75' },
        { bottom: -4, right: -4, borderBottom: '3px solid #1d9e75', borderRight: '3px solid #1d9e75' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 14, height: 14, borderRadius: 2, ...s }} />
      ))}
    </div>
  );
}

// ─── Bouncing arrow indicator on the card ────────────────────────────────────
function Arrow({ dir }) {
  if (!dir) return null;
  const map = {
    up:    { ch: '▲', s: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', pb: '6px' } },
    down:  { ch: '▼', s: { top:    '100%', left: '50%', transform: 'translateX(-50%)', pt: '6px' } },
    left:  { ch: '◀', s: { right:  '100%', top:  '50%', transform: 'translateY(-50%)', pr: '6px' } },
    right: { ch: '▶', s: { left:   '100%', top:  '50%', transform: 'translateY(-50%)', pl: '6px' } },
  };
  const a = map[dir];
  if (!a) return null;
  return (
    <span style={{
      position: 'absolute',
      fontSize: 16,
      color: 'rgba(29,158,117,0.95)',
      filter: 'drop-shadow(0 0 6px rgba(29,158,117,0.7))',
      animation: `fp-bounce-${dir} 0.7s ease-in-out infinite alternate`,
      lineHeight: 1,
      padding: a.s.pb ? `0 0 ${a.s.pb} 0` : a.s.pt ? `${a.s.pt} 0 0 0` : a.s.pr ? `0 ${a.s.pr} 0 0` : `0 0 0 ${a.s.pl}`,
      ...a.s,
    }}>{a.ch}</span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TutorialOverlay({ onDismiss, onNavigate }) {
  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(false);
  const [pos,     setPos]     = useState({ centered: true });
  const cardRef = useRef(null);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;

  const { out: twOut, done: twDone } = useTypewriter(
    current.title, 45, !!(current.typewriter && step === 0 && visible)
  );

  // ── Show after short delay (DOM ready) ──
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  // ── Navigate view + scroll target + recalculate card position ──
  useLayoutEffect(() => {
    if (!visible) return;
    if (current.navigate && onNavigate) onNavigate(current.navigate);

    // Give React a tick to render the new view before measuring
    const t = setTimeout(() => {
      if (current.target && current.scrollTo !== false) {
        const el = document.querySelector(current.target);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      setPos(calcPosition(current.target));
    }, 120);
    return () => clearTimeout(t);
  }, [step, visible]);

  // ── Recompute position on resize / scroll ──
  useEffect(() => {
    if (!visible) return;
    const update = () => setPos(calcPosition(current.target));
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step, visible]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') advance();
      if (e.key === 'ArrowLeft')  retreat();
      if (e.key === 'Escape')     dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, isLast]);

  const advance = useCallback(() => {
    if (isLast) dismiss();
    else setStep(s => s + 1);
  }, [isLast]);

  const retreat = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    setTimeout(() => onDismiss?.(), 220);
  }, [onDismiss]);

  if (!visible) return null;

  // ── Card position styles ──
  const cardStyle = pos.centered
    ? {
        position: 'fixed',
        top: '54%', left: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.4s cubic-bezier(0.4,0,0.2,1), left 0.4s cubic-bezier(0.4,0,0.2,1)',
      }
    : {
        position: 'fixed',
        top:  `${pos.top}px`,
        left: `${pos.left}px`,
        transform: 'none',
        transition: 'top 0.4s cubic-bezier(0.4,0,0.2,1), left 0.4s cubic-bezier(0.4,0,0.2,1)',
      };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* ── Subtle non-blocking dim film ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.38)',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
        pointerEvents: 'none',   /* ← lets ALL page clicks pass through */
        zIndex: 9996,
      }} />

      {/* ── Glowing ring around the targeted element ─────────────────────── */}
      {current.target && <Ring selector={current.target} />}

      {/* ── Tutorial card ────────────────────────────────────────────────── */}
      <div
        ref={cardRef}
        style={{
          ...cardStyle,
          width: CARD_W,
          maxWidth: 'calc(100vw - 24px)',
          background: 'linear-gradient(155deg, #0d1520 0%, #111c2a 55%, #0e1824 100%)',
          border: '1px solid rgba(29,158,117,0.38)',
          borderRadius: '18px',
          boxShadow: `
            0 28px 72px rgba(0,0,0,0.85),
            0 0 0 1px rgba(29,158,117,0.07),
            inset 0 1px 0 rgba(255,255,255,0.035)
          `,
          zIndex: 9999,
          pointerEvents: 'all',  /* card itself is fully interactive */
          overflow: 'visible',
        }}
      >
        {/* Arrow pointing at target */}
        <Arrow dir={pos.arrowDir} />

        {/* ── Progress bar ── */}
        <div style={{ height: 3, borderRadius: '18px 18px 0 0', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #1d9e75, #0d9488)',
            boxShadow: '0 0 10px rgba(29,158,117,0.55)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>

        {/* ── Header ── */}
        <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'flex-start', gap: '13px' }}>
          {/* Icon orb */}
          <div style={{
            width: 42, height: 42, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(29,158,117,0.18), rgba(13,148,136,0.08))',
            border: '1px solid rgba(29,158,117,0.28)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 21,
            boxShadow: '0 0 14px rgba(29,158,117,0.12)',
          }}>
            {current.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#1d9e75',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span>Step {step + 1} / {STEPS.length}</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span style={{ color: 'rgba(29,158,117,0.55)', fontWeight: 400 }}>FreightPulse Tour</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#edf2f7', lineHeight: 1.3, minHeight: 20 }}>
              {current.typewriter ? (
                <>
                  {twOut}
                  {!twDone && (
                    <span style={{
                      display: 'inline-block', width: 2, height: '1em',
                      background: '#1d9e75', marginLeft: 2,
                      verticalAlign: 'text-bottom',
                      animation: 'fp-blink 0.65s ease-in-out infinite',
                    }} />
                  )}
                </>
              ) : current.title}
            </h2>
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            title="Skip tour (Esc)"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              fontSize: 13, width: 26, height: 26,
              borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, lineHeight: 1, transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >✕</button>
        </div>

        {/* Divider */}
        <div style={{ margin: '13px 22px 0', height: 1, background: 'rgba(255,255,255,0.045)' }} />

        {/* ── Body ── */}
        <div style={{
          padding: '13px 22px 4px',
          fontSize: 12.5, color: '#8a9ab8',
          maxHeight: 210, overflowY: 'auto',
        }}>
          <Md text={current.body} />

          {/* Hint */}
          {current.hint && (
            <div style={{
              marginTop: 12,
              padding: '9px 13px',
              background: 'linear-gradient(135deg, rgba(29,158,117,0.09), rgba(13,148,136,0.05))',
              border: '1px solid rgba(29,158,117,0.2)',
              borderRadius: 9,
              fontSize: 11.5, color: '#5eead4',
              display: 'flex', alignItems: 'flex-start', gap: 7,
            }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
              <span>{current.hint}</span>
            </div>
          )}
        </div>

        {/* ── Step dots ── */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 5, padding: '12px 22px 0', flexWrap: 'wrap',
        }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={`Step ${i + 1}`}
              style={{
                width: i === step ? 20 : 6, height: 6,
                borderRadius: 3, border: 'none',
                background: i === step
                  ? 'linear-gradient(90deg,#1d9e75,#0d9488)'
                  : i < step ? 'rgba(29,158,117,0.38)' : 'rgba(255,255,255,0.09)',
                cursor: 'pointer', padding: 0,
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: i === step ? '0 0 7px rgba(29,158,117,0.5)' : 'none',
              }}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 22px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          {/* Skip + keyboard hint */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={dismiss}
              style={{
                fontSize: 11, color: 'rgba(255,255,255,0.25)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, fontFamily: 'inherit', textAlign: 'left',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >
              Skip tour
            </button>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {['←', '→'].map(k => (
                <kbd key={k} style={{
                  padding: '1px 5px', borderRadius: 4, fontSize: 9,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.22)',
                }}>{k}</kbd>
              ))}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginLeft: 2 }}>navigate</span>
            </div>
          </div>

          {/* Prev / Next */}
          <div style={{ display: 'flex', gap: 7 }}>
            {!isFirst && (
              <button
                onClick={retreat}
                style={{
                  fontSize: 12.5, fontWeight: 500,
                  padding: '8px 16px', borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#8a9ab8', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#8a9ab8'; }}
              >← Back</button>
            )}
            <button
              onClick={advance}
              style={{
                fontSize: 13, fontWeight: 700,
                padding: '8px 22px', borderRadius: 9,
                border: 'none',
                background: isLast
                  ? 'linear-gradient(135deg,#1d9e75,#059669)'
                  : 'linear-gradient(135deg,#1d9e75,#0f7d5c)',
                color: '#fff', cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 0 18px rgba(29,158,117,0.38)',
                transition: 'all 0.18s ease',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(29,158,117,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(29,158,117,0.38)'; e.currentTarget.style.transform = 'none'; }}
            >
              {isLast ? '🚀 Start exploring' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes fp-ring {
          0%, 100% { box-shadow: 0 0 0 4px rgba(29,158,117,0.18), 0 0 24px rgba(29,158,117,0.45); }
          50%       { box-shadow: 0 0 0 8px rgba(29,158,117,0.10), 0 0 36px rgba(29,158,117,0.6);  }
        }
        @keyframes fp-blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        @keyframes fp-bounce-up    { from { transform: translateX(-50%) translateY(0);   } to { transform: translateX(-50%) translateY(-7px); } }
        @keyframes fp-bounce-down  { from { transform: translateX(-50%) translateY(0);   } to { transform: translateX(-50%) translateY( 7px); } }
        @keyframes fp-bounce-left  { from { transform: translateY(-50%) translateX(0);   } to { transform: translateY(-50%) translateX(-7px); } }
        @keyframes fp-bounce-right { from { transform: translateY(-50%) translateX(0);   } to { transform: translateY(-50%) translateX( 7px); } }
      `}</style>
    </>
  );
}

/** Returns true if the tutorial should be shown on first visit */
export function shouldShowTutorial() {
  return !localStorage.getItem(STORAGE_KEY);
}

/** Manually re-trigger the tutorial (called from the Help button) */
export function resetTutorial() {
  localStorage.removeItem(STORAGE_KEY);
}

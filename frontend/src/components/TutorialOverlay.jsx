/**
 * TutorialOverlay — Interactive onboarding tour.
 *
 * Features:
 *   • Typewriter "Welcome to FreightPulse…" on first step
 *   • SVG spotlight cutout on targeted elements
 *   • Animated tooltip arrows pointing at the target
 *   • 16 steps covering every pipeline stage
 *   • Keyboard navigation (← → Esc)
 *   • Animated progress bar & step dots
 *   • localStorage persistence (one-time show)
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Tour Steps ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to FreightPulse',
    typewriterTitle: true,
    body: `FreightPulse is a **real-time freight disruption intelligence platform**.

It monitors global shipping routes, detects disruptions — strikes, severe weather, port congestion, AIS anomalies — and automatically runs a **10-stage AI pipeline** to recommend and act on the best response.

This guided tour will walk you through every feature.`,
    target: null,
    position: 'center',
    icon: '🚢',
    hint: 'Use arrow keys ← → or click Next to navigate.',
  },
  {
    id: 'topbar',
    title: 'Top Navigation',
    body: `The top bar gives you at-a-glance system health:

• **FreightPulse logo** — click to refresh
• **Dashboard / Engine tabs** — switch between the two main views
• **LIVE indicator** — pulses green when polling is active
• **Last polled** — shows how fresh the data is
• **? Help** — reopens this tour anytime`,
    target: 'header',
    position: 'bottom',
    icon: '🧭',
    arrowDir: 'up',
  },
  {
    id: 'nav-tabs',
    title: 'Dashboard & Engine Tabs',
    body: `**Dashboard** — your freight command centre. See your shipments on a live map, fleet metrics, and the signal feed.

**Engine** — the AI pipeline visualiser. Watch every stage of disruption detection and response run in real time.

Click each tab to switch views instantly.`,
    target: '#nav-tab-dashboard',
    position: 'bottom',
    icon: '📌',
    arrowDir: 'up',
  },
  {
    id: 'map',
    title: '🗺 Live Shipment Map',
    body: `The world map plots every shipment as an **origin → destination route**:

• 🟢 Green circle = origin port
• 🔴 Red / orange circle = destination (coloured by risk score)
• Dashed arc = shipping route

Hover a marker for shipment details. The map auto-fits when you load data.`,
    target: null,
    position: 'center',
    icon: '🌍',
    hint: 'Upload a CSV to see your own routes appear on the map.',
  },
  {
    id: 'csv-upload',
    title: '📁 Upload Shipment Data',
    body: `Upload a **CSV file** to load your shipments into the platform.

Supported columns (flexible naming):
  **id · origin · destination · vessel · eta · cargoValue**

Drag-and-drop or click the upload zone. Once loaded, shipments appear on the map, in the table, and in fleet metrics.`,
    target: null,
    position: 'center',
    icon: '📤',
    hint: 'Try it: drag a .csv file onto the upload zone, or click to browse.',
  },
  {
    id: 'fleet-summary',
    title: '📊 Fleet Summary',
    body: `Below the map, the Fleet Summary card shows key operational metrics:

• **Total Shipments** — all active routes
• **At Risk** — shipments flagged by the detection engine
• **Critical Alerts** — highest severity events right now
• **Cost Exposure** — estimated financial impact of delays

These update automatically as the pipeline processes new disruptions.`,
    target: null,
    position: 'center',
    icon: '📈',
  },
  {
    id: 'engine-intro',
    title: '⚡ The Engine Tab',
    body: `Switch to the **Engine tab** to see the AI pipeline visualiser.

When a disruption is detected — either automatically by the backend or via the Simulate button — **10 pipeline stages** fire in sequence, each animating from idle → active → complete.

Every stage shows real data: affected shipments, ML predictions, scoring, alternative routes, and LLM reasoning.`,
    target: '#nav-tab-engine',
    position: 'bottom',
    icon: '⚡',
    arrowDir: 'up',
  },
  {
    id: 'simulate-btn',
    title: '🎮 Simulate a Disruption',
    body: `You don't need Docker or live Kafka to see the pipeline run.

Click **⚡ Simulate Disruption** to inject a realistic mock event:

1. Choose a **disruption type** — Strike, Maritime Attack, Port Congestion, Weather, or Closure
2. Choose an **affected port** — Rotterdam, Hamburg, Singapore…
3. Click Simulate — all 10 stages run live in front of you!`,
    target: '#btn-simulate-disruption',
    position: 'top',
    icon: '🚨',
    arrowDir: 'down',
    hint: 'The backend automatically fires a congestion spike on startup too.',
  },
  {
    id: 'stage-ingestion',
    title: 'Stage 1 — Data Ingestion 📡',
    body: `The pipeline starts with **four data sources** feeding in simultaneously:

• 📰 **News** (GDELT) — geopolitical events, strikes, closures
• 🌊 **Weather** — wind speed & wave height from OpenWeatherMap
• 🛳 **AIS** — vessel position & route deviation data
• ⚓ **Port Congestion** — wait times at major ports

All events are published to Kafka topics for downstream processing.`,
    target: null,
    position: 'center',
    icon: '📡',
  },
  {
    id: 'stage-kafka',
    title: 'Stage 2 — Kafka Streaming ⚡',
    body: `All ingestion events flow through **Redpanda** (Kafka-compatible) in real time.

Six topics are active:
  ingestion.news · ingestion.weather · ingestion.ais
  ingestion.port-congestion · disruption.detected · engine.stage-updates

The WebSocket connection on the right side of the UI subscribes to \`engine.stage-updates\` so the frontend updates in real time.`,
    target: null,
    position: 'center',
    icon: '⚡',
  },
  {
    id: 'stage-detection',
    title: 'Stage 4 — Disruption Detection 🚨',
    body: `The detection engine classifies every ingestion event:

• **News** — keyword match (strike, houthi, blockade…) + port location
• **Weather** — wind > 55 km/h OR waves > 4m
• **Port Congestion** — avg wait > 24 hours
• **AIS** — vessel more than 30nm off expected route

When a disruption is confirmed, it's published to \`disruption.detected\` and written to Neo4j, then the decision pipeline kicks off.`,
    target: null,
    position: 'center',
    icon: '🚨',
  },
  {
    id: 'stage-graph',
    title: 'Stage 5 — Graph Query 🕸',
    body: `FreightPulse uses **Neo4j** to model the freight network as a graph:

\`(Shipment) → (Vessel) → (Route) → (Port) → (DisruptionEvent)\`

A Cypher traversal finds every shipment affected by the disruption in milliseconds, even across complex multi-hop routes.

If Neo4j isn't connected, mock shipments are returned so the pipeline still completes end-to-end.`,
    target: null,
    position: 'center',
    icon: '🕸',
  },
  {
    id: 'stage-ml',
    title: 'Stage 6 — ML Prediction 🧪',
    body: `Each affected shipment goes through the **ML predictor**:

• **Predicted delay hours** — based on disruption severity, port history, weather
• **Confidence score** — how certain the model is
• **Escalation probability** — likelihood of the situation worsening

Currently using \`mock-heuristic-v1\`. Swap \`backend/ml/mock_predictor.py\` with a real trained model to go live.`,
    target: null,
    position: 'center',
    icon: '🧪',
  },
  {
    id: 'stage-scoring',
    title: 'Stage 7 — Scoring & Ranking 📊',
    body: `The scorer assigns each shipment a **weighted risk score** combining:

• Financial exposure (cargo value × daily demurrage)
• Customer SLA strictness
• Shipment priority (critical / high / medium)
• Predicted delay hours
• Historical port reliability

Shipments are **ranked highest risk first** so the LLM and calling agent focus on what matters most.`,
    target: null,
    position: 'center',
    icon: '📊',
  },
  {
    id: 'stage-llm',
    title: 'Stage 9 — LLM Reasoning 🤖',
    body: `The top-ranked shipments and alternative routes are passed to **Claude** for final decision-making.

Claude outputs:
• **Decision** — reroute / hold / expedite / split-shipment
• **Rationale** — 2-3 sentence justification
• **Call Script** — what the calling agent reads to the forwarder

Watch the token stream appear character-by-character in the LLM Reasoning card! In demo mode, a mock streamer runs so you see the animation without an API key.`,
    target: null,
    position: 'center',
    icon: '🤖',
    hint: 'Set ANTHROPIC_API_KEY in .env to enable real Claude reasoning.',
  },
  {
    id: 'stage-calling',
    title: 'Stage 10 — Calling Agent 📞',
    body: `The final stage initiates an **outbound phone call** via Twilio to the freight forwarder.

The call script generated by Claude is served as TwiML at \`/twiml/brief/{disruption_id}\`, so Twilio reads it aloud to the forwarder automatically.

In demo mode (no Twilio credentials), the stage completes with status "skipped" and logs the script so you can review it.`,
    target: null,
    position: 'center',
    icon: '📞',
    hint: 'Set TWILIO_* credentials in .env to enable real phone calls.',
  },
  {
    id: 'done',
    title: "🎉 You're all set!",
    body: `FreightPulse is ready for you to explore.

**Quick start:**
1. Click **⚡ Engine** tab and hit **Simulate Disruption**
2. Watch all 10 stages run live
3. Upload a shipment CSV on the Dashboard to see your routes

**To enable real features:**
• \`ANTHROPIC_API_KEY\` → real LLM reasoning
• \`TWILIO_*\` credentials → real phone calls
• \`docker-compose up\` → full Kafka + Neo4j + TimescaleDB stack`,
    target: null,
    position: 'center',
    icon: '🚀',
  },
];

const STORAGE_KEY = 'fp_tutorial_v2_dismissed';

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 38, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, active]);
  return { displayed, done };
}

// ─── Spotlight cutout ─────────────────────────────────────────────────────────
function Spotlight({ targetSelector }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!targetSelector) { setRect(null); return; }
    const el = document.querySelector(targetSelector);
    if (!el) { setRect(null); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    window.addEventListener('scroll', update, true);
    return () => { obs.disconnect(); window.removeEventListener('scroll', update, true); };
  }, [targetSelector]);

  if (!rect) return null;

  const PAD = 10;
  const rx = rect.left - PAD;
  const ry = rect.top  - PAD;
  const rw = rect.width  + PAD * 2;
  const rh = rect.height + PAD * 2;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="fp-spotlight">
            <rect width="100%" height="100%" fill="white" />
            <rect x={rx} y={ry} width={rw} height={rh} rx="10" fill="black" />
          </mask>
        </defs>
        {/* Dark overlay with hole */}
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#fp-spotlight)" />
        {/* Animated glow ring */}
        <rect
          x={rx} y={ry} width={rw} height={rh} rx="10"
          fill="none"
          stroke="rgba(29,158,117,0.9)"
          strokeWidth="2.5"
          style={{ filter: 'drop-shadow(0 0 8px rgba(29,158,117,0.7))' }}
        />
        {/* Corner accents */}
        {[
          [rx, ry, 1, 1], [rx + rw, ry, -1, 1],
          [rx, ry + rh, 1, -1], [rx + rw, ry + rh, -1, -1],
        ].map(([cx, cy, dx, dy], i) => (
          <g key={i}>
            <line x1={cx} y1={cy} x2={cx + dx * 14} y2={cy} stroke="#1d9e75" strokeWidth="3" strokeLinecap="round" />
            <line x1={cx} y1={cy} x2={cx} y2={cy + dy * 14} stroke="#1d9e75" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Arrow pointer ────────────────────────────────────────────────────────────
function Arrow({ direction }) {
  if (!direction) return null;
  const arrows = {
    up:    { char: '▲', style: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' } },
    down:  { char: '▼', style: { top: '100%',    left: '50%', transform: 'translateX(-50%)', marginTop: '6px' } },
    left:  { char: '◀', style: { right: '100%',  top: '50%',  transform: 'translateY(-50%)', marginRight: '6px' } },
    right: { char: '▶', style: { left: '100%',   top: '50%',  transform: 'translateY(-50%)', marginLeft: '6px' } },
  };
  const a = arrows[direction];
  if (!a) return null;
  return (
    <span
      style={{
        position: 'absolute',
        fontSize: '18px',
        color: 'rgba(29,158,117,0.9)',
        filter: 'drop-shadow(0 0 6px rgba(29,158,117,0.6))',
        animation: `fp-arrow-${direction} 0.9s ease-in-out infinite alternate`,
        ...a.style,
      }}
    >
      {a.char}
    </span>
  );
}

// ─── Minimal markdown renderer ────────────────────────────────────────────────
function Markdown({ text }) {
  return (
    <div style={{ lineHeight: 1.7 }}>
      {text.split('\n').map((line, i) => {
        const parts = line.split(/\*\*([^*]+)\*\*/g);
        const rendered = parts.map((p, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ color: '#e2e8f0', fontWeight: 700 }}>{p}</strong>
            : p
        );
        const isCode = line.startsWith('`') || /^\s{2}/.test(line);
        if (line.startsWith('•') || line.startsWith('-')) {
          return (
            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px', marginLeft: '4px' }}>
              <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>›</span>
              <span>{rendered}</span>
            </div>
          );
        }
        if (isCode) {
          return (
            <div key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#94d4be',
              background: 'rgba(29,158,117,0.08)', padding: '2px 6px', borderRadius: '4px',
              marginBottom: '3px', marginLeft: '8px',
            }}>
              {rendered}
            </div>
          );
        }
        return (
          <div key={i} style={{ marginBottom: line === '' ? '10px' : '0' }}>
            {rendered}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TutorialOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef(null);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;

  const { displayed: twTitle, done: twDone } = useTypewriter(
    current.title,
    42,
    current.typewriterTitle && step === 0 && visible
  );

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft')  handlePrev();
      if (e.key === 'Escape')     handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, isLast]);

  // Animate card when step changes
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.animation = 'none';
      void cardRef.current.offsetWidth; // reflow
      cardRef.current.style.animation = 'fp-card-enter 0.3s cubic-bezier(0.34,1.4,0.64,1) forwards';
    }
  }, [step]);

  const handleNext = useCallback(() => {
    if (isLast) handleDismiss();
    else setStep((s) => s + 1);
  }, [isLast]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    setTimeout(() => onDismiss?.(), 250);
  }, [onDismiss]);

  if (!visible) return null;

  // Card positioning
  const posStyle = (() => {
    if (current.position === 'center') return {
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    };
    if (current.position === 'bottom') return {
      top: '72px', left: '50%', transform: 'translateX(-50%)',
    };
    if (current.position === 'top') return {
      bottom: '140px', left: '50%', transform: 'translateX(-50%)',
    };
    return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  })();

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Spotlight on target element */}
      {current.target && <Spotlight targetSelector={current.target} />}

      {/* Backdrop (no target) */}
      {!current.target && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9997,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }} />
      )}

      {/* Tutorial card */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          zIndex: 9999,
          ...posStyle,
          width: '500px',
          maxWidth: 'calc(100vw - 24px)',
          background: 'linear-gradient(150deg, #0f1923 0%, #141f2e 50%, #111c28 100%)',
          border: '1px solid rgba(29,158,117,0.35)',
          borderRadius: '18px',
          boxShadow: `
            0 32px 80px rgba(0,0,0,0.8),
            0 0 0 1px rgba(29,158,117,0.08),
            inset 0 1px 0 rgba(255,255,255,0.04)
          `,
          overflow: 'visible',
          animation: 'fp-card-enter 0.3s cubic-bezier(0.34,1.4,0.64,1) forwards',
        }}
      >
        {/* Arrow pointer */}
        <Arrow direction={current.arrowDir} />

        {/* Progress bar */}
        <div style={{ height: '3px', borderRadius: '18px 18px 0 0', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #1d9e75, #0d9488, #059669)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 0 8px rgba(29,158,117,0.6)',
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Icon orb */}
          <div style={{
            width: '44px', height: '44px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(29,158,117,0.2), rgba(13,148,136,0.1))',
            border: '1px solid rgba(29,158,117,0.3)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 0 16px rgba(29,158,117,0.15)',
          }}>
            {current.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '10px', fontWeight: 700,
              color: '#1d9e75',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              marginBottom: '5px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>Step {step + 1} of {STEPS.length}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: 'rgba(29,158,117,0.6)', fontWeight: 400 }}>FreightPulse Tour</span>
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '17px', fontWeight: 700,
              color: '#f0f4f8',
              lineHeight: 1.25,
              minHeight: '21px',
            }}>
              {current.typewriterTitle ? (
                <>
                  {twTitle}
                  {!twDone && (
                    <span style={{
                      display: 'inline-block', width: '2px', height: '1em',
                      background: '#1d9e75', marginLeft: '2px', verticalAlign: 'text-bottom',
                      animation: 'fp-blink 0.7s ease-in-out infinite',
                    }} />
                  )}
                </>
              ) : current.title}
            </h2>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            title="Skip tutorial (Esc)"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: '14px',
              width: '28px', height: '28px',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s',
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div style={{ margin: '14px 24px 0', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {/* Body */}
        <div style={{
          padding: '14px 24px 4px',
          fontSize: '13px', color: '#94a3b8',
          maxHeight: '220px', overflowY: 'auto',
        }}>
          <Markdown text={current.body} />

          {/* Hint box */}
          {current.hint && (
            <div style={{
              marginTop: '14px',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(29,158,117,0.1), rgba(13,148,136,0.06))',
              border: '1px solid rgba(29,158,117,0.22)',
              borderRadius: '10px',
              fontSize: '12px', color: '#5eead4',
              display: 'flex', alignItems: 'flex-start', gap: '8px',
            }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>💡</span>
              <span>{current.hint}</span>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '5px',
          padding: '14px 24px 0',
          flexWrap: 'wrap',
        }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={`Go to step ${i + 1}`}
              style={{
                width: i === step ? '22px' : '6px',
                height: '6px',
                borderRadius: '3px',
                border: 'none',
                background: i === step
                  ? 'linear-gradient(90deg, #1d9e75, #0d9488)'
                  : i < step ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: i === step ? '0 0 8px rgba(29,158,117,0.5)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}>
          <button
            onClick={handleDismiss}
            style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.3)',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 0',
              fontFamily: 'var(--font-sans)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
          >
            Skip tour
          </button>

          {/* Keyboard hint */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '10px', color: 'rgba(255,255,255,0.2)',
          }}>
            <kbd style={{
              padding: '1px 5px', borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              fontFamily: 'var(--font-mono)', fontSize: '9px',
            }}>←</kbd>
            <kbd style={{
              padding: '1px 5px', borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              fontFamily: 'var(--font-mono)', fontSize: '9px',
            }}>→</kbd>
            <span style={{ marginLeft: '2px' }}>navigate</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirst && (
              <button
                onClick={handlePrev}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  padding: '9px 18px', borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#94a3b8', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#f0f4f8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                fontSize: '13px', fontWeight: 700,
                padding: '9px 24px', borderRadius: '9px',
                border: 'none',
                background: isLast
                  ? 'linear-gradient(135deg, #1d9e75, #0d9488, #059669)'
                  : 'linear-gradient(135deg, #1d9e75, #0f7d5c)',
                color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 0 20px rgba(29,158,117,0.4)',
                transition: 'all 0.2s ease',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(29,158,117,0.65)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(29,158,117,0.4)'; e.currentTarget.style.transform = 'none'; }}
            >
              {isLast ? '🚀 Start exploring' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fp-card-enter {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) scale(0.93); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes fp-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes fp-arrow-up    { from { transform: translateX(-50%) translateY(0);   } to { transform: translateX(-50%) translateY(-6px); } }
        @keyframes fp-arrow-down  { from { transform: translateX(-50%) translateY(0);   } to { transform: translateX(-50%) translateY(6px);  } }
        @keyframes fp-arrow-left  { from { transform: translateY(-50%) translateX(0);   } to { transform: translateY(-50%) translateX(-6px); } }
        @keyframes fp-arrow-right { from { transform: translateY(-50%) translateX(0);   } to { transform: translateY(-50%) translateX(6px);  } }
      `}</style>
    </>
  );
}

/** Returns true if the tutorial should be shown (not yet dismissed) */
export function shouldShowTutorial() {
  return !localStorage.getItem(STORAGE_KEY);
}

/** Manually re-trigger the tutorial (e.g. from a Help button) */
export function resetTutorial() {
  localStorage.removeItem(STORAGE_KEY);
}

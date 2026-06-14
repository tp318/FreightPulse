/**
 * EnginePage — Live pipeline visualization page.
 *
 * 10 stage cards in vertical layout, each connected by a status-colored line.
 * WebSocket drives card state transitions in real time.
 * "Simulate Disruption" button injects a fake event into the ingestion pipeline.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useEngineWebSocket, simulateDisruption } from '../api/engineClient.js';

import PipelineCard from '../components/engine/PipelineCard.jsx';
import IngestionCard from '../components/engine/IngestionCard.jsx';
import KafkaCard from '../components/engine/KafkaCard.jsx';
import StorageCard from '../components/engine/StorageCard.jsx';
import DisruptionCard from '../components/engine/DisruptionCard.jsx';
import GraphQueryCard from '../components/engine/GraphQueryCard.jsx';
import MLPredictionCard from '../components/engine/MLPredictionCard.jsx';
import ScoringCard from '../components/engine/ScoringCard.jsx';
import AltRoutesCard from '../components/engine/AltRoutesCard.jsx';
import LLMReasoningCard from '../components/engine/LLMReasoningCard.jsx';
import CallingAgentCard from '../components/engine/CallingAgentCard.jsx';

const STAGE_DEFS = [
  { id: 'ingestion',     icon: '📡', title: 'Data Ingestion',       subtitle: 'News · Weather · AIS · Port Congestion' },
  { id: 'kafka',         icon: '⚡', title: 'Kafka Streaming',       subtitle: 'Redpanda — 6 topics active' },
  { id: 'storage',       icon: '🗄', title: 'Storage Layer',         subtitle: 'Neo4j Graph + TimescaleDB' },
  { id: 'detection',     icon: '🚨', title: 'Disruption Detected',   subtitle: 'Auto-classified by rules engine' },
  { id: 'graph-query',   icon: '🕸', title: 'Graph Query (Neo4j)',   subtitle: 'Traversing affected shipments' },
  { id: 'ml-prediction', icon: '🧪', title: 'ML Prediction',         subtitle: 'MOCK MODEL — swap for real' },
  { id: 'scoring',       icon: '📊', title: 'Scoring & Ranking',     subtitle: 'Weighted risk score per shipment' },
  { id: 'alt-routes',    icon: '🗺', title: 'Alternative Routes',    subtitle: 'Neo4j shortest-path query' },
  { id: 'llm-reasoning', icon: '🤖', title: 'LLM Reasoning',         subtitle: 'Claude — decision + call script' },
  { id: 'calling-agent', icon: '📞', title: 'Calling Agent',         subtitle: 'Twilio outbound voice call' },
];

const DISRUPTION_TYPES = [
  { value: 'strike',     label: '🪧 Strike' },
  { value: 'attack',     label: '💥 Maritime Attack' },
  { value: 'congestion', label: '⚓ Port Congestion' },
  { value: 'weather',    label: '🌊 Severe Weather' },
  { value: 'closure',    label: '🔒 Port Closure' },
];

const PORT_OPTIONS = [
  { value: 'NLRTM', label: 'Rotterdam (NLRTM)' },
  { value: 'DEHAM', label: 'Hamburg (DEHAM)' },
  { value: 'GBFXT', label: 'Felixstowe (GBFXT)' },
  { value: 'BEANR', label: 'Antwerp (BEANR)' },
  { value: 'SGSIN', label: 'Singapore (SGSIN)' },
];

const INITIAL_STAGES = () =>
  Object.fromEntries(STAGE_DEFS.map((s) => [s.id, { status: 'idle', data: null }]));

export default function EnginePage({ promptSimulate, onPromptClear }) {
  const [stages, setStages] = useState(INITIAL_STAGES);
  const [simType, setSimType] = useState('strike');
  const [simPort, setSimPort] = useState('NLRTM');
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [llmStream, setLlmStream] = useState({ chunk: '', accumulated: '' });
  const [isStreaming, setIsStreaming] = useState(false);
  const logRef = useRef([]);

  // Auto-scroll to the button if prompted
  useEffect(() => {
    if (promptSimulate) {
      document.getElementById('btn-simulate-disruption')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [promptSimulate]);

  // WebSocket message handler
  const handleWsMessage = useCallback((msg) => {
    const { stage, status, data } = msg;

    if (stage === 'connected') {
      setWsConnected(true);
      return;
    }

    if (stage === 'reset') {
      setStages(INITIAL_STAGES());
      setLlmStream({ chunk: '', accumulated: '' });
      setIsStreaming(false);
      logRef.current = [];
      return;
    }

    // LLM streaming special handling
    if (stage === 'llm-reasoning' && status === 'streaming') {
      setIsStreaming(true);
      setLlmStream({ chunk: data?.chunk || '', accumulated: data?.accumulated || '' });
      setStages((prev) => ({
        ...prev,
        'llm-reasoning': { status: 'active', data: prev['llm-reasoning']?.data || null },
      }));
      return;
    }

    if (stage === 'llm-reasoning' && status === 'complete') {
      setIsStreaming(false);
    }

    // Update stage state
    setStages((prev) => ({
      ...prev,
      [stage]: { status, data: data || null },
    }));
  }, []);

  useEngineWebSocket(handleWsMessage);

  // Simulate disruption
  const handleSimulate = useCallback(async () => {
    setSimLoading(true);
    setSimError(null);
    setStages(INITIAL_STAGES());
    setLlmStream({ chunk: '', accumulated: '' });
    setIsStreaming(false);

    try {
      const portLabel = PORT_OPTIONS.find((p) => p.value === simPort)?.label || simPort;
      const typeLabel = DISRUPTION_TYPES.find((t) => t.value === simType)?.label || simType;
      const description = `${portLabel}: ${typeLabel.replace(/^[^ ]+ /, '')} — simulated for FreightPulse demo`;
      await simulateDisruption({ type: simType, port_code: simPort, description });
    } catch (e) {
      setSimError(e.message || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  }, [simType, simPort]);

  const wsStatusColor = wsConnected ? 'var(--accent-green)' : '#666';

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--bg-base)',
        padding: '24px',
        display: 'flex',
        gap: '24px',
      }}
    >
      {/* ── LEFT COLUMN: Simulate controls + pipeline ── */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: '660px', margin: '0 auto' }}>

        {/* Simulate Disruption panel */}
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                ⚡ FreightPulse Engine
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Real-time disruption intelligence pipeline
              </p>
            </div>

            {/* WS connection status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: wsStatusColor,
                  animation: wsConnected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: wsStatusColor, fontFamily: 'var(--font-mono)' }}>
                {wsConnected ? 'PIPELINE LIVE' : 'CONNECTING…'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Disruption Type
              </label>
              <select
                id="sim-type"
                value={simType}
                onChange={(e) => setSimType(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {DISRUPTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Affected Port
              </label>
              <select
                id="sim-port"
                value={simPort}
                onChange={(e) => setSimPort(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {PORT_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              {promptSimulate && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '12px',
                  background: 'var(--accent-green)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  animation: 'fp-bounce-down 1s infinite alternate',
                  boxShadow: '0 4px 12px rgba(29,158,117,0.4)',
                  zIndex: 10,
                }}>
                  Click here to start!
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    border: '6px solid transparent',
                    borderTopColor: 'var(--accent-green)',
                  }} />
                </div>
              )}
              <button
                id="btn-simulate-disruption"
                onClick={() => {
                  if (onPromptClear) onPromptClear();
                  handleSimulate();
                }}
                disabled={simLoading}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: promptSimulate ? '2px solid #fff' : 'none',
                  background: simLoading ? 'var(--bg-elevated)' : 'var(--accent-green)',
                  color: simLoading ? 'var(--text-tertiary)' : '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: simLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: promptSimulate ? '0 0 0 4px rgba(29,158,117,0.4)' : (simLoading ? 'none' : '0 0 16px rgba(29,158,117,0.4)'),
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {simLoading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid var(--border-accent)',
                        borderTopColor: 'var(--text-secondary)',
                        borderRadius: '50%',
                        animation: 'spin-slow 0.8s linear infinite',
                      }}
                    />
                    Injecting…
                  </>
                ) : (
                  '⚡ Simulate Disruption'
                )}
              </button>
            </div>
          </div>

          {simError && (
            <div
              style={{
                marginTop: '10px',
                fontSize: '11px',
                color: 'var(--status-critical)',
                padding: '6px 10px',
                background: 'rgba(176,32,32,0.08)',
                borderRadius: '4px',
              }}
            >
              ⚠️ {simError} — make sure the backend is running on localhost:8000
            </div>
          )}
        </div>

        {/* ── Pipeline cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STAGE_DEFS.map((stage, i) => {
            const stageState = stages[stage.id] || { status: 'idle', data: null };
            const isLast = i === STAGE_DEFS.length - 1;

            return (
              /* id used by the tutorial overlay to spotlight each stage */
              <div key={stage.id} id={`pipeline-card-${stage.id}`}>
                <PipelineCard
                  status={stageState.status}
                  icon={stage.icon}
                  title={stage.title}
                  subtitle={stage.subtitle}
                  isLast={isLast}
                  error={stageState.data?.error}
                >
                  {/* Render stage-specific content */}
                  {stage.id === 'ingestion'     && <IngestionCard data={stageState.data} />}
                  {stage.id === 'kafka'         && <KafkaCard data={stageState.data} />}
                  {stage.id === 'storage'       && <StorageCard data={stageState.data} />}
                  {stage.id === 'detection'     && <DisruptionCard data={stageState.data} />}
                  {stage.id === 'graph-query'   && <GraphQueryCard data={stageState.data} />}
                  {stage.id === 'ml-prediction' && <MLPredictionCard data={stageState.data} />}
                  {stage.id === 'scoring'       && <ScoringCard data={stageState.data} />}
                  {stage.id === 'alt-routes'    && <AltRoutesCard data={stageState.data} />}
                  {stage.id === 'llm-reasoning' && (
                    <LLMReasoningCard
                      data={stageState.data}
                      streamChunk={llmStream.chunk}
                      isStreaming={isStreaming}
                    />
                  )}
                  {stage.id === 'calling-agent' && <CallingAgentCard data={stageState.data} />}
                </PipelineCard>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT COLUMN: Legend / info panel ── */}
      <div
        style={{
          width: '240px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'sticky',
          top: '0',
          height: 'fit-content',
        }}
      >
        {/* Legend */}
        <div
          style={{
            padding: '14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
            Stage States
          </div>
          {[
            { color: 'var(--border)',       label: 'Idle — awaiting pipeline' },
            { color: 'var(--accent-green)', label: 'Active — processing' },
            { color: 'var(--accent-green)', label: 'Complete — data available' },
            { color: 'var(--status-critical)', label: 'Error — check logs' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Architecture note */}
        <div
          style={{
            padding: '14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
            Architecture
          </div>
          {[
            ['⚡', 'Redpanda (Kafka)'],
            ['🕸', 'Neo4j Graph DB'],
            ['📈', 'TimescaleDB'],
            ['🤖', 'Claude claude-sonnet-4-5'],
            ['📞', 'Twilio Voice'],
            ['🔌', 'FastAPI + WebSocket'],
          ].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '14px' }}>{icon}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ML note */}
        <div
          style={{
            padding: '14px',
            background: 'rgba(184,138,26,0.06)',
            border: '1px solid rgba(184,138,26,0.25)',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--status-watch)', marginBottom: '6px' }}>
            🧪 ML Model Status
          </div>
          <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            Using <strong style={{ color: 'var(--status-watch)' }}>mock-heuristic-v1</strong>.
            Swap <code style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>backend/ml/mock_predictor.py</code> to deploy a real model.
          </p>
        </div>
      </div>
    </div>
  );
}

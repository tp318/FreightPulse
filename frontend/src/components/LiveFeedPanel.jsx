/** LiveFeedPanel — Scrollable real-time signal feed with source-colored badges and entry animations */
import { useEffect, useRef } from 'react';
import { formatRelativeTime } from '../api/client.js';

const SOURCE_CONFIG = {
  GDELT:      { label: 'GDELT',    color: 'var(--signal-gdelt)' },
  Weather:    { label: 'WEATHER',  color: 'var(--signal-weather)' },
  AIS:        { label: 'AIS',      color: 'var(--signal-ais)' },
  Congestion: { label: 'PORT',     color: 'var(--signal-congestion)' },
};

export default function LiveFeedPanel({ signals = [] }) {
  const scrollRef = useRef(null);
  const prevLenRef = useRef(signals.length);

  // Auto-scroll to top when new signals are prepended
  useEffect(() => {
    if (signals.length > prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevLenRef.current = signals.length;
  }, [signals]);

  return (
    <div
      className="flex flex-col"
      style={{
        height: 'calc(50vh - 80px)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent-green)',
            display: 'inline-block',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }}
        />
        <span
          className="text-xs font-medium"
          style={{
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Live Signal Feed
        </span>
      </div>

      {/* Signal list */}
      <div
        ref={scrollRef}
        className="flex flex-col overflow-auto flex-1"
        style={{ padding: '0' }}
      >
        {signals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center flex-1 gap-2"
            style={{ padding: '32px 16px' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Watching for signals…
            </p>
            <div
              style={{
                width: '100%',
                height: '2px',
                borderRadius: '1px',
                background: 'linear-gradient(90deg, transparent, var(--accent-green), transparent)',
                backgroundSize: '200% 100%',
                animation: 'scanLine 2s ease-in-out infinite',
              }}
            />
          </div>
        ) : (
          signals.map((sig, idx) => {
            const source = SOURCE_CONFIG[sig.source] || { label: sig.source, color: 'var(--text-tertiary)' };
            return (
              <div
                key={sig.id}
                className="flex flex-col gap-1 px-4 py-3"
                style={{
                  borderBottom: '1px solid var(--border)',
                  animation: idx === 0 ? 'signalEnter 0.4s ease-out' : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  {/* Source badge */}
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: `${source.color}22`,
                      color: source.color,
                      border: `1px solid ${source.color}44`,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {source.label}
                  </span>

                  {/* Simulated tag */}
                  {sig.simulated && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        color: 'var(--text-tertiary)',
                        border: '1px dashed var(--text-tertiary)',
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      SIM
                    </span>
                  )}

                  {/* Timestamp */}
                  <span
                    className="text-xs font-mono ml-auto"
                    style={{
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                    }}
                  >
                    {formatRelativeTime(sig.timestamp)}
                  </span>
                </div>

                {/* Signal title */}
                <p
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: '1.45',
                    margin: 0,
                  }}
                >
                  {sig.title}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

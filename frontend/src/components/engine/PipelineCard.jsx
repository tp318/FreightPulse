/**
 * PipelineCard — Reusable container for each Engine pipeline stage.
 *
 * States:
 *   idle     — greyed out, waiting for pipeline to start
 *   active   — pulsing green glow + spinner
 *   complete — green checkmark + children rendered
 *   error    — red border + error message
 */

const STATUS_STYLES = {
  idle: {
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    opacity: 0.55,
  },
  active: {
    border: '1px solid var(--accent-green)',
    background: 'var(--bg-surface)',
    opacity: 1,
    animation: 'pipeline-pulse 1.5s ease-in-out infinite',
  },
  complete: {
    border: '1px solid rgba(29,158,117,0.4)',
    background: 'var(--bg-surface)',
    opacity: 1,
  },
  error: {
    border: '1px solid rgba(176,32,32,0.6)',
    background: 'rgba(176,32,32,0.05)',
    opacity: 1,
  },
};

const CONNECTOR_COLORS = {
  idle:     'var(--border)',
  active:   'var(--accent-green)',
  complete: 'var(--accent-green)',
  error:    'var(--status-critical)',
};

export default function PipelineCard({
  status = 'idle',
  icon,
  title,
  subtitle,
  error,
  isLast = false,
  children,
}) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.idle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: '100%',
          borderRadius: '10px',
          padding: '14px 16px',
          transition: 'all 0.35s ease',
          animation: style.animation,
          ...style,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: children && status === 'complete' ? '12px' : '0' }}>
          {/* Icon / status indicator */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}>
            {status === 'active' ? (
              <span
                style={{
                  display: 'inline-block',
                  width: '18px',
                  height: '18px',
                  border: '2px solid var(--border-accent)',
                  borderTopColor: 'var(--accent-green)',
                  borderRadius: '50%',
                  animation: 'spin-slow 0.8s linear infinite',
                }}
              />
            ) : status === 'complete' ? (
              <span style={{ fontSize: '18px' }}>✅</span>
            ) : status === 'error' ? (
              <span style={{ fontSize: '18px' }}>❌</span>
            ) : (
              <span style={{ fontSize: '18px', opacity: 0.4 }}>{icon || '○'}</span>
            )}
          </div>

          {/* Title + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: status === 'idle' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--text-tertiary)',
                  marginTop: '1px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Status badge */}
          {status !== 'idle' && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: '4px',
                background:
                  status === 'complete' ? 'rgba(29,158,117,0.15)' :
                  status === 'active'   ? 'rgba(29,158,117,0.1)' :
                  status === 'error'    ? 'rgba(176,32,32,0.15)' : 'transparent',
                color:
                  status === 'complete' ? 'var(--accent-green)' :
                  status === 'active'   ? 'var(--accent-green)' :
                  status === 'error'    ? 'var(--status-critical)' : 'transparent',
                border:
                  status === 'complete' ? '1px solid rgba(29,158,117,0.3)' :
                  status === 'active'   ? '1px solid rgba(29,158,117,0.2)' :
                  status === 'error'    ? '1px solid rgba(176,32,32,0.3)' : 'none',
              }}
            >
              {status === 'active' ? 'RUNNING' : status.toUpperCase()}
            </span>
          )}
        </div>

        {/* Error message */}
        {status === 'error' && error && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--status-critical)',
              fontFamily: 'var(--font-mono)',
              padding: '6px 10px',
              background: 'rgba(176,32,32,0.08)',
              borderRadius: '4px',
            }}
          >
            Error: {error}
          </div>
        )}

        {/* Content (only shown when complete) */}
        {status === 'complete' && children && (
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '12px',
              animation: 'stage-enter 0.3s ease',
            }}
          >
            {children}
          </div>
        )}

        {/* Active shimmer skeleton (optional) */}
        {status === 'active' && (
          <div
            style={{
              marginTop: '8px',
              height: '4px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, var(--border) 25%, var(--border-accent) 50%, var(--border) 75%)',
              backgroundSize: '400px 100%',
              animation: 'shimmer 1.5s infinite linear',
            }}
          />
        )}
      </div>

      {/* Connector line to next card */}
      {!isLast && (
        <div
          style={{
            width: '2px',
            height: '16px',
            background: CONNECTOR_COLORS[status] || 'var(--border)',
            transition: 'background 0.4s ease',
            opacity: status === 'idle' ? 0.3 : 0.7,
          }}
        />
      )}
    </div>
  );
}

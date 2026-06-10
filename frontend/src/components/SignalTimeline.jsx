/** SignalTimeline — Vertical timeline showing how FreightPulse detected and matched a disruption */

const DOT_COLORS = {
  signal:  'var(--accent-green)',
  confirm: 'var(--accent-green)',
  match:   'var(--status-watch)',
  brief:   'var(--signal-weather)',
};

export default function SignalTimeline({ events = [] }) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        flex: 1,
        overflow: 'auto',
      }}
    >
      {/* Panel header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)', margin: 0 }}
        >
          FreightPulse Knew First
        </h3>
        <p
          className="text-xs"
          style={{ color: 'var(--text-tertiary)', margin: '2px 0 0' }}
        >
          vs. industry average
        </p>
      </div>

      {/* Timeline events */}
      <div className="flex flex-col px-4 py-4" style={{ gap: '0' }}>
        {events.map((evt, idx) => {
          const dotColor = DOT_COLORS[evt.type] || 'var(--text-tertiary)';
          const isLast = idx === events.length - 1;

          return (
            <div key={idx} className="flex gap-3" style={{ minHeight: '56px' }}>
              {/* Left: timestamp */}
              <div
                className="flex-shrink-0 text-right"
                style={{
                  width: '64px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  paddingTop: '3px',
                }}
              >
                {evt.time}
              </div>

              {/* Center: line + dot */}
              <div
                className="flex flex-col items-center flex-shrink-0"
                style={{ width: '20px' }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                    marginTop: '3px',
                    boxShadow: `0 0 6px ${dotColor}66`,
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flex: 1,
                      background: 'var(--border-accent)',
                      minHeight: '24px',
                    }}
                  />
                )}
              </div>

              {/* Right: label + detail */}
              <div className="flex flex-col pb-3" style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '14px' }}>{evt.icon}</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {evt.label}
                  </span>
                </div>
                <p
                  className="text-xs"
                  style={{
                    color: 'var(--text-secondary)',
                    margin: '2px 0 0',
                    lineHeight: '1.4',
                  }}
                >
                  {evt.detail}
                </p>
              </div>
            </div>
          );
        })}

        {/* Traditional operator comparison */}
        <div
          className="flex items-center gap-3 pt-3 mt-1"
          style={{
            borderTop: '1px solid var(--border-accent)',
          }}
        >
          <div
            style={{
              width: '64px',
              textAlign: 'right',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-tertiary)',
            }}
          >
            ⏳
          </div>
          <div style={{ width: '20px', textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--text-tertiary)',
              }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.4' }}>
            Traditional operator learns:{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>~36–72 hrs later</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

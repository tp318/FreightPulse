/** Ingestion card — live ticker of incoming items per source */
const SOURCE_COLORS = {
  simulated:          '#9B59B6',
  gdelt:              'var(--signal-gdelt)',
  'open-meteo':       'var(--signal-weather)',
  weather:            'var(--signal-weather)',
  'ais-mock':         'var(--signal-ais)',
  ais:                'var(--signal-ais)',
  'port-mock':        'var(--signal-congestion)',
  'port-congestion':  'var(--signal-congestion)',
};

const SOURCE_LABELS = {
  simulated:         '⚡ Simulated',
  gdelt:             '📰 News/GDELT',
  'open-meteo':      '🌊 Weather',
  weather:           '🌊 Weather',
  'ais-mock':        '🛳 AIS',
  ais:               '🛳 AIS',
  'port-mock':       '⚓ Port',
  'port-congestion': '⚓ Port',
};

export default function IngestionCard({ data }) {
  if (!data) return null;

  const { items_received = 0, source_counts = {}, source, title, port, type } = data;

  return (
    <div>
      {/* Live item ticker */}
      {title && (
        <div
          style={{
            padding: '8px 10px',
            background: 'var(--bg-elevated)',
            borderRadius: '6px',
            marginBottom: '10px',
            border: '1px solid var(--border)',
            animation: 'row-enter 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {source && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: SOURCE_COLORS[source] || '#888',
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}
              >
                {SOURCE_LABELS[source] || source}
              </span>
            )}
            {type && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  background: 'rgba(176,32,32,0.15)',
                  color: 'var(--status-critical)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}
              >
                {type}
              </span>
            )}
            {port && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                📍 {port}
              </span>
            )}
          </div>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {title}
          </p>
        </div>
      )}

      {/* Source count summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {Object.entries(source_counts).map(([src, count]) => (
          <div
            key={src}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'var(--bg-elevated)',
              border: `1px solid ${SOURCE_COLORS[src] || '#888'}33`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: SOURCE_COLORS[src] || '#888',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {SOURCE_LABELS[src] || src}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {count}
            </span>
          </div>
        ))}
        {items_received > 0 && (
          <div
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {items_received} message{items_received !== 1 ? 's' : ''} received
          </div>
        )}
      </div>
    </div>
  );
}

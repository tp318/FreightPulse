/** Disruption detected card — alert display with type/severity badges */
const SEVERITY_COLORS = {
  high:   { bg: 'rgba(176,32,32,0.12)', border: 'rgba(176,32,32,0.4)', text: '#E05050' },
  medium: { bg: 'rgba(196,96,26,0.12)', border: 'rgba(196,96,26,0.4)', text: '#E07830' },
  low:    { bg: 'rgba(184,138,26,0.12)',border: 'rgba(184,138,26,0.4)', text: '#D4A030' },
};

const TYPE_ICONS = {
  strike:     '🪧',
  attack:     '💥',
  congestion: '⚓',
  weather:    '🌊',
  closure:    '🔒',
};

function formatDT(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function DisruptionCard({ data }) {
  if (!data) return null;

  const sev = SEVERITY_COLORS[data.severity] || SEVERITY_COLORS.medium;
  const icon = TYPE_ICONS[data.type] || '⚠️';

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        animation: 'alert-flash 2s ease-in-out 3, stage-enter 0.3s ease',
      }}
    >
      {/* Type + severity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '22px' }}>{icon}</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '2px 8px',
            borderRadius: '4px',
            background: sev.bg,
            color: sev.text,
            border: `1px solid ${sev.border}`,
          }}
        >
          {data.type?.toUpperCase() || 'UNKNOWN'}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '2px 8px',
            borderRadius: '4px',
            background: sev.bg,
            color: sev.text,
            border: `1px solid ${sev.border}`,
          }}
        >
          {data.severity?.toUpperCase() || '?'} SEVERITY
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {formatDT(data.detected_at)}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          margin: '0 0 8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {data.description}
      </p>

      {/* Location */}
      {data.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px' }}>📍</span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
            }}
          >
            {data.location.name}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [{data.location.port_code}] {data.location.lat?.toFixed(2)}°N {data.location.lon?.toFixed(2)}°E
          </span>
        </div>
      )}

      {/* Disruption ID */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
        }}
      >
        ID: {data.disruption_id}
      </div>
    </div>
  );
}

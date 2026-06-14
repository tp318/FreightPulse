// frontend/src/components/FleetSummary.jsx
// Always-visible key metrics panel — derived from live shipments + alerts data

export default function FleetSummary({ shipments = [], alerts = [], signals = [] }) {
  const total = shipments.length;
  let critical = 0;
  let high = 0;
  let totalExposure = 0;
  let highestScore = 0;
  let highestShipment = null;

  // Derive alert mapping for quick lookup
  const alertMap = {};
  alerts.forEach(a => {
    a.affectedShipmentIds?.forEach(id => {
      alertMap[id] = a.severity;
    });
  });

  shipments.forEach(s => {
    const score = s.riskScore || 0;
    if (score > highestScore) {
      highestScore = score;
      highestShipment = s;
    }

    const alertSev = alertMap[s.id] || s.alertSeverity;
    const isCritical = alertSev === 'critical' || score >= 80;
    const isHigh = alertSev === 'high' || score >= 60;

    if (isCritical) {
      critical++;
      totalExposure += (s.cargoValue || 0);
    } else if (isHigh) {
      high++;
      totalExposure += (s.cargoValue || 0);
    }
  });

  const atRisk = critical + high;
  const monitoring = total - atRisk;

  const formatCurrency = (val) => {
    if (!val) return '—';
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
  };

  const highestAlert = alerts.find(a => (a.score || 0) === Math.max(...alerts.map(al => al.score || 0)));

  const liveSignals  = signals.length;
  const simSignals   = signals.filter((s) => s.simulated).length;

  const metrics = [
    {
      label: 'Total Shipments',
      value: total || '—',
      sub: total ? `${monitoring} monitoring` : 'Upload CSV to begin',
      color: 'var(--text-primary)',
      icon: '📦',
    },
    {
      label: 'At Risk',
      value: atRisk || (total ? '0' : '—'),
      sub: critical ? `${critical} critical${high ? `, ${high} high` : ''}` : high ? `${high} high` : 'No active alerts',
      color: critical ? '#ef4444' : high ? '#f97316' : '#22c55e',
      icon: critical ? '🚨' : high ? '⚠️' : '✅',
    },
    {
      label: 'Highest Risk Score',
      value: highestScore ? `${highestScore}/100` : '—',
      sub: highestShipment ? `${highestShipment.id}` : 'No shipments',
      color: highestScore >= 80 ? '#ef4444' : highestScore >= 60 ? '#f97316' : '#eab308',
      icon: '📊',
    },
    {
      label: 'Value at Risk',
      value: formatCurrency(totalExposure),
      sub: 'Across exposed cargo',
      color: totalExposure > 5000000 ? '#ef4444' : totalExposure > 0 ? '#f97316' : 'var(--text-secondary)',
      icon: '💸',
    },
    {
      label: 'Live Signals',
      value: liveSignals || '0',
      sub: simSignals ? `${simSignals} simulated` : 'All live',
      color: 'var(--accent-green, #22c55e)',
      icon: '📡',
    },
  ];

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px 12px',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          display: 'block',
          marginBottom: '10px',
        }}
      >
        Fleet Overview
      </span>

      {/* Metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
        }}
      >
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              background: 'var(--bg-elevated, #1a2332)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {m.label}
              </span>
              <span style={{ fontSize: '13px' }}>{m.icon}</span>
            </div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: m.color,
                fontFamily: 'var(--font-mono, monospace)',
                lineHeight: 1.1,
              }}
            >
              {m.value}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              {m.sub}
            </span>
          </div>
        ))}

        {/* Decision recommendation — full width */}
        {highestAlert && (
          <div
            style={{
              gridColumn: '1 / -1',
              background: 'var(--bg-elevated, #1a2332)',
              border: `1px solid ${highestAlert.severity === 'critical' ? '#ef444440' : '#f9731640'}`,
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>
                Recommended Action
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: highestAlert.severity === 'critical' ? '#ef4444' : '#f97316',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {(highestAlert.decision || 'monitor').replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>
                Delay est.
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {highestAlert.delay_estimate || highestAlert.delayEstimate || '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

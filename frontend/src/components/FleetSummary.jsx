// frontend/src/components/FleetSummary.jsx
// Always-visible key metrics panel — derived from live shipments + alerts data

export default function FleetSummary({ shipments = [], alerts = [], signals = [] }) {
  // Derived metrics
  const total        = shipments.length;
  const critical     = alerts.filter((a) => a.severity === 'critical').length;
  const high         = alerts.filter((a) => a.severity === 'high').length;
  const atRisk       = critical + high;
  const monitoring   = total - atRisk;

  const highestScore = alerts.length
    ? Math.max(...alerts.map((a) => a.score ?? 0))
    : 0;

  const highestAlert = alerts.find((a) => (a.score ?? 0) === highestScore);

  const totalExposure = alerts.reduce((sum, a) => {
    const raw = a.cost_impact || a.costImpact || '';
    const nums = raw.replace(/[$,]/g, '').split('–').map(Number).filter(Boolean);
    return sum + (nums[1] || nums[0] || 0);
  }, 0);

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
      sub: highestAlert ? `${highestAlert.shipment_id || 'Unknown'}` : 'No alerts yet',
      color: highestScore >= 80 ? '#ef4444' : highestScore >= 60 ? '#f97316' : '#eab308',
      icon: '📊',
    },
    {
      label: 'Max Cost Exposure',
      value: totalExposure ? `$${(totalExposure / 1000).toFixed(0)}k` : '—',
      sub: 'Across all alerts',
      color: totalExposure > 50000 ? '#ef4444' : totalExposure > 10000 ? '#f97316' : 'var(--text-secondary)',
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

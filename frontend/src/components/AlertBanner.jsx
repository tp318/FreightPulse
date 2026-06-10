/** AlertBanner — Full-width disruption alert banner shown for high/critical severity events */
import { formatINR } from '../api/client.js';

export default function AlertBanner({ alert, onGenerateBrief, briefLoading = false }) {
  if (!alert) return null;
  if (alert.severity !== 'critical' && alert.severity !== 'high') return null;

  const isCritical = alert.severity === 'critical';

  const bgColor = isCritical
    ? 'rgba(176, 32, 32, 0.15)'
    : 'rgba(196, 96, 26, 0.15)';
  const borderColor = isCritical
    ? 'var(--status-critical)'
    : 'var(--status-high)';
  const severityLabel = isCritical ? '🚨 CRITICAL' : '⚠️ HIGH';

  const stats = [
    { label: 'Affected', value: `${alert.affectedCount || 0} shipment(s)` },
    { label: 'Delay est.', value: `+${alert.estimatedDelayDays || 0} days` },
    { label: 'Cost impact', value: formatINR(alert.estimatedCostImpact) },
    { label: 'Act within', value: `${alert.actWithinHours || 0} hrs` },
  ];

  return (
    <div
      className="w-full px-6 py-4"
      style={{
        background: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        animation: 'slideDown 0.35s ease-out',
      }}
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        {/* Left: Severity + Title + Description */}
        <div className="flex flex-col gap-1" style={{ flex: '1 1 300px', minWidth: '200px' }}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                background: borderColor,
                color: '#fff',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {severityLabel}
            </span>
          </div>
          <h3
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)', marginTop: '4px' }}
          >
            {alert.disruptionTitle}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {alert.description}
          </p>
        </div>

        {/* Middle: Stat chips */}
        <div
          className="flex flex-wrap gap-2"
          style={{ flex: '0 1 auto' }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col px-3 py-2 rounded"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                minWidth: '100px',
              }}
            >
              <span
                className="text-xs"
                style={{ color: 'var(--text-tertiary)', marginBottom: '2px' }}
              >
                {s.label}
              </span>
              <span
                className="text-sm font-medium font-mono"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Right: Generate Brief button */}
        <div className="flex items-center" style={{ flex: '0 0 auto' }}>
          <button
            onClick={onGenerateBrief}
            disabled={briefLoading}
            className="text-sm font-medium px-4 py-2 rounded flex items-center gap-2"
            style={{
              background: briefLoading ? 'var(--accent-green-dim)' : 'var(--accent-green)',
              color: '#fff',
              border: 'none',
              cursor: briefLoading ? 'not-allowed' : 'pointer',
              opacity: briefLoading ? 0.7 : 1,
              transition: 'opacity 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {briefLoading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Generating…
              </>
            ) : (
              '📋 Generate Forwarder Brief'
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

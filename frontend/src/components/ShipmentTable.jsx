/** ShipmentTable — Data table displaying shipments with risk scores, routes, and status badges */
import { useMemo } from 'react';
import RiskScoreBadge from './RiskScoreBadge.jsx';
import { formatINR } from '../api/client.js';

const STATUS_CONFIG = {
  critical: { label: 'Critical', color: 'var(--status-critical)', pulse: true },
  high:     { label: 'High',     color: 'var(--status-high)',     pulse: false },
  watch:    { label: 'Watch',    color: 'var(--status-watch)',    pulse: false },
  null:     { label: 'Monitoring', color: 'var(--status-monitor)', pulse: false },
  undefined:{ label: 'Monitoring', color: 'var(--status-monitor)', pulse: false },
};

function formatETA(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ShipmentTable({ shipments = [], alerts = [] }) {
  const affectedIds = useMemo(() => {
    const ids = new Set();
    alerts.forEach((a) => {
      a.affectedShipmentIds?.forEach((id) => ids.add(id));
    });
    return ids;
  }, [alerts]);

  const alertSeverityMap = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      a.affectedShipmentIds?.forEach((id) => {
        map[id] = a.severity;
      });
    });
    return map;
  }, [alerts]);

  const sorted = useMemo(() => {
    return [...shipments].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
  }, [shipments]);

  if (!shipments || shipments.length === 0) {
    return (
      <div
        className="flex items-center justify-center w-full"
        style={{
          minHeight: '240px',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
        }}
      >
        No shipments loaded — upload a CSV to begin
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-auto"
      style={{
        background: 'var(--bg-surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}
    >
      <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '700px' }}>
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              background: 'var(--bg-surface)',
              zIndex: 2,
            }}
          >
            {['ID', 'Route', 'Vessel', 'ETA', 'Cargo Value', 'Risk', 'Status'].map((col) => (
              <th
                key={col}
                className="text-left text-xs font-medium px-4 py-3"
                style={{
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const status = STATUS_CONFIG[s.alertSeverity] || STATUS_CONFIG['null'];
            const isAffected = affectedIds.has(s.id);
            const affectedSeverity = alertSeverityMap[s.id];
            const borderColor = affectedSeverity
              ? (STATUS_CONFIG[affectedSeverity]?.color || 'transparent')
              : 'transparent';

            return (
              <tr
                key={s.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  borderLeft: isAffected ? `3px solid ${borderColor}` : '3px solid transparent',
                  transition: 'background 0.15s ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td
                  className="px-4 py-3 text-sm font-mono"
                  style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
                >
                  {s.id}
                </td>
                <td
                  className="px-4 py-3 text-sm"
                  style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
                >
                  {s.origin}{' '}
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>→</span>{' '}
                  {s.destination}
                </td>
                <td
                  className="px-4 py-3 text-sm font-mono"
                  style={{ color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap' }}
                >
                  {s.vessel}
                </td>
                <td
                  className="px-4 py-3 text-sm font-mono"
                  style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
                >
                  {formatETA(s.eta)}
                </td>
                <td
                  className="px-4 py-3 text-sm font-mono"
                  style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
                >
                  {formatINR(s.cargoValue)}
                </td>
                <td className="px-4 py-2">
                  <RiskScoreBadge score={s.riskScore || 0} size={44} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      color: '#fff',
                      background: status.color,
                      whiteSpace: 'nowrap',
                      animation: status.pulse ? 'pulse-critical 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

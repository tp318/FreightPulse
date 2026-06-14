/** Scoring & Ranking card — risk score table with expandable factor breakdown */
import { useState } from 'react';

const PRIORITY_COLORS = {
  critical: 'var(--status-critical)',
  high:     'var(--status-high)',
  medium:   'var(--status-watch)',
  low:      'var(--text-tertiary)',
};

function ScoreBar({ value, max = 100, color = 'var(--accent-green)' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
    </div>
  );
}

function FactorRow({ label, contribution, weight, raw }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', width: '120px', flexShrink: 0 }}>
        {label}
      </span>
      <ScoreBar value={contribution} max={25} color="var(--accent-green)" />
      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', width: '40px', textAlign: 'right' }}>
        +{contribution}
      </span>
    </div>
  );
}

const FACTOR_LABELS = {
  priority:           'Priority Weight',
  value:              'Cargo Value',
  delay:              'Predicted Delay',
  escalation:         'Escalation Risk',
  deadline_proximity: 'Deadline Proximity',
};

export default function ScoringCard({ data }) {
  const [expanded, setExpanded] = useState(null);
  if (!data) return null;

  const { ranked_shipments = [] } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {ranked_shipments.map((ship, i) => {
        const score = ship.risk_score || 0;
        const isTop = i === 0;
        const scoreColor = score > 70 ? 'var(--status-critical)' : score > 45 ? 'var(--status-watch)' : 'var(--accent-green)';
        const isExpanded = expanded === ship.shipment_id;

        return (
          <div
            key={ship.shipment_id || i}
            style={{
              borderRadius: '7px',
              background: isTop ? 'rgba(29,158,117,0.06)' : 'var(--bg-elevated)',
              border: isTop ? '1px solid rgba(29,158,117,0.3)' : '1px solid var(--border)',
              overflow: 'hidden',
              animation: `row-enter 0.25s ${i * 0.08}s ease both`,
            }}
          >
            {/* Main row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                cursor: 'pointer',
              }}
              onClick={() => setExpanded(isExpanded ? null : ship.shipment_id)}
            >
              {/* Rank */}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  width: '20px',
                  flexShrink: 0,
                  color: isTop ? 'var(--accent-green)' : 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                #{i + 1}
              </span>

              {/* Shipment ID */}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  width: '70px',
                  flexShrink: 0,
                }}
              >
                {ship.shipment_id}
              </span>

              {/* Priority badge */}
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  color: PRIORITY_COLORS[ship.priority] || 'var(--text-tertiary)',
                  background: `${PRIORITY_COLORS[ship.priority] || '#888'}22`,
                  border: `1px solid ${PRIORITY_COLORS[ship.priority] || '#888'}44`,
                  flexShrink: 0,
                }}
              >
                {ship.priority}
              </span>

              {/* Score bar */}
              <ScoreBar value={score} max={100} color={scoreColor} />

              {/* Score */}
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: scoreColor,
                  fontFamily: 'var(--font-mono)',
                  width: '36px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {score}
              </span>

              {/* Expand chevron */}
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>

            {/* Expanded factor breakdown */}
            {isExpanded && ship.score_breakdown && (
              <div
                style={{
                  padding: '8px 12px 10px 50px',
                  borderTop: '1px solid var(--border)',
                  animation: 'stage-enter 0.2s ease',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '6px',
                  }}
                >
                  Score Breakdown
                </div>
                {Object.entries(ship.score_breakdown).map(([key, factor]) => (
                  <FactorRow
                    key={key}
                    label={FACTOR_LABELS[key] || key}
                    contribution={factor.contribution}
                    weight={factor.weight}
                    raw={factor.raw}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** ML Prediction card — table of predictions per shipment, clearly labeled MOCK */
function ConfidenceBar({ value, color = 'var(--accent-green)' }) {
  return (
    <div
      style={{
        height: '4px',
        borderRadius: '2px',
        background: 'var(--bg-base)',
        overflow: 'hidden',
        marginTop: '2px',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.round(value * 100)}%`,
          background: color,
          borderRadius: '2px',
          transition: 'width 0.8s ease',
        }}
      />
    </div>
  );
}

export default function MLPredictionCard({ data }) {
  if (!data) return null;

  const { predictions = [], model, note } = data;

  return (
    <div>
      {/* Mock model badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '20px',
          background: 'rgba(184,138,26,0.12)',
          border: '1px solid rgba(184,138,26,0.35)',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontSize: '11px' }}>🧪</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--status-watch)',
          }}
        >
          MOCK MODEL
        </span>
      </div>

      {/* Predictions table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {predictions.map((pred, i) => (
          <div
            key={pred.shipment_id || i}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              animation: `row-enter 0.25s ${i * 0.08}s ease both`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                }}
              >
                {pred.shipment_id}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: pred.predicted_delay_hours > 48 ? 'var(--status-critical)' : 'var(--status-watch)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                +{pred.predicted_delay_hours}h
              </span>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Confidence */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '2px',
                  }}
                >
                  Confidence
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--accent-green)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {Math.round(pred.confidence * 100)}%
                </div>
                <ConfidenceBar value={pred.confidence} color="var(--accent-green)" />
              </div>

              {/* Escalation */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '2px',
                  }}
                >
                  Escalation Risk
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: pred.escalation_probability > 0.7 ? 'var(--status-critical)' : 'var(--status-watch)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {Math.round(pred.escalation_probability * 100)}%
                </div>
                <ConfidenceBar
                  value={pred.escalation_probability}
                  color={pred.escalation_probability > 0.7 ? 'var(--status-critical)' : 'var(--status-watch)'}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {note && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '9px',
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

/** Storage card — confirmation ticks for Neo4j + TimescaleDB writes */
export default function StorageCard({ data }) {
  const rows = [
    {
      id: 'neo4j',
      icon: '🕸',
      label: 'Neo4j Graph DB',
      sublabel: 'Disruption event + relationship written',
      status: data?.neo4j,
      color: '#4CAF50',
    },
    {
      id: 'timescaledb',
      icon: '📈',
      label: 'TimescaleDB',
      sublabel: 'AIS / weather / congestion time-series logged',
      status: data?.timescaledb,
      color: '#2196F3',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.map((row, i) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            background: 'var(--bg-elevated)',
            border: `1px solid ${row.color}33`,
            animation: `row-enter 0.25s ${i * 0.1}s ease both`,
          }}
        >
          <span style={{ fontSize: '18px' }}>{row.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {row.label}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
              {row.sublabel}
            </div>
          </div>
          {row.status ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px' }}>✅</span>
              <span
                style={{
                  fontSize: '10px',
                  color: row.color,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                {row.status === 'written' ? 'WRITTEN' : row.status.toUpperCase()}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              —
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

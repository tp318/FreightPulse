/**
 * GraphQueryCard — SVG force-directed mini-graph showing the Neo4j traversal.
 * Nodes: Port (red if disrupted) → Route → Vessel → Shipment
 * Pure React SVG, no external deps.
 */

const NODE_COLORS = {
  Port:      '#E05050',
  Route:     '#3A7ED4',
  Vessel:    '#7A5DD4',
  Shipment:  '#1D9E75',
};

const NODE_ICONS = {
  Port:     '⚓',
  Route:    '🗺',
  Vessel:   '🚢',
  Shipment: '📦',
};

function buildGraphNodes(affectedShipments = [], disruptionPort = {}) {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  // Always add the disrupted port node
  const portCode = disruptionPort?.port_code || 'NLRTM';
  const portName = disruptionPort?.name || portCode;
  nodes.push({ id: portCode, label: portName, type: 'Port', x: 100, y: 80 });
  seen.add(portCode);

  affectedShipments.slice(0, 3).forEach((ship, idx) => {
    const routeId  = ship.route_id   || `RT-${idx}`;
    const vesselId = ship.vessel_imo  || ship.vessel_name || `V-${idx}`;
    const shipId   = ship.shipment_id || `SHP-${idx}`;

    const yOffset = 80 + idx * 90;

    if (!seen.has(routeId)) {
      nodes.push({ id: routeId, label: ship.route_name?.split('→')[0]?.trim() || 'Route', type: 'Route', x: 240, y: yOffset });
      seen.add(routeId);
      edges.push({ from: portCode, to: routeId });
    }

    if (!seen.has(vesselId)) {
      nodes.push({ id: vesselId, label: ship.vessel_name || vesselId, type: 'Vessel', x: 380, y: yOffset });
      seen.add(vesselId);
      edges.push({ from: routeId, to: vesselId });
    }

    if (!seen.has(shipId)) {
      nodes.push({ id: shipId, label: shipId, type: 'Shipment', x: 520, y: yOffset });
      seen.add(shipId);
      edges.push({ from: vesselId, to: shipId });
    }
  });

  return { nodes, edges };
}

export default function GraphQueryCard({ data }) {
  if (!data) return null;

  const { affected_shipments = [], disruption_port = {} } = data;
  const { nodes, edges } = buildGraphNodes(affected_shipments, disruption_port);

  const W = 600, H = Math.max(160, 80 + affected_shipments.length * 90);

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div>
      {/* Cypher query display */}
      {data.query && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-base)',
            padding: '6px 10px',
            borderRadius: '4px',
            marginBottom: '10px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {data.query}
        </div>
      )}

      {/* SVG Graph */}
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ display: 'block', fontFamily: 'var(--font-sans)' }}>
          {/* Edge lines */}
          {edges.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to   = nodeMap[edge.to];
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                stroke="var(--border-accent)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
              <circle
                r={22}
                fill={`${NODE_COLORS[node.type]}22`}
                stroke={NODE_COLORS[node.type]}
                strokeWidth={1.5}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={16}
                y={0}
              >
                {NODE_ICONS[node.type]}
              </text>
              {/* Node type label (above) */}
              <text
                textAnchor="middle"
                y={-30}
                fontSize={8}
                fill={NODE_COLORS[node.type]}
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing="0.1em"
              >
                {node.type}
              </text>
              {/* Node ID label (below) */}
              <text
                textAnchor="middle"
                y={32}
                fontSize={9}
                fill="var(--text-tertiary)"
              >
                {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Summary */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
        }}
      >
        {affected_shipments.length} shipment{affected_shipments.length !== 1 ? 's' : ''} affected via {disruption_port?.name || 'disrupted port'}
      </div>
    </div>
  );
}

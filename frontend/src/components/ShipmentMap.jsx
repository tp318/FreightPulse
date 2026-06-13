// frontend/src/components/ShipmentMap.jsx
// Real interactive world map using Leaflet + OpenStreetMap (no API key needed)

import { useEffect, useRef, useMemo } from 'react';

// Port coordinates (lat, lng)
const PORT_COORDS = {
  // India
  'mundra':         [22.84, 69.70],
  'jnpt':           [18.95, 72.95],
  'nhava sheva':    [18.95, 72.95],
  'chennai':        [13.08, 80.27],
  'kolkata':        [22.57, 88.36],
  'mumbai':         [18.93, 72.83],
  'kochi':          [9.93,  76.26],
  'visakhapatnam':  [17.68, 83.28],
  'mangalore':      [12.87, 74.88],
  'tuticorin':      [8.76,  78.13],
  'paradip':        [20.32, 86.61],
  'kandla':         [23.03, 70.22],
  // Europe
  'rotterdam':      [51.90, 4.48],
  'hamburg':        [53.55, 9.97],
  'antwerp':        [51.23, 4.40],
  'felixstowe':     [51.96, 1.35],
  'amsterdam':      [52.37, 4.90],
  'le havre':       [49.49, 0.11],
  'bremen':         [53.08, 8.80],
  // Middle East
  'dubai':          [25.20, 55.27],
  'jebel ali':      [24.99, 55.06],
  'doha':           [25.28, 51.53],
  'muscat':         [23.61, 58.59],
  // Southeast Asia
  'singapore':      [1.29,  103.85],
  'port klang':     [3.00,  101.39],
  'jakarta':        [-6.12, 106.84],
  'bangkok':        [13.76, 100.50],
  'colombo':        [6.93,  79.85],
  // East Asia
  'shanghai':       [31.23, 121.47],
  'hong kong':      [22.30, 114.17],
  'busan':          [35.10, 129.04],
  'tokyo':          [35.65, 139.75],
  // Americas
  'new york':       [40.71, -74.01],
  'los angeles':    [33.73, -118.26],
  'houston':        [29.76, -95.37],
  // Africa
  'durban':         [-29.87, 31.03],
  'cape town':      [-33.92, 18.42],
  // Default
  'default':        [20.00, 77.00],
};

function getCoords(portName) {
  if (!portName) return PORT_COORDS['default'];
  const key = portName.toLowerCase().trim();
  if (PORT_COORDS[key]) return PORT_COORDS[key];
  for (const k of Object.keys(PORT_COORDS)) {
    if (key.includes(k) || k.includes(key)) return PORT_COORDS[k];
  }
  return PORT_COORDS['default'];
}

function getSeverityColor(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical': return '#ef4444';
    case 'high':     return '#f97316';
    case 'watch':    return '#eab308';
    default:         return '#22c55e';
  }
}

export default function ShipmentMap({ shipments = [], alerts = [] }) {
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const layersRef = useRef([]);

  const severityMap = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      (a.affectedShipmentIds || []).forEach((id) => {
        map[id] = a.severity;
      });
    });
    return map;
  }, [alerts]);

  // Init map once
  useEffect(() => {
    if (mapObj.current) return;

    import('leaflet').then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center:             [20, 60],
        zoom:               3,
        zoomControl:        true,
        scrollWheelZoom:    true,
        attributionControl: false,
      });

      // CartoDB dark matter tiles — free, no API key
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 10 }
      ).addTo(map);

      mapObj.current = map;
    });

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, []);

  // Draw routes whenever shipments or alerts change
  useEffect(() => {
    if (!mapObj.current) return;

    import('leaflet').then((L) => {
      layersRef.current.forEach((layer) => layer.remove());
      layersRef.current = [];

      shipments.forEach((s) => {
        const originCoords = getCoords(s.origin);
        const destCoords   = getCoords(s.destination);
        const severity     = severityMap[s.id] || s.alertSeverity || 'monitoring';
        const color        = getSeverityColor(severity);

        // Origin pin — green
        const originMarker = L.circleMarker(originCoords, {
          radius: 7, fillColor: '#22c55e', color: '#16a34a',
          weight: 2, opacity: 1, fillOpacity: 0.9,
        }).bindTooltip(`📍 ${s.origin} (Origin) — ${s.vessel || s.id}`, {
          direction: 'top', className: 'leaflet-dark-tooltip',
        });

        // Destination pin — severity color
        const destMarker = L.circleMarker(destCoords, {
          radius: 7, fillColor: color, color,
          weight: 2, opacity: 1, fillOpacity: 0.9,
        }).bindTooltip(
          `🎯 ${s.destination} — ETA: ${s.eta || '—'} | ${severity.toUpperCase()}`,
          { direction: 'top', className: 'leaflet-dark-tooltip' }
        );

        // Route line
        const routeLine = L.polyline([originCoords, destCoords], {
          color, weight: 1.5, opacity: 0.6, dashArray: '6 5',
        });

        originMarker.addTo(mapObj.current);
        destMarker.addTo(mapObj.current);
        routeLine.addTo(mapObj.current);
        layersRef.current.push(originMarker, destMarker, routeLine);
      });

      // Fit bounds to all markers
      if (shipments.length > 0) {
        const allCoords = shipments.flatMap((s) => [
          getCoords(s.origin),
          getCoords(s.destination),
        ]);
        mapObj.current.fitBounds(allCoords, { padding: [30, 30] });
      }
    });
  }, [shipments, severityMap]);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 16px 8px',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Shipment Routes
        </span>
        <div className="flex items-center gap-3" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Origin
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> At risk
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Safe
          </span>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '280px', borderRadius: '6px', overflow: 'hidden', background: '#0d1f35' }}
      />

      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Dark tooltip style */}
      <style>{`
        .leaflet-dark-tooltip {
          background: #1e293b;
          border: 1px solid #334155;
          color: #e2e8f0;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .leaflet-dark-tooltip::before { border-top-color: #334155; }
      `}</style>
    </div>
  );
}

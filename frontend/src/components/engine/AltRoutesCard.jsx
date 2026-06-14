/** Alternative Routes card — list of route alternatives with a mini Leaflet map */
import { useEffect, useRef } from 'react';

const ROUTE_COLORS = ['#1D9E75', '#3A7ED4', '#7A5DD4'];

// Port code → lat/lon
const PORT_COORDS = {
  INMUN: [22.84, 69.70],
  INJNP: [18.95, 72.95],
  INMAA: [13.08, 80.27],
  NLRTM: [51.90,  4.48],
  DEHAM: [53.55,  9.97],
  GBFXT: [51.96,  1.35],
  BEANR: [51.23,  4.40],
  SGSIN: [ 1.29, 103.85],
  AEDXB: [25.20, 55.27],
};

function getCoords(port) {
  if (!port) return null;
  if (port.lat !== undefined) return [port.lat, port.lon];
  return PORT_COORDS[port.code] || PORT_COORDS[port] || null;
}

export default function AltRoutesCard({ data }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);

  const alternatives = data?.alternatives || [];

  useEffect(() => {
    if (!alternatives.length || !mapRef.current) return;
    if (mapObj.current) return;

    import('leaflet').then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(mapRef.current, {
        center: [30, 60],
        zoom: 2,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 10,
      }).addTo(map);

      const allCoords = [];
      alternatives.forEach((alt, idx) => {
        const ports = alt.ports || [];
        const color = ROUTE_COLORS[idx] || ROUTE_COLORS[0];
        const coords = ports.map(getCoords).filter(Boolean);
        allCoords.push(...coords);

        if (coords.length < 2) return;

        // Draw route
        L.polyline(coords, {
          color,
          weight: idx === 0 ? 2.5 : 1.5,
          opacity: idx === 0 ? 0.9 : 0.5,
          dashArray: idx === 0 ? null : '5 4',
        }).addTo(map);

        // Port markers
        coords.forEach((coord, i) => {
          L.circleMarker(coord, {
            radius: 5,
            fillColor: color,
            color,
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.9,
          })
            .bindTooltip(ports[i]?.name || '', {
              direction: 'top',
              className: 'leaflet-dark-tooltip',
            })
            .addTo(map);
        });
      });

      if (allCoords.length > 0) {
        map.fitBounds(allCoords, { padding: [20, 20] });
      }

      mapObj.current = map;
    });

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [alternatives.length]);

  return (
    <div>
      {/* Map */}
      {alternatives.length > 0 && (
        <>
          <div
            ref={mapRef}
            style={{
              width: '100%',
              height: '180px',
              borderRadius: '6px',
              overflow: 'hidden',
              background: '#0d1f35',
              marginBottom: '10px',
            }}
          />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>{`
            .leaflet-dark-tooltip {
              background: #1e293b; border: 1px solid #334155;
              color: #e2e8f0; font-size: 10px; padding: 3px 7px;
              border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            }
            .leaflet-dark-tooltip::before { border-top-color: #334155; }
          `}</style>
        </>
      )}

      {/* Route list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {alternatives.map((alt, i) => {
          const ports = alt.ports || [];
          const color = ROUTE_COLORS[i] || ROUTE_COLORS[0];
          const portNames = ports.map((p) => p.name || p.code || p).join(' → ');

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: '6px',
                background: i === 0 ? 'rgba(29,158,117,0.07)' : 'var(--bg-elevated)',
                border: i === 0 ? '1px solid rgba(29,158,117,0.3)' : '1px solid var(--border)',
                animation: `row-enter 0.25s ${i * 0.1}s ease both`,
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '3px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  {portNames || 'Alternative route'}
                </div>
                {alt.note && (
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{alt.note}</div>
                )}
              </div>
              {alt.est_extra_days !== undefined && (
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: i === 0 ? 'var(--accent-green)' : 'var(--text-tertiary)',
                    flexShrink: 0,
                  }}
                >
                  +{alt.est_extra_days}d
                </span>
              )}
            </div>
          );
        })}
      </div>

      {data?.top_shipment_id && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
          Routes calculated for {data.top_shipment_id} (highest risk)
        </div>
      )}
    </div>
  );
}

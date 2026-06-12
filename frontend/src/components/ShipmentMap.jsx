import { useEffect, useRef } from "react";

// Port coordinates for known Indian export ports and destination ports
const PORT_COORDS = {
  // Origin ports (India)
  mundra:      { lat: 22.8390, lng: 69.7082 },
  jnpt:        { lat: 18.9490, lng: 72.9510 },
  chennai:     { lat: 13.0827, lng: 80.2707 },
  nhava:       { lat: 18.9490, lng: 72.9510 },
  kolkata:     { lat: 22.5726, lng: 88.3639 },
  // Destination ports (Europe)
  rotterdam:   { lat: 51.9244, lng: 4.4777  },
  hamburg:     { lat: 53.5753, lng: 9.8689  },
  felixstowe:  { lat: 51.9600, lng: 1.3500  },
  antwerp:     { lat: 51.2213, lng: 4.4051  },
  // Asia
  singapore:   { lat: 1.3521,  lng: 103.8198},
  dubai:       { lat: 25.2048, lng: 55.2708 },
};

function resolvePort(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  for (const [port, coords] of Object.entries(PORT_COORDS)) {
    if (key.includes(port)) return coords;
  }
  return null;
}

function severityColor(severity) {
  if (!severity) return "#64748b";
  switch (severity.toLowerCase()) {
    case "critical": return "#ef4444";
    case "high":     return "#f97316";
    case "watch":    return "#eab308";
    default:         return "#22c55e";
  }
}

export default function ShipmentMap({ shipments = [], alerts = [] }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);

  useEffect(() => {
    // Leaflet injects styles dynamically — make sure the CSS link is present
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!window.L) {
      // Leaflet not yet on window — should be available via npm import in Vite
      // If using npm: import L from 'leaflet' at the top instead
      console.warn("Leaflet not found on window. Make sure it is imported.");
      return;
    }

    if (leafletRef.current) {
      leafletRef.current.remove();
      leafletRef.current = null;
    }

    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [25, 55],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    leafletRef.current = map;

    // Build a severity lookup by shipment ID from alerts
    const severityMap = {};
    alerts.forEach((a) => {
      (a.affectedShipmentIds || []).forEach((id) => {
        // Pick the worst severity if a shipment appears in multiple alerts
        const existing = severityMap[id];
        const rank = (s) => ({ critical: 3, high: 2, watch: 1 }[s?.toLowerCase()] ?? 0);
        if (!existing || rank(a.severity) > rank(existing)) {
          severityMap[id] = a.severity;
        }
      });
    });

    shipments.forEach((s) => {
      const origin = resolvePort(s.origin);
      const dest   = resolvePort(s.destination);
      const color  = severityColor(s.alertSeverity || severityMap[s.id]);

      if (origin) {
        const circle = L.circleMarker([origin.lat, origin.lng], {
          radius: 7,
          fillColor: color,
          color: "#fff",
          weight: 2,
          fillOpacity: 0.95,
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family:sans-serif;min-width:180px">
            <strong style="font-size:13px">${s.id}</strong><br/>
            <span style="color:#64748b;font-size:11px">${s.origin} → ${s.destination}</span><br/>
            <span style="font-size:11px">Vessel: <b>${s.vessel || "—"}</b></span><br/>
            <span style="font-size:11px">ETA: <b>${s.eta || "—"}</b></span><br/>
            <span style="font-size:11px">Risk Score: <b>${s.riskScore ?? "—"}</b></span>
          </div>
        `);
      }

      if (origin && dest) {
        // Draw a curved geodesic-ish line using a midpoint offset
        const midLat = (origin.lat + dest.lat) / 2 - 5;
        const midLng = (origin.lng + dest.lng) / 2;

        const latlngs = [
          [origin.lat, origin.lng],
          [midLat, midLng],
          [dest.lat, dest.lng],
        ];

        L.polyline(latlngs, {
          color,
          weight: 2,
          opacity: 0.6,
          dashArray: "6,4",
          smoothFactor: 2,
        }).addTo(map);

        // Destination marker (hollow)
        L.circleMarker([dest.lat, dest.lng], {
          radius: 5,
          fillColor: "#1e293b",
          color,
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(map)
          .bindPopup(`<strong style="font-size:12px">${s.destination}</strong><br/><span style="font-size:11px;color:#64748b">Destination port</span>`);
      }
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [shipments, alerts]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-slate-100 font-semibold text-sm">Live Fleet Map</span>
          <span className="text-xs text-slate-400">{shipments.length} shipment{shipments.length !== 1 ? "s" : ""} tracked</span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {[
            { label: "Critical", color: "#ef4444" },
            { label: "High",     color: "#f97316" },
            { label: "Watch",    color: "#eab308" },
            { label: "OK",       color: "#22c55e" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1">
              <span style={{ background: color }} className="inline-block w-2 h-2 rounded-full" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div ref={mapRef} style={{ height: "340px", width: "100%" }} />
    </div>
  );
}

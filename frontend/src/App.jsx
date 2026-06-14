/** App — Root layout component: topbar with Dashboard/Engine toggle, view routing */
import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { MOCK_DATA } from './api/mockData.js';
import {
  fetchAlerts,
  fetchSignals,
  fetchShipments,
  generateBrief,
  simulateEvent,
  formatRelativeTime,
} from './api/client.js';

import CSVUpload from './components/CSVUpload.jsx';
import ShipmentTable from './components/ShipmentTable.jsx';
import AlertBanner from './components/AlertBanner.jsx';
import ShipmentMap from './components/ShipmentMap.jsx';
import FleetSummary from './components/FleetSummary.jsx';
import BriefPanel from './components/BriefPanel.jsx';
import EnginePage from './pages/EnginePage.jsx';
import TutorialOverlay, { shouldShowTutorial, resetTutorial } from './components/TutorialOverlay.jsx';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'engine'
  const [shipments, setShipments] = useState([]);
  const [signals, setSignals] = useState(MOCK_DATA.signals);
  const [alerts, setAlerts] = useState(MOCK_DATA.alerts);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    // Always start the tutorial automatically on page load
    localStorage.removeItem('fp_tutorial_dismissed');
    localStorage.removeItem('fp_tutorial_v2_dismissed');
    localStorage.removeItem('fp_tutorial_v3_dismissed');
    return true;
  });
  const [promptSimulate, setPromptSimulate] = useState(false);

  // Polling for alerts and signals
  useEffect(() => {
    const poll = async () => {
      try {
        const [alertsData, signalsData] = await Promise.all([
          fetchAlerts(),
          fetchSignals(),
        ]);
        setAlerts(alertsData);
        setSignals(signalsData);
        setLastUpdated(new Date());
      } catch (e) {
        console.error('Polling error:', e);
      }
    };

    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, []);

  // CSV upload handler — preserve raw CSV data exactly as uploaded
  const handleUpload = useCallback((parsedShipments) => {
    const mapped = parsedShipments.map((row, idx) => {
      // Normalize common column name variants (case-insensitive)
      const get = (...keys) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== '') return row[k];
          // Try lowercase
          const lk = k.toLowerCase();
          for (const rk of Object.keys(row)) {
            if (rk.toLowerCase() === lk && row[rk] !== undefined && row[rk] !== '') return row[rk];
          }
        }
        return undefined;
      };

      const cargoRaw = get('cargoValue','CargoValue','cargo_value','Cargo Value','cargo value','value','Value');
      const riskRaw  = get('riskScore','RiskScore','risk_score','Risk Score','risk score','risk');

      const id = get('id','ID','shipmentId','ShipmentId') || `SHP-${String(idx + 1).padStart(3, '0')}`;
      const cargoValue = cargoRaw !== undefined ? Number(String(cargoRaw).replace(/[^0-9.-]/g,'')) || 0 : 0;
      
      let riskScore = riskRaw !== undefined && riskRaw !== '' ? Number(String(riskRaw).replace(/[^0-9.-]/g,'')) || 0 : 0;
      if (riskScore === 0) {
        // Generate a deterministic realistic mock risk score if none provided
        const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const baseRisk = 12 + (Math.abs(hash) % 35); // 12 to 46
        const valueFactor = Math.min(30, (cargoValue / 2000000) * 30); // scale up to 30 based on value
        riskScore = Math.round(baseRisk + valueFactor);
        if (Math.abs(hash) % 7 === 0) riskScore += 25; // elevated risk chance
        riskScore = Math.max(5, Math.min(94, riskScore)); // clamp 5-94
      }

      return {
        id,
        origin:         get('origin','Origin','from','From','port_origin','departure') || '',
        destination:    get('destination','Destination','to','To','port_dest','arrival') || '',
        vessel:         get('vessel','Vessel','vessel_name','VesselName','ship','Ship') || '',
        eta:            get('eta','ETA','Eta','arrival_date','ArrivalDate','expected_arrival') || '',
        cargoValue,
        forwarderName:  get('forwarderName','ForwarderName','forwarder_name','forwarder','Forwarder') || '',
        forwarderPhone: get('forwarderPhone','ForwarderPhone','forwarder_phone','phone','Phone') || '',
        alertSeverity:  get('alertSeverity','AlertSeverity','alert_severity','severity','Severity') || null,
        riskScore,
        // Preserve all original raw fields for extra columns
        _raw: row,
      };
    });
    setShipments(mapped);
  }, []);

  const handleChangeCSV = useCallback(() => {
    setShipments([]);
  }, []);


  // Brief generation handler
  const handleGenerateBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const result = await generateBrief(alerts[0]?.id);
      setBrief(result);
    } catch (e) {
      console.error('Brief generation error:', e);
    } finally {
      setBriefLoading(false);
    }
  }, [alerts]);

  // Simulate handler (dashboard) — now navigates to Engine
  const handleDashboardSimulateClick = useCallback(() => {
    setActiveView('engine');
    setPromptSimulate(true);
  }, []);

  // Derive active alert
  const activeAlert =
    alerts.find((a) => a.severity === 'critical' || a.severity === 'high') ?? null;

  const lastUpdatedText = lastUpdated
    ? formatRelativeTime(lastUpdated.toISOString())
    : 'connecting…';

  return (
    <div className="app-shell">
      {/* ─── TOPBAR ─── */}
      <header
        className="flex items-center justify-between px-6"
        style={{
          height: '52px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          zIndex: 100,
          position: 'relative',
        }}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              lineHeight: 1,
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Freight</span>
            <span style={{ color: 'var(--accent-green)' }}>Pulse</span>
          </h1>

          {/* Nav tabs */}
          <nav
            style={{
              display: 'flex',
              gap: '2px',
              marginLeft: '16px',
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '3px',
            }}
          >
            {[
              { id: 'dashboard', label: '⬛ Dashboard' },
              { id: 'engine',    label: '⚡ Engine' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveView(tab.id)}
                style={{
                  padding: '4px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activeView === tab.id ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  background: activeView === tab.id
                    ? 'var(--bg-elevated)'
                    : 'transparent',
                  color: activeView === tab.id
                    ? 'var(--text-primary)'
                    : 'var(--text-tertiary)',
                  transition: 'all 0.15s ease',
                  boxShadow: activeView === tab.id
                    ? '0 1px 4px rgba(0,0,0,0.3)'
                    : 'none',
                  borderBottom: activeView === tab.id
                    ? '2px solid var(--accent-green)'
                    : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Center: Live indicator */}
        <div className="flex items-center gap-2">
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--accent-green)',
              display: 'inline-block',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }}
          />
          <span
            className="text-xs font-medium"
            style={{
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: '10px',
            }}
          >
            LIVE
          </span>
          <span
            className="text-xs font-mono"
            style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              marginLeft: '4px',
            }}
          >
            Last polled: {lastUpdatedText}
          </span>
        </div>

        {/* Right: action buttons */}
        {activeView === 'dashboard' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleDashboardSimulateClick}
              className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-green)';
                e.currentTarget.style.color = 'var(--accent-green)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              ⚡ Simulate Live Event
            </button>
            <button
              onClick={() => { resetTutorial(); setShowTutorial(true); }}
              title="Open tutorial guide"
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-green)'; e.currentTarget.style.borderColor = 'var(--accent-green)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <span style={{ fontSize: '13px' }}>❓</span> Tour
            </button>
          </div>
        )}

        {activeView === 'engine' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => { resetTutorial(); setShowTutorial(true); }}
              title="Open tutorial"
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-green)'; e.currentTarget.style.borderColor = 'var(--accent-green)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <span style={{ fontSize: '13px' }}>❓</span> Tour
            </button>
          </div>
        )}
      </header>

      {/* ─── ALERT BANNER (dashboard only) ─── */}
      {activeView === 'dashboard' && activeAlert && (
        <AlertBanner
          alert={activeAlert}
          onGenerateBrief={handleGenerateBrief}
          briefLoading={briefLoading}
        />
      )}

      {/* ─── VIEWS ─── */}
      {activeView === 'dashboard' ? (
        <main className="main-grid">
          {/* LEFT COLUMN — Map + Fleet Summary */}
          <aside className="flex flex-col" style={{ overflow: 'hidden' }}>
            <ShipmentMap shipments={shipments} alerts={alerts} />
            <FleetSummary shipments={shipments} alerts={alerts} signals={signals} />
          </aside>

          {/* RIGHT COLUMN — CSV upload or shipment table + brief */}
          <section
            className="flex flex-col"
            style={{
              padding: '16px 24px',
              overflow: 'auto',
            }}
          >
            {shipments.length === 0 ? (
              <CSVUpload onUpload={handleUpload} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {shipments.length} shipments loaded
                  </span>
                  <button
                    onClick={handleChangeCSV}
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    ↑ Upload new CSV
                  </button>
                </div>
                <ShipmentTable shipments={shipments} alerts={alerts} />
              </>
            )}
            <BriefPanel brief={brief} onClose={() => setBrief(null)} />
          </section>
        </main>
      ) : (
        <EnginePage promptSimulate={promptSimulate} onPromptClear={() => setPromptSimulate(false)} />
      )}

      {/* Inline spinner keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ─── Tutorial Overlay ─── */}
      {showTutorial && (
        <TutorialOverlay
          onDismiss={() => setShowTutorial(false)}
          onNavigate={(view) => setActiveView(view)}
        />
      )}
    </div>
  );
}

export default App;

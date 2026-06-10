/** App — Root layout component: topbar, alert banner, two-column grid with all panels */
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
import SignalTimeline from './components/SignalTimeline.jsx';
import LiveFeedPanel from './components/LiveFeedPanel.jsx';
import BriefPanel from './components/BriefPanel.jsx';

function App() {
  const [shipments, setShipments] = useState([]);
  const [signals, setSignals] = useState(MOCK_DATA.signals);
  const [alerts, setAlerts] = useState(MOCK_DATA.alerts);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  // CSV upload handler
  const handleUpload = useCallback((parsedShipments) => {
    // Map CSV data to match expected shape with defaults from mock
    const mapped = parsedShipments.map((row, idx) => {
      const mockMatch = MOCK_DATA.shipments.find(
        (s) => s.id === row.id || s.id === row.ID
      );
      return {
        id: row.id || row.ID || `SHP-${String(idx + 1).padStart(3, '0')}`,
        origin: row.origin || row.Origin || '',
        destination: row.destination || row.Destination || '',
        vessel: row.vessel || row.Vessel || '',
        eta: row.eta || row.ETA || '',
        cargoValue: Number(row.cargoValue || row.CargoValue || row.cargo_value || 0),
        forwarderName: row.forwarderName || row.ForwarderName || '',
        forwarderPhone: row.forwarderPhone || row.ForwarderPhone || '',
        alertSeverity: mockMatch?.alertSeverity ?? (row.alertSeverity || null),
        riskScore: mockMatch?.riskScore ?? Number(row.riskScore || row.RiskScore || 0),
      };
    });
    setShipments(mapped);
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

  // Simulate handler
  const handleSimulate = useCallback(async () => {
    setSimulateLoading(true);
    try {
      const simResult = await simulateEvent();

      // Re-poll
      const [alertsData, signalsData, shipmentsData] = await Promise.all([
        fetchAlerts(),
        fetchSignals(),
        fetchShipments(),
      ]);

      setAlerts(alertsData);
      setSignals((prev) => {
        const newSignal = simResult?.signal || signalsData[0];
        if (newSignal) {
          return [newSignal, ...prev.filter((s) => s.id !== newSignal.id)];
        }
        return signalsData;
      });

      if (shipmentsData && shipmentsData.length > 0) {
        setShipments(shipmentsData);
      }

      setLastUpdated(new Date());
    } catch (e) {
      console.error('Simulate error:', e);
    } finally {
      setSimulateLoading(false);
    }
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

        {/* Right: Simulate button */}
        <button
          onClick={handleSimulate}
          disabled={simulateLoading}
          className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: simulateLoading ? 'var(--text-tertiary)' : 'var(--text-primary)',
            cursor: simulateLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {simulateLoading ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid var(--border-accent)',
                  borderTopColor: 'var(--text-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Simulating…
            </>
          ) : (
            <>⚡ Simulate Live Event</>
          )}
        </button>
      </header>

      {/* ─── ALERT BANNER ─── */}
      {activeAlert && (
        <AlertBanner
          alert={activeAlert}
          onGenerateBrief={handleGenerateBrief}
          briefLoading={briefLoading}
        />
      )}

      {/* ─── MAIN GRID ─── */}
      <main className="main-grid">
        {/* LEFT COLUMN */}
        <aside className="flex flex-col" style={{ overflow: 'hidden' }}>
          <LiveFeedPanel signals={signals} />
          <SignalTimeline events={MOCK_DATA.timeline} />
        </aside>

        {/* RIGHT COLUMN */}
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
            <ShipmentTable shipments={shipments} alerts={alerts} />
          )}
          <BriefPanel brief={brief} onClose={() => setBrief(null)} />
        </section>
      </main>

      {/* Inline spinner keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
